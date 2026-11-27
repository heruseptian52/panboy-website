import { env } from "cloudflare:workers";
import { ensureMemberPayments } from "../../../../lib/member-payments";
import { detectUploadedImage } from "../../../../lib/uploaded-image";
import { getSettings } from "../../../../lib/settings";
import { chunkedImage } from "../../../../lib/chunked-image";

export async function POST(request: Request) {
  if (new URL(request.url).searchParams.has("action")) return chunkedImage(request, "member-payment-proofs", 8 * 1024 * 1024, true);
  await ensureMemberPayments();
  const form = await request.formData(), invoice = String(form.get("invoice") || ""), file = form.get("proof"), stagedUrl = String(form.get("proofUrl") || "");
  if (!invoice || (!(file instanceof File) && !/^\/api\/images\/member-payment-proofs%2F[0-9a-f-]{36}\.(jpg|png|webp|gif|avif|bmp)$/i.test(stagedUrl)))
    return Response.json({ error: "Invoice dan bukti gambar wajib diisi (maksimal 8 MB)." }, { status: 400 });
  const row = await env.DB.prepare("SELECT status,team_name AS teamName,months,amount FROM member_payments WHERE invoice=?").bind(invoice).first<{ status: string; teamName: string; months: number; amount: number }>();
  if (!row) return Response.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  if (!["WAITING_PAYMENT", "WAITING_VERIFICATION"].includes(row.status)) return Response.json({ error: "Pembayaran ini tidak dapat menerima bukti baru." }, { status: 409 });
  let proofUrl = stagedUrl;
  if (file instanceof File) {
    if (file.size < 16 || file.size > 8 * 1024 * 1024) return Response.json({ error: "Bukti gambar maksimal 8 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer()), image = detectUploadedImage(bytes);
    if (!image) return Response.json({ error: "Bukti harus berupa gambar." }, { status: 400 });
    const key = `member-payment-proofs/${crypto.randomUUID()}.${image.extension}`;
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: image.contentType, cacheControl: "private, no-store" } });
    proofUrl = `/api/images/${encodeURIComponent(key)}`;
  } else if (!await env.BUCKET.head(decodeURIComponent(stagedUrl.slice("/api/images/".length)))) {
    return Response.json({ error: "Bukti gambar tidak ditemukan. Ulangi upload." }, { status: 400 });
  }
  const saved = await env.DB.prepare("UPDATE member_payments SET proof_url=?,status='WAITING_VERIFICATION',updated_at=? WHERE invoice=? AND status IN ('WAITING_PAYMENT','WAITING_VERIFICATION')")
    .bind(proofUrl, new Date().toISOString(), invoice).run();
  if (!saved.meta.changes)
    return Response.json({ error: "Status pembayaran sudah berubah. Cek kembali invoice." }, { status: 409 });
  const settings = await getSettings(), number = String(settings.memberWhatsapp || "").replace(/\D/g, "");
  const message = `Halo Admin Panboy, saya sudah upload bukti pembayaran iuran member.\n\nInvoice: ${invoice}\nTeam: ${row.teamName}\nPaket: ${row.months} bulan\nNominal: Rp${Number(row.amount).toLocaleString("id-ID")}\nBukti: ${new URL(proofUrl, request.url)}\n\nMohon diverifikasi.`;
  return Response.json({ ok: true, whatsappUrl: number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "" });
}
