import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { detectUploadedImage } from "../../../../lib/uploaded-image";
import { chunkedImage } from "../../../../lib/chunked-image";
export async function POST(request: Request) {
  const a = await requestAdmin(request);
  if (
    !a ||
    (!a.events && !a.products && !a.partners && !a.appearance && !a.leaderboard && !a.leaderboardDesign && !a.liveObs && !a.members && !a.finance && !a.services && !a.communityProfile && !a.memberDues && !a.topup)
  )
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  if (new URL(request.url).searchParams.has("action")) return chunkedImage(request, "uploads", 10 * 1024 * 1024);
  const form = await request.formData(),
    file = form.get("poster");
  if (!(file instanceof File))
    return Response.json({ error: "Pilih file gambar" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return Response.json({ error: "Ukuran maksimal 10 MB" }, { status: 400 });
  const bytes=new Uint8Array(await file.arrayBuffer()),image=detectUploadedImage(bytes);
  if(!image)return Response.json({error:"File tidak terbaca sebagai gambar. Gunakan JPG, PNG, WEBP, GIF, AVIF, atau BMP."},{status:400});
  const key = `uploads/${crypto.randomUUID()}.${image.extension}`;
  await env.BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType: image.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  return Response.json({ url: `/api/images/${encodeURIComponent(key)}` });
}
