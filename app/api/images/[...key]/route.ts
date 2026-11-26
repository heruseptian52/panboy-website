import { env } from "cloudflare:workers";
import { requirePermission } from "../../../../lib/admin-auth";
import {isMarketMediaPublic,isMarketMediaPrivate} from "../../../../lib/esports-market";
import {isShowcaseMediaPublic} from "../../../../lib/showcase";

function mediaHeaders(type: string, etag?: string) {
  const headers = new Headers({
    "Content-Type": type || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  });
  headers.set("X-Content-Type-Options", "nosniff");
  if (etag) headers.set("ETag", etag);
  return headers;
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");
  const paymentProof = objectKey.startsWith("member-payment-proofs/"),showcaseMedia=objectKey.startsWith("showcase-media/");
  const marketMedia=objectKey.startsWith("market-media/");
  if(marketMedia&&!await isMarketMediaPublic(objectKey)&&!await requirePermission(request,"market")&&!await isMarketMediaPrivate(objectKey,new URL(request.url).searchParams.get("edit")||""))return new Response("Tidak ditemukan",{status:404,headers:{"Cache-Control":"private, no-store"}});
  if(showcaseMedia&&!await isShowcaseMediaPublic(objectKey)&&!await requirePermission(request,"appearance"))return new Response("Tidak ditemukan",{status:404,headers:{"Cache-Control":"private, no-store"}});
  if (paymentProof && !await requirePermission(request, "memberDues"))
    return new Response("Tidak ditemukan", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (/^(roster-tmp|image-upload-temp|temp-showcase-video|temp-video|temp-music|blacklist-temp|blacklist-evidence|market-temp)\//.test(objectKey))
    return new Response("Tidak ditemukan", { status: 404, headers: { "Cache-Control": "no-store" } });
  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) {
    const object = await env.BUCKET.get(objectKey);
    if (!object) return new Response("Tidak ditemukan", { status: 404 });
    const headers = mediaHeaders(object.httpMetadata?.contentType || "", object.etag);
    if(objectKey.startsWith("roster-logos/")&&!String(object.httpMetadata?.contentType||"").startsWith("image/"))headers.set("Content-Disposition","attachment");
    if (paymentProof||showcaseMedia||marketMedia) headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { headers });
  }

  const metadata = await env.BUCKET.head(objectKey);
  if (!metadata) return new Response("Tidak ditemukan", { status: 404 });
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
  const requestedStart = match[1] ? Number(match[1]) : null;
  const requestedEnd = match[2] ? Number(match[2]) : null;
  const start = requestedStart == null ? Math.max(0, metadata.size - Math.max(0, requestedEnd || 0)) : requestedStart;
  const end = requestedStart == null ? metadata.size - 1 : Math.min(metadata.size - 1, requestedEnd == null ? metadata.size - 1 : requestedEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= metadata.size)
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
  const length = end - start + 1;
  const object = await env.BUCKET.get(objectKey, { range: { offset: start, length } });
  if (!object) return new Response("Tidak ditemukan", { status: 404 });
  const headers = mediaHeaders(metadata.httpMetadata?.contentType || "", metadata.etag);
  if(objectKey.startsWith("roster-logos/")&&!String(metadata.httpMetadata?.contentType||"").startsWith("image/"))headers.set("Content-Disposition","attachment");
  if (paymentProof||showcaseMedia||marketMedia) headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Length", String(length));
  headers.set("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
  return new Response(object.body, { status: 206, headers });
}
