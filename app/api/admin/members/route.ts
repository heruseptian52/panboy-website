import { env } from "cloudflare:workers";
import { audit } from "../../../../lib/audit";
import { normalizeMemberName } from "../../../../lib/members";
import {
  normalizeInstagram,
  normalizeTiktok,
} from "../../../../lib/member-socials";
import { requirePermission } from "../../../../lib/admin-auth";

async function allowed(request: Request) {
  return requirePermission(request, "members");
}

export async function GET(request: Request) {
  if (!(await allowed(request)))
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const result = await env.DB.prepare(
    "SELECT id,team_name AS teamName,owner_name AS ownerName,management_name AS managementName,whatsapp,logo_url AS logoUrl,logo_x AS logoX,logo_y AS logoY,logo_scale AS logoScale,instagram_username AS instagramUsername,instagram_url AS instagramUrl,tiktok_username AS tiktokUsername,tiktok_url AS tiktokUrl,player_photo_1_url AS playerPhoto1Url,player_photo_2_url AS playerPhoto2Url,player_photo_1_x AS playerPhoto1X,player_photo_1_y AS playerPhoto1Y,player_photo_1_scale AS playerPhoto1Scale,player_photo_2_x AS playerPhoto2X,player_photo_2_y AS playerPhoto2Y,player_photo_2_scale AS playerPhoto2Scale,CASE WHEN membership_end<>'' AND membership_end<date('now') THEN 0 ELSE active END AS active,sort_order AS sortOrder,membership_start AS membershipStart,membership_end AS membershipEnd,membership_tier AS membershipTier,created_at AS createdAt,updated_at AS updatedAt FROM community_members ORDER BY CASE WHEN membership_end<>'' AND membership_end<date('now') THEN 0 ELSE active END DESC, CASE WHEN membership_end<>'' AND membership_end>=date('now') THEN 0 ELSE 1 END, sort_order ASC,team_name COLLATE NOCASE ASC",
  ).all();
  return Response.json(result.results);
}

function data(body: Record<string, unknown>) {
  const teamName = String(body.teamName || "")
    .trim()
    .replace(/\s+/g, " ");
  const ownerName = String(body.ownerName || "").trim();
  const managementName = String(body.managementName || "").trim();
  const whatsapp = String(body.whatsapp || "").replace(/\D/g, "");
  const logoUrl = String(body.logoUrl || "").trim();
  const instagram = normalizeInstagram(
    String(body.instagram || body.instagramUsername || ""),
  );
  const tiktok = normalizeTiktok(
    String(body.tiktok || body.tiktokUsername || ""),
  );
  const playerPhoto1Url = String(body.playerPhoto1Url || "").trim();
  const playerPhoto2Url = String(body.playerPhoto2Url || "").trim();
  const clamp = (value: unknown, min: number, max: number, fallback: number) =>
    Math.max(
      min,
      Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback),
    );
  return {
    teamName,
    normalizedName: normalizeMemberName(teamName),
    ownerName,
    managementName,
    whatsapp,
    logoUrl,
    logoX: clamp(body.logoX, -50, 50, 0),
    logoY: clamp(body.logoY, -50, 50, 0),
    logoScale: clamp(body.logoScale, 50, 160, 100),
    instagramUsername: instagram.username,
    instagramUrl: instagram.url,
    tiktokUsername: tiktok.username,
    tiktokUrl: tiktok.url,
    playerPhoto1Url,
    playerPhoto2Url,
    playerPhoto1X: clamp(body.playerPhoto1X, 20, 80, 42),
    playerPhoto1Y: clamp(body.playerPhoto1Y, -30, 30, 0),
    playerPhoto1Scale: clamp(body.playerPhoto1Scale, 60, 150, 100),
    playerPhoto2X: clamp(body.playerPhoto2X, 20, 80, 58),
    playerPhoto2Y: clamp(body.playerPhoto2Y, -30, 30, 0),
    playerPhoto2Scale: clamp(body.playerPhoto2Scale, 60, 150, 100),
    active: body.active === false ? 0 : 1,
    sortOrder: Math.max(0, Number(body.sortOrder) || 0),
  };
}

export async function POST(request: Request) {
  const admin = await allowed(request);
  if (!admin)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const item = data((await request.json()) as Record<string, unknown>);
  if (!item.teamName)
    return Response.json({ error: "Nama team wajib diisi" }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare(
      "INSERT INTO community_members(team_name,normalized_name,owner_name,management_name,whatsapp,logo_url,logo_x,logo_y,logo_scale,instagram_username,instagram_url,tiktok_username,tiktok_url,player_photo_1_url,player_photo_2_url,player_photo_1_x,player_photo_1_y,player_photo_1_scale,player_photo_2_x,player_photo_2_y,player_photo_2_scale,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        item.teamName,
        item.normalizedName,
        item.ownerName,
        item.managementName,
        item.whatsapp,
        item.logoUrl,
        item.logoX,
        item.logoY,
        item.logoScale,
        item.instagramUsername,
        item.instagramUrl,
        item.tiktokUsername,
        item.tiktokUrl,
        item.playerPhoto1Url,
        item.playerPhoto2Url,
        item.playerPhoto1X,
        item.playerPhoto1Y,
        item.playerPhoto1Scale,
        item.playerPhoto2X,
        item.playerPhoto2Y,
        item.playerPhoto2Scale,
        item.active,
        item.sortOrder,
        now,
        now,
      )
      .run();
    await audit(
      admin.email,
      "CREATE",
      "community_member",
      String(result.meta.last_row_id),
      item.teamName,
    );
    return Response.json({ ok: true, id: result.meta.last_row_id });
  } catch {
    return Response.json(
      { error: "Nama team sudah terdaftar" },
      { status: 409 },
    );
  }
}

export async function PUT(request: Request) {
  const admin = await allowed(request);
  if (!admin)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>,
    id = Number(body.id),
    item = data(body);
  if (!id || !item.teamName)
    return Response.json({ error: "Nama member belum diisi" }, { status: 400 });
  try {
    const existing = await env.DB.prepare(
      "SELECT active,membership_end AS membershipEnd FROM community_members WHERE id=?",
    )
      .bind(id)
      .first<{ active: number; membershipEnd: string }>();
    if (!existing)
      return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
    const manuallyReactivated =
      item.active === 1 &&
      Boolean(existing.membershipEnd) &&
      existing.membershipEnd < new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      "UPDATE community_members SET team_name=?,normalized_name=?,owner_name=?,management_name=?,whatsapp=?,logo_url=?,logo_x=?,logo_y=?,logo_scale=?,instagram_username=?,instagram_url=?,tiktok_username=?,tiktok_url=?,player_photo_1_url=?,player_photo_2_url=?,player_photo_1_x=?,player_photo_1_y=?,player_photo_1_scale=?,player_photo_2_x=?,player_photo_2_y=?,player_photo_2_scale=?,active=?,sort_order=?,membership_end=CASE WHEN ? THEN '' ELSE membership_end END,updated_at=? WHERE id=?",
    )
      .bind(
        item.teamName,
        item.normalizedName,
        item.ownerName,
        item.managementName,
        item.whatsapp,
        item.logoUrl,
        item.logoX,
        item.logoY,
        item.logoScale,
        item.instagramUsername,
        item.instagramUrl,
        item.tiktokUsername,
        item.tiktokUrl,
        item.playerPhoto1Url,
        item.playerPhoto2Url,
        item.playerPhoto1X,
        item.playerPhoto1Y,
        item.playerPhoto1Scale,
        item.playerPhoto2X,
        item.playerPhoto2Y,
        item.playerPhoto2Scale,
        item.active,
        item.sortOrder,
        manuallyReactivated ? 1 : 0,
        new Date().toISOString(),
        id,
      )
      .run();
    await audit(admin.email, "UPDATE", "community_member", id, item.teamName);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Nama team sudah digunakan" },
      { status: 409 },
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await allowed(request);
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = (await request.json()) as { id?: number; field?: string; url?: string; active?: boolean };
  const id = Number(body.id);
  if (body.field === "status") {
    if (!Number.isSafeInteger(id) || id < 1 || typeof body.active !== "boolean")
      return Response.json({ error: "Status team tidak valid." }, { status: 400 });
    const existing = await env.DB.prepare("SELECT team_name,active,membership_end FROM community_members WHERE id=?").bind(id).first<{team_name:string;active:number;membership_end:string}>();
    if (!existing) return Response.json({ error: "Team tidak ditemukan." }, { status: 404 });
    const today = new Date().toISOString().slice(0, 10);
    const clearExpiredEnd = body.active && existing.membership_end && existing.membership_end < today;
    await env.DB.prepare("UPDATE community_members SET active=?,membership_end=CASE WHEN ? THEN '' ELSE membership_end END,updated_at=? WHERE id=?")
      .bind(body.active ? 1 : 0, clearExpiredEnd ? 1 : 0, new Date().toISOString(), id).run();
    await audit(admin.email, body.active ? "AKTIFKAN" : "NONAKTIFKAN", "community_member", id, existing.team_name);
    return Response.json({ ok: true, active: body.active, manualOverride: Boolean(clearExpiredEnd) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const column = body.field === "player1" ? "player_photo_1_url" : body.field === "player2" ? "player_photo_2_url" : null;
  if (!id || !column || typeof body.url !== "string" || !body.url.startsWith("/api/images/uploads%2F"))
    return Response.json({ error: "Foto member tidak valid" }, { status: 400 });
  const result = await env.DB.prepare(`UPDATE community_members SET ${column}=?,updated_at=? WHERE id=?`)
    .bind(body.url, new Date().toISOString(), id).run();
  if (!result.meta.changes) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
  await audit(admin.email, "UPDATE", "community_member", String(id), `Foto ${body.field}`);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await allowed(request);
  if (!admin)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  const row = await env.DB.prepare(
    "SELECT team_name AS teamName FROM community_members WHERE id=?",
  )
    .bind(id)
    .first<{ teamName: string }>();
  if (!row)
    return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
  await env.DB.prepare("DELETE FROM community_members WHERE id=?")
    .bind(id)
    .run();
  await audit(admin.email, "DELETE", "community_member", id, row.teamName);
  return Response.json({ ok: true });
}
