import { env } from "cloudflare:workers";
import { ensureEventSubmissions } from "../../../lib/event-submissions";
import { detectUploadedImage } from "../../../lib/uploaded-image";
import { normalizeWhatsapp } from "../../../lib/events";

const get = (form: FormData, key: string, max = 150) => String(form.get(key) || "").trim().slice(0, max);
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 11 * 1024 * 1024) return Response.json({ error: "Ukuran pengajuan maksimal 10 MB." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Form tidak dapat dibaca." }, { status: 400 }); }
  if (get(form, "website")) return Response.json({ ok: true, message: "Pengajuan diterima untuk diperiksa admin." });
  const title = get(form, "title", 120), organizer = get(form, "organizer", 100);
  const whatsapp = normalizeWhatsapp(get(form, "whatsapp", 30));
  const startDate = get(form, "startDate", 10), endDate = get(form, "endDate", 10);
  const prizepool = get(form, "prizepool", 60), registrationFee = get(form, "registrationFee", 60);
  const eventMode = get(form, "eventMode", 10), city = get(form, "city", 80);
  const province = get(form, "province", 80), address = get(form, "address", 200);
  const notes = get(form, "notes", 500), file = form.get("poster"), posterUrl = get(form, "posterUrl", 250);
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  if (!title || !organizer || !/^62\d{8,14}$/.test(whatsapp) || !validDate(startDate) || !validDate(endDate) || startDate < today || endDate < startDate || !["Online", "Offline"].includes(eventMode) || (eventMode === "Offline" && (!city || !province || !address)))
    return Response.json({ error: "Lengkapi nama event, penyelenggara, WhatsApp, tanggal yang akan datang, dan lokasi jika offline." }, { status: 400 });
  if (!(file instanceof File) && !/^\/api\/images\/event-submissions%2F[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(posterUrl))
    return Response.json({ error: "Pilih poster JPG, PNG, atau WebP maksimal 10 MB." }, { status: 400 });
  const bytes = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array(await (await env.BUCKET.get(decodeURIComponent(posterUrl.slice("/api/images/".length))))?.arrayBuffer() || new ArrayBuffer(0));
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) return Response.json({ error: "Poster tidak ditemukan atau terlalu besar." }, { status: 400 });
  const image = detectUploadedImage(bytes);
  if (!image || !["image/jpeg", "image/png", "image/webp"].includes(image.contentType))
    return Response.json({ error: "Poster harus berupa JPG, PNG, atau WebP yang valid." }, { status: 400 });
  await ensureEventSubmissions();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS total FROM event_submissions WHERE whatsapp=? AND created_at>=? ").bind(whatsapp, new Date(Date.now() - 60 * 60 * 1000).toISOString()).first<{ total: number }>();
  if (Number(recent?.total || 0) >= 3) return Response.json({ error: "Maksimal tiga pengajuan per jam untuk nomor ini. Coba lagi nanti." }, { status: 429 });
  const key = posterUrl ? decodeURIComponent(posterUrl.slice("/api/images/".length)) : `event-submissions/${crypto.randomUUID()}.${image.extension}`;
  if (!posterUrl) await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: image.contentType, cacheControl: "public, max-age=31536000, immutable" } });
  try {
    await env.DB.prepare(`INSERT INTO event_submissions (title,organizer,whatsapp,start_date,end_date,prizepool,registration_fee,image_url,event_mode,city,province,address,notes,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(title, organizer, whatsapp, startDate, endDate, prizepool, registrationFee, `/api/images/${encodeURIComponent(key)}`, eventMode, city, province, address, notes, new Date().toISOString()).run();
  } catch (error) {
    await env.BUCKET.delete(key);
    throw error;
  }
  return Response.json({ ok: true, message: "Event berhasil diajukan dan menunggu persetujuan admin." });
}
