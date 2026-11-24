import { env } from "cloudflare:workers";
import { detectUploadedImage } from "./uploaded-image";

export const IMAGE_CHUNK = 512 * 1024;
type Meta = { size: number; parts: number; created: number };
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const validId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export async function chunkedImage(request: Request, prefix: string, maxSize: number, privateFile = false) {
  const url = new URL(request.url), action = url.searchParams.get("action");
  const id = url.searchParams.get("uploadId") || "";
  const temp = `image-upload-temp/${prefix.replace(/[^a-z-]/g, "")}/${id}`;
  if (action === "init") {
    const body = await request.json() as { size?: number };
    const size = Number(body.size);
    if (!Number.isInteger(size) || size < 16 || size > maxSize) return bad(`Ukuran gambar maksimal ${Math.floor(maxSize / 1048576)} MB.`);
    const uploadId = crypto.randomUUID();
    const meta: Meta = { size, parts: Math.ceil(size / IMAGE_CHUNK), created: Date.now() };
    await env.BUCKET.put(`image-upload-temp/${prefix}/${uploadId}/meta`, JSON.stringify(meta));
    return Response.json({ uploadId, chunkSize: IMAGE_CHUNK });
  }
  if (!validId(id)) return bad("Sesi upload tidak valid.");
  const object = await env.BUCKET.get(`${temp}/meta`);
  if (!object) return bad("Sesi upload tidak ditemukan. Coba lagi.", 404);
  const meta = await object.json<Meta>();
  if (Date.now() - meta.created > 30 * 60_000 || meta.size > maxSize) return bad("Sesi upload kedaluwarsa. Coba lagi.", 410);
  if (action === "chunk") {
    const index = Number(url.searchParams.get("index"));
    if (!Number.isInteger(index) || index < 0 || index >= meta.parts) return bad("Bagian file tidak valid.");
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== Math.min(IMAGE_CHUNK, meta.size - index * IMAGE_CHUNK)) return bad("Bagian file tidak lengkap.");
    await env.BUCKET.put(`${temp}/part-${index}`, bytes);
    return Response.json({ ok: true });
  }
  if (action === "complete") {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < meta.parts; i++) {
      const part = await env.BUCKET.get(`${temp}/part-${i}`);
      if (!part) return bad(`Bagian ${i + 1} belum terunggah.`, 409);
      chunks.push(new Uint8Array(await part.arrayBuffer()));
    }
    const bytes = new Uint8Array(meta.size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (offset !== meta.size) return bad("Ukuran file tidak sesuai.");
    const image = detectUploadedImage(bytes);
    if (!image) return bad("Isi file bukan gambar JPG, PNG, WebP, GIF, AVIF, atau BMP yang valid.");
    const key = `${prefix}/${crypto.randomUUID()}.${image.extension}`;
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: image.contentType, cacheControl: privateFile ? "private, no-store" : "public, max-age=31536000, immutable" } });
    await env.BUCKET.delete([`${temp}/meta`, ...chunks.map((_, i) => `${temp}/part-${i}`)]);
    return Response.json({ url: `/api/images/${encodeURIComponent(key)}` });
  }
  return bad("Aksi upload tidak valid.");
}
