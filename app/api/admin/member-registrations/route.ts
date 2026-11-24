import { env } from "cloudflare:workers";
import { audit } from "../../../../lib/audit";
import { requirePermission } from "../../../../lib/admin-auth";
import {
  normalizeInstagram,
  normalizeTiktok,
} from "../../../../lib/member-socials";
import { normalizeMemberName } from "../../../../lib/members";
export async function GET(r: Request) {
  const a = await requirePermission(r, "members");
  if (!a) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  return Response.json(
    (
      await env.DB.prepare(
      "SELECT * FROM member_registrations WHERE hidden=0 ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END,created_at DESC",
      ).all()
    ).results,
  );
}
export async function POST(r: Request) {
  const a = await requirePermission(r, "members");
  if (!a) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const b = (await r.json()) as { id: number; action: string },
    row = await env.DB.prepare("SELECT * FROM member_registrations WHERE id=?")
      .bind(b.id)
      .first<any>();
  if (!row)
    return Response.json(
      { error: "Pendaftaran tidak ditemukan" },
      { status: 404 },
    );
  if (!["approve", "reject", "hide", "show"].includes(b.action))
    return Response.json({ error: "Tindakan tidak valid" }, { status: 400 });
  const now = new Date().toISOString();
  if (b.action === "hide" || b.action === "show") {
    if (row.status === "PENDING") return Response.json({ error: "Pendaftar yang belum selesai tidak bisa disembunyikan." }, { status: 400 });
    await env.DB.prepare("UPDATE member_registrations SET hidden=?,updated_at=? WHERE id=?").bind(b.action === "hide" ? 1 : 0, now, b.id).run();
    return Response.json({ ok: true });
  }
  if (b.action === "reject") {
    if (row.status === "REJECTED")
      return Response.json(
        { error: "Pendaftaran ini sudah ditolak." },
        { status: 409 },
      );
    if (row.status === "APPROVED")
      await env.DB.prepare(
        "DELETE FROM community_members WHERE normalized_name=? AND created_at=?",
      )
        .bind(normalizeMemberName(row.team_name), row.reviewed_at)
        .run();
    await env.DB.prepare(
      "UPDATE member_registrations SET status='REJECTED',reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?",
    )
      .bind(a.email, now, now, b.id)
      .run();
    return Response.json({ ok: true });
  }
  if (row.status === "APPROVED")
    return Response.json(
      { error: "Pendaftaran ini sudah diterima." },
      { status: 409 },
    );
  const normalizedName = normalizeMemberName(row.team_name);
  const matches = (await env.DB.prepare(
    "SELECT id,team_name AS teamName,normalized_name AS normalizedName,whatsapp FROM community_members WHERE normalized_name=? OR (whatsapp<>'' AND whatsapp=?)",
  )
    .bind(normalizedName, row.whatsapp)
    .all<{ id: number; teamName: string; normalizedName: string; whatsapp: string }>()).results;
  const conflict = matches.find((member) => member.normalizedName !== normalizedName);
  if (conflict)
    return Response.json(
      {
        error: `Nomor WhatsApp sudah terdaftar sebagai member ${conflict.teamName}. Periksa data member tersebut terlebih dahulu.`,
      },
      { status: 409 },
    );
  const ig = normalizeInstagram(row.instagram),
    tt = normalizeTiktok(row.tiktok);
  const existing = matches.find((member) => member.normalizedName === normalizedName);
  if (existing) {
    await env.DB.batch([
      env.DB.prepare("UPDATE community_members SET team_name=?,owner_name=COALESCE(NULLIF(?,''),owner_name),management_name=COALESCE(NULLIF(?,''),management_name),whatsapp=?,logo_url=COALESCE(NULLIF(?,''),logo_url),instagram_username=?,instagram_url=?,tiktok_username=?,tiktok_url=?,updated_at=? WHERE id=?")
        .bind(row.team_name, row.owner_name, row.management_name, row.whatsapp, row.logo_url, ig.username, ig.url, tt.username, tt.url, now, existing.id),
      env.DB.prepare("UPDATE member_registrations SET status='APPROVED',reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?")
        .bind(a.email, now, now, b.id),
    ]);
    await audit(a.email, "APPROVE", "member_registration", b.id, row.team_name);
    return Response.json({ ok: true, id: existing.id });
  }
  const ins = await env.DB.prepare(
    "INSERT INTO community_members(team_name,normalized_name,owner_name,management_name,whatsapp,logo_url,logo_x,logo_y,logo_scale,instagram_username,instagram_url,tiktok_username,tiktok_url,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?)",
  )
    .bind(
      row.team_name,
      normalizedName,
      row.owner_name,
      row.management_name,
      row.whatsapp,
      row.logo_url,
      0,
      0,
      100,
      ig.username,
      ig.url,
      tt.username,
      tt.url,
      now,
      now,
    )
    .run();
  await env.DB.prepare(
    "UPDATE member_registrations SET status='APPROVED',reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?",
  )
    .bind(a.email, now, now, b.id)
    .run();
  await audit(a.email, "APPROVE", "member_registration", b.id, row.team_name);
  return Response.json({ ok: true, id: ins.meta.last_row_id });
}
