import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import { correctedEnd, manualPeriodEnd, paidMonths, packageAmount } from "../../../../lib/member-dues-correction";
import { ensureMemberBillingPreferences } from "../../../../lib/member-billing";

type ManualRow = { amount?: string; status?: string; paidAt?: string; tier?: string; priorEnd?: string; priorStart?: string; priorTier?: string; priorActive?: number; recordedAt?: string };
export async function POST(request: Request) {
  const admin = await requestAdmin(request);
  if (!admin?.isOwner) return Response.json({ error: "Hanya Admin Utama yang dapat mengoreksi iuran manual." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const memberId = Number(body.memberId), month = String(body.month || ""), action = String(body.action || "save");
  if (!Number.isSafeInteger(memberId) || memberId < 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !["save", "cancel"].includes(action))
    return Response.json({ error: "Pilih member, bulan, dan tindakan yang valid." }, { status: 400 });
  const member = await env.DB.prepare("SELECT id,team_name,membership_start,membership_end,membership_tier,active FROM community_members WHERE id=?").bind(memberId).first<Record<string, unknown>>();
  if (!member) return Response.json({ error: "Member tidak ditemukan." }, { status: 404 });
  if (action === "save") {
    await ensureMemberBillingPreferences();
    const preference = await env.DB.prepare("SELECT enabled FROM member_billing_preferences WHERE member_id=?").bind(memberId).first<{enabled:number}>();
    if (preference && !preference.enabled) return Response.json({ error: "Tim ini berhenti iuran. Aktifkan penagihannya dahulu sebelum mencatat iuran baru." }, { status: 409 });
  }
  const setting = await env.DB.prepare("SELECT value FROM site_settings WHERE key='memberDuesJson'").first<{ value: string }>();
  let dues: Record<string, ManualRow>;
  try { dues = JSON.parse(setting?.value || "{}"); if (!dues || typeof dues !== "object" || Array.isArray(dues)) throw Error(); }
  catch { return Response.json({ error: "Data iuran tersimpan tidak valid." }, { status: 500 }); }
  const key = `${month}:${memberId}`, previous = dues[key];
  const oldMonths = previous?.status === "SUDAH BAYAR" ? paidMonths(previous.amount, previous.tier || "C") : 0;
  if (action === "cancel" && !previous) return Response.json({ error: "Iuran manual belum tercatat." }, { status: 404 });
  const tier = String(body.tier || "C").toUpperCase(), months = Number(body.months);
  const amount = action === "save" ? packageAmount(tier, months) : undefined;
  const paidAt = String(body.paidAt || "");
  if (action === "save" && (!amount || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || Number.isNaN(Date.parse(`${paidAt}T12:00:00Z`)) || new Date(`${paidAt}T12:00:00Z`).toISOString().slice(0, 10) !== paidAt))
    return Response.json({ error: "Pilih paket dan tanggal bayar yang valid." }, { status: 400 });
  if (action === "save" && !previous) {
    const duplicate = await env.DB.prepare("SELECT id FROM member_payments WHERE member_id=? AND status='LUNAS' AND substr(paid_at,1,7)=? LIMIT 1").bind(memberId, month).first();
    if (duplicate) return Response.json({ error: "Sudah ada transaksi lunas untuk member dan bulan ini. Koreksi melalui menu Pembayaran Member agar tidak tercatat dua kali." }, { status: 409 });
  }
  const now = new Date().toISOString(), today = now.slice(0, 10);
  const oldEnd = String(member.membership_end || "");
  const hasSnapshot = previous && Object.prototype.hasOwnProperty.call(previous, "priorEnd");
  const baseEnd = hasSnapshot ? String(previous.priorEnd || "") : previous
    ? correctedEnd(oldEnd, -oldMonths, String(previous.paidAt || `${month}-01`)) : oldEnd;
  const baseActive = hasSnapshot ? Number(previous.priorActive || 0) : previous
    ? Number(baseEnd >= today) : Number(member.active || 0);
  const changedSinceRecord = previous ? (
    Object.entries(dues).some(([otherKey, row]) => otherKey !== key && otherKey.endsWith(`:${memberId}`) && row.status === "SUDAH BAYAR" && String(row.recordedAt || row.paidAt || otherKey.slice(0, 7)) > String(previous.recordedAt || previous.paidAt || `${month}-01`)) ||
    Boolean(await env.DB.prepare("SELECT id FROM member_payments WHERE member_id=? AND status='LUNAS' AND verified_at>? LIMIT 1").bind(memberId, String(previous.recordedAt || previous.paidAt || `${month}-01`)).first())
  ) : false;
  if (changedSinceRecord) return Response.json({ error: "Ada iuran berikutnya setelah catatan ini. Koreksi catatan terbaru dahulu agar masa aktif tidak berubah keliru." }, { status: 409 });
  if (action === "cancel") delete dues[key];
  else dues[key] = { amount: String(amount), status: "SUDAH BAYAR", paidAt, tier,
    priorEnd: baseEnd, priorStart: hasSnapshot ? previous.priorStart : String(member.membership_start || ""),
    priorTier: hasSnapshot ? previous.priorTier : String(member.membership_tier || ""),
    priorActive: baseActive, recordedAt: hasSnapshot ? previous.recordedAt : now };
  const delta = (action === "save" ? months : 0) - oldMonths;
  const anchorDay = Number(String(member.membership_start || "").slice(8, 10)) || undefined;
  const end = action === "cancel" && !changedSinceRecord ? baseEnd
    : action === "save" && !changedSinceRecord ? manualPeriodEnd(baseEnd, paidAt, months, anchorDay)
    : correctedEnd(oldEnd, delta, paidAt || String(previous?.paidAt || `${month}-01`), anchorDay);
  const start = action === "cancel" && !changedSinceRecord ? String(hasSnapshot ? previous.priorStart || "" : member.membership_start || "")
    : String(member.membership_start || "") || (action === "save" ? paidAt : "");
  const hasPaid = Object.entries(dues).some(([k, v]) => k.endsWith(`:${memberId}`) && v.status === "SUDAH BAYAR");
  const invoicePaid = await env.DB.prepare("SELECT tier FROM member_payments WHERE member_id=? AND status='LUNAS' ORDER BY id DESC LIMIT 1").bind(memberId).first<{tier:string}>();
  const remainingManual = Object.entries(dues).filter(([k, v]) => k.endsWith(`:${memberId}`) && v.status === "SUDAH BAYAR").sort(([a],[b]) => b.localeCompare(a));
  const effectiveTier = action === "save" ? `TIER ${tier}` : action === "cancel" && !changedSinceRecord
    ? String(hasSnapshot ? previous.priorTier || "" : member.membership_tier || "")
    : `TIER ${invoicePaid?.tier || remainingManual[0]?.[1].tier || String(member.membership_tier || "").replace(/^TIER /, "")}`;
  const active = action === "cancel" && !changedSinceRecord ? baseActive
    : end && end >= today ? 1 : (invoicePaid || hasPaid ? 0 : Number(member.active || 0));
  await env.DB.batch([
    env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES('memberDuesJson',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(dues), now),
    env.DB.prepare("UPDATE community_members SET active=?,membership_start=?,membership_end=?,membership_tier=?,updated_at=? WHERE id=?").bind(active, start, end, effectiveTier, now, memberId),
  ]);
  await audit(admin.email, action === "cancel" ? "BATAL IURAN MANUAL" : "KOREKSI IURAN MANUAL", "finance_member_dues", key,
    `${member.team_name}: ${previous?.amount || "0"} → ${amount || 0}; ${oldMonths} → ${action === "save" ? months : 0} bulan; masa aktif ${oldEnd || "-"} → ${end || "-"}`);
  return Response.json({ ok: true, membershipEnd: end, amount: amount || 0, months: action === "save" ? months : 0 });
}
