import { env } from "cloudflare:workers";
import { detectUploadedImage } from "../../../../lib/uploaded-image";
import { chunkedImage } from "../../../../lib/chunked-image";

export async function POST(request: Request) {
  if (new URL(request.url).searchParams.has("action")) return chunkedImage(request, "team-logos", 25 * 1024 * 1024);
  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) return Response.json({ error: "Pilih file logo team." }, { status: 400 });
  if (file.size < 16 || file.size > 25 * 1024 * 1024) return Response.json({ error: "Ukuran gambar maksimal 25 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image=detectUploadedImage(bytes);
  if(!image)return Response.json({error:"File tidak terbaca sebagai gambar. Gunakan JPG, PNG, WEBP, GIF, AVIF, atau BMP."},{status:400});
  const key = `team-logos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${image.extension}`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: image.contentType, cacheControl: "public, max-age=31536000, immutable" } });
  return Response.json({ url: `/api/images/${encodeURIComponent(key)}` });
}
