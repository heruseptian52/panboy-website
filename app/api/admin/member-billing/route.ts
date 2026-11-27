import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import { ensureMemberBillingPreferences } from "../../../../lib/member-billing";

export async function POST(request: Request) {
  const admin = await requestAdmin(request);
  if (!admin?.isOwner) return Response.json({ error: "Hanya Admin Utama yang dapat mengubah status penagihan." }, { status: 403 });
  let body: { memberId?: unknown; enabled?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Data tidak valid." }, { status: 400 }); }
  const memberId = Number(body.memberId);
  if (!Number.isSafeInteger(memberId) || memberId <= 0 || typeof body.enabled !== "boolean")
    return Response.json({ error: "Pilih tim dan status penagihan yang valid." }, { status: 400 });
  const member = await env.DB.prepare("SELECT team_name FROM community_members WHERE id=?").bind(memberId).first<{ team_name: string }>();
  if (!member) return Response.json({ error: "Tim tidak ditemukan." }, { status: 404 });
  await ensureMemberBillingPreferences();
  const previous = await env.DB.prepare("SELECT enabled FROM member_billing_preferences WHERE member_id=?").bind(memberId).first<{ enabled: number }>();
  const current = previous ? Boolean(previous.enabled) : true;
  if (current === body.enabled) return Response.json({ ok: true, enabled: current, unchanged: true });
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO member_billing_preferences(member_id,enabled,updated_by,updated_at) VALUES(?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=excluded.updated_at")
    .bind(memberId, body.enabled ? 1 : 0, admin.email, now).run();
  await audit(admin.email, body.enabled ? "AKTIFKAN TAGIHAN MEMBER" : "NONAKTIFKAN TAGIHAN MEMBER", "member_billing", memberId, `${member.team_name}: ${body.enabled ? "ikut iuran dan pengingat" : "berhenti iuran dan pengingat"}`);
  return Response.json({ ok: true, enabled: body.enabled }, { headers: { "Cache-Control": "private, no-store" } });
}
