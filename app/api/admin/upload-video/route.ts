import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";

const maxSize = 200 * 1024 * 1024, CHUNK = 1024 * 1024;
type UploadMeta = { key: string; size: number; type: string; parts: number; created: number; multipartId?: string; uploaded: Array<{partNumber:number;etag:string}>; result?:string };
const validId = (value: string) => /^[a-f0-9-]{36}$/.test(value);
const error = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const admin = await requestAdmin(request);
  if (!admin?.appearance && !admin?.members) return error("Tidak diizinkan", 403);
  const url = new URL(request.url), action = url.searchParams.get("action") || "", showcase=url.searchParams.get("showcase")==="1";
  if(showcase&&!admin?.appearance)return error("Tidak diizinkan",403);
  if (action === "init") {
    const body = await request.json() as { name?: string; size?: number; type?: string; parts?: number };
    const ext = String(body.name || "").split(".").pop()?.toLowerCase() || "", size = Number(body.size), parts = Number(body.parts);
    if (ext !== "mp4" && ext !== "webm") return error("Format video harus MP4 atau WebM");
    if (!Number.isInteger(size) || size < 1 || size > maxSize) return error("Ukuran video maksimal 200 MB");
    if (parts !== Math.ceil(size / CHUNK)) return error("Jumlah bagian video tidak valid");
    const uploadId = crypto.randomUUID(), key = `${showcase?"showcase-media":"ads"}/${crypto.randomUUID()}.${ext}`;
    const type = ext === "mp4" ? "video/mp4" : "video/webm";
    const multipart = size > 6 * CHUNK ? await env.BUCKET.createMultipartUpload(key, { httpMetadata: { contentType: type } }) : null;
    const meta: UploadMeta = { key, size, type, parts, created: Date.now(), multipartId: multipart?.uploadId, uploaded: [] };
    await env.BUCKET.put(`${showcase?"temp-showcase-video":"temp-video"}/${uploadId}/meta.json`, JSON.stringify(meta));
    return Response.json({ uploadId });
  }
  const uploadId = url.searchParams.get("uploadId") || "";
  if (!validId(uploadId)) return error("Upload tidak valid");
  const temp = `${showcase?"temp-showcase-video":"temp-video"}/${uploadId}`;
  const object = await env.BUCKET.get(`${temp}/meta.json`);
  if (!object) return error("Sesi upload tidak ditemukan", 404);
  const meta = await object.json<UploadMeta>();
  if(meta.key.startsWith("showcase-media/")&&(!showcase||!admin?.appearance))return error("Tidak diizinkan",403);
  if(showcase&&!meta.key.startsWith("showcase-media/"))return error("Sesi upload tidak sesuai",400);
  if (Date.now() - meta.created > 60 * 60_000) return error("Sesi upload kedaluwarsa", 410);
  if (action === "chunk") {
    const index = Number(url.searchParams.get("index"));
    if (!Number.isInteger(index) || index < 0 || index >= meta.parts) return error("Bagian video tidak valid");
    if(meta.multipartId&&meta.uploaded[Math.floor(index/6)]&&index<Math.floor(meta.parts/6)*6)return Response.json({partNumber:index+1,etag:`staged-${index}`});
    const chunk = await request.arrayBuffer();
    if (chunk.byteLength !== Math.min(CHUNK, meta.size - index * CHUNK)) return error("Bagian video tidak lengkap");
    if(index===0){const bytes=new Uint8Array(chunk);const valid=meta.type==="video/mp4"?bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==="ftyp":bytes.length>=4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;if(!valid)return error("Isi file bukan video MP4/WebM yang valid.");}
    await env.BUCKET.put(`${temp}/part-${index}`, chunk);
    if (meta.multipartId && index % 6 === 5) {
      const bytes = await readGroup(temp, index - 5, index + 1);
      if (!bytes) return error("Bagian video belum lengkap", 409);
      const part = await env.BUCKET.resumeMultipartUpload(meta.key, meta.multipartId).uploadPart(Math.floor(index / 6) + 1, bytes);
      meta.uploaded[part.partNumber - 1] = part;
      await env.BUCKET.put(`${temp}/meta.json`, JSON.stringify(meta));
      await env.BUCKET.delete(Array.from({ length: 6 }, (_, i) => `${temp}/part-${index - 5 + i}`));
    }
    return Response.json({ partNumber: index + 1, etag: `staged-${index}` });
  }
  if (action === "cancel") {if(meta.multipartId&&!meta.result)await env.BUCKET.resumeMultipartUpload(meta.key,meta.multipartId).abort();await env.BUCKET.delete([`${temp}/meta.json`,...Array.from({length:meta.parts},(_,i)=>`${temp}/part-${i}`)]);return Response.json({ok:true});}
  if (action === "complete") {
    if(meta.result)return Response.json({url:meta.result});
    try {
      if (meta.multipartId) {
        const tail = Math.floor(meta.parts / 6) * 6;
        if (tail < meta.parts) {
          const bytes = await readGroup(temp, tail, meta.parts);
          if (!bytes) return error("Bagian video terakhir belum terunggah", 409);
          const part = await env.BUCKET.resumeMultipartUpload(meta.key, meta.multipartId).uploadPart(meta.uploaded.length + 1, bytes);
          meta.uploaded.push(part);
        }
        if (meta.uploaded.length !== Math.ceil(meta.parts / 6)) return error("Bagian video belum lengkap", 409);
        await env.BUCKET.resumeMultipartUpload(meta.key, meta.multipartId).complete(meta.uploaded);
      } else {
        const bytes = await readGroup(temp, 0, meta.parts);
        if (!bytes) return error("Bagian video belum lengkap", 409);
        await env.BUCKET.put(meta.key, bytes, { httpMetadata: { contentType: meta.type } });
      }
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "Video gagal disimpan", 409);
    }
    const result=`/api/images/${encodeURIComponent(meta.key)}`;await env.BUCKET.put(`${temp}/meta.json`,JSON.stringify({...meta,result}));await env.BUCKET.delete(Array.from({length:meta.parts},(_,i)=>`${temp}/part-${i}`));return Response.json({url:result});
  }
  return error("Aksi upload tidak valid");
}

async function readGroup(temp: string, start: number, end: number) {
  const pieces: Uint8Array[] = [];
  for (let i = start; i < end; i++) {
    const part = await env.BUCKET.get(`${temp}/part-${i}`);
    if (!part) return null;
    pieces.push(new Uint8Array(await part.arrayBuffer()));
  }
  const bytes = new Uint8Array(pieces.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of pieces) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
