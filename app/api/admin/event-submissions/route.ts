import { env } from "cloudflare:workers";
import { requirePermission } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import { ensureEventsTable } from "../../../../lib/events";
import { ensureEventSubmissions, submissionColumns, type EventSubmission } from "../../../../lib/event-submissions";

export async function GET(request: Request) {
  if (!await requirePermission(request, "events")) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  await ensureEventSubmissions();
  const rows = await env.DB.prepare(`SELECT ${submissionColumns} FROM event_submissions ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END,created_at DESC LIMIT 200`).all<EventSubmission>();
  return Response.json({ submissions: rows.results });
}

export async function POST(request: Request) {
  const admin = await requirePermission(request, "events");
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { id?: number; action?: string; reason?: string };
  const id = Number(body.id), action = String(body.action || "");
  if (!Number.isSafeInteger(id) || id < 1 || !["approve", "reject"].includes(action)) return Response.json({ error: "Aksi tidak valid." }, { status: 400 });
  await ensureEventSubmissions();
  const row = await env.DB.prepare(`SELECT ${submissionColumns} FROM event_submissions WHERE id=?`).bind(id).first<EventSubmission>();
  if (!row || row.status !== "PENDING") return Response.json({ error: "Pengajuan sudah diproses atau tidak ditemukan." }, { status: 409 });
  const now = new Date().toISOString();
  if (action === "reject") {
    const reason = String(body.reason || "").trim().slice(0, 300);
    if (!reason) return Response.json({ error: "Isi alasan penolakan." }, { status: 400 });
    const result = await env.DB.prepare("UPDATE event_submissions SET status='REJECTED',reviewed_at=?,reviewed_by=?,rejection_reason=? WHERE id=? AND status='PENDING'").bind(now, admin.email, reason, id).run();
    if (!result.meta.changes) return Response.json({ error: "Pengajuan sudah diproses." }, { status: 409 });
    await audit(admin.email, "reject", "event_submission", id, reason);
    return Response.json({ ok: true });
  }
  await ensureEventsTable();
  const duplicate = await env.DB.prepare("SELECT id FROM events WHERE LOWER(title)=LOWER(?) AND start_date=? AND deleted_at='' LIMIT 1").bind(row.title, row.startDate).first();
  if (duplicate) return Response.json({ error: "Event dengan nama dan tanggal sama sudah ada. Tolak pengajuan atau periksa event yang terbit." }, { status: 409 });
  const format = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(new Date(`${value}T12:00:00+08:00`));
  const eventDate = row.startDate === row.endDate ? format(row.startDate) : `${format(row.startDate)} – ${format(row.endDate)}`;
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO events (title,event_date,start_date,end_date,prizepool,registration_fee,image_url,category,status,whatsapp,event_mode,city,province,address,max_slots,sort_order,created_at)
      SELECT title,?,start_date,end_date,prizepool,registration_fee,image_url,'Community Event','OPEN REGISTRATION',whatsapp,event_mode,city,province,address,0,0,?
      FROM event_submissions WHERE id=? AND status='PENDING'`).bind(eventDate, now, id),
    env.DB.prepare("UPDATE event_submissions SET status='APPROVED',event_id=last_insert_rowid(),reviewed_at=?,reviewed_by=? WHERE id=? AND status='PENDING'").bind(now, admin.email, id),
  ]);
  if (!results[0].meta.changes) return Response.json({ error: "Pengajuan sudah diproses." }, { status: 409 });
  await audit(admin.email, "approve", "event_submission", id, `Event diterbitkan #${results[0].meta.last_row_id}`);
  return Response.json({ ok: true, eventId: results[0].meta.last_row_id });
}
