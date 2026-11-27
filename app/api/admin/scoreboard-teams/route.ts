import { env } from "cloudflare:workers";
import { requireAnyPermission } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";

const clean = (value: unknown, max = 80) => String(value ?? "").trim().slice(0, max);
const shortName = (value: unknown) => clean(value, 4).toUpperCase().replace(/[^A-Z0-9]/g, "");

async function access(id: number, email: string, owner: boolean) {
  return env.DB.prepare(`SELECT id,name FROM scoreboards WHERE id=?${owner ? "" : " AND owner_email=?"}`)
    .bind(...(owner ? [id] : [id, email])).first<{ id: number; name: string }>();
}

export async function GET(request: Request) {
  const admin = await requireAnyPermission(request, ["leaderboard", "leaderboardDesign", "liveObs"]);
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id || !await access(id, admin.email, admin.isOwner))
    return Response.json({ error: "Leaderboard tidak ditemukan" }, { status: 404 });
  const teams = await env.DB.prepare("SELECT id,slot_number AS slotNumber,name,short_name AS shortName,logo_url AS logoUrl FROM scoreboard_teams WHERE scoreboard_id=? ORDER BY slot_number")
    .bind(id).all();
  return Response.json({ teams: teams.results });
}

export async function PUT(request: Request) {
  const admin = await requireAnyPermission(request, ["leaderboard", "leaderboardDesign", "liveObs"]);
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>, id = Number(body.id);
  const board = id && await access(id, admin.email, admin.isOwner);
  if (!board) return Response.json({ error: "Leaderboard tidak ditemukan" }, { status: 404 });
  const teamId = Number(body.teamId), name = clean(body.name), observer = shortName(body.shortName), logoUrl = clean(body.logoUrl, 500);
  if (!teamId || !name) return Response.json({ error: "Nama team wajib diisi" }, { status: 400 });
  if (observer && observer.length < 2)
    return Response.json({ error: "Short Name harus 2–4 huruf/angka" }, { status: 400 });
  await env.DB.prepare("UPDATE scoreboard_teams SET name=?,short_name=?,logo_url=? WHERE id=? AND scoreboard_id=?")
    .bind(name, observer, logoUrl, teamId, id).run();
  await env.DB.prepare("UPDATE scoreboards SET updated_at=? WHERE id=?").bind(new Date().toISOString(), id).run();
  return Response.json({ ok: true, shortName: observer });
}

export async function POST(request: Request) {
  const admin = await requireAnyPermission(request, ["leaderboard", "leaderboardDesign", "liveObs"]);
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = await request.json() as { id?: number; rows?: Array<Record<string, unknown>> }, id = Number(body.id);
  const board = id && await access(id, admin.email, admin.isOwner);
  if (!board) return Response.json({ error: "Leaderboard tidak ditemukan" }, { status: 404 });
  const incoming = Array.isArray(body.rows) ? body.rows.slice(0, 24) : [];
  if (!incoming.length) return Response.json({ error: "Tidak ada data untuk di-import" }, { status: 400 });
  const duplicateSlots = incoming.map((row) => Number(row.slot)).filter((slot, index, all) => all.indexOf(slot) !== index);
  if (duplicateSlots.length)
    return Response.json({ error: `Slot duplikat: ${[...new Set(duplicateSlots)].join(", ")}` }, { status: 400 });
  const available = await env.DB.prepare("SELECT id,slot_number AS slotNumber FROM scoreboard_teams WHERE scoreboard_id=?").bind(id).all<{ id: number; slotNumber: number }>();
  const bySlot = new Map(available.results.map((team) => [team.slotNumber, team.id]));
  let imported = 0, failed = 0;
  const statements = [];
  for (const row of incoming) {
    const slot = Number(row.slot), teamId = bySlot.get(slot), name = clean(row.name), observer = shortName(row.shortName);
    if (!teamId || !name || (observer.length > 0 && observer.length < 2)) { failed++; continue; }
    statements.push(env.DB.prepare("UPDATE scoreboard_teams SET name=?,short_name=? WHERE id=? AND scoreboard_id=?").bind(name, observer, teamId, id));
    imported++;
  }
  if (statements.length) await env.DB.batch(statements);
  await env.DB.prepare("UPDATE scoreboards SET updated_at=? WHERE id=?").bind(new Date().toISOString(), id).run();
  await audit(admin.email, "scoreboard_team_import", "scoreboard", id, `${imported} berhasil · ${failed} gagal`);
  return Response.json({ ok: true, imported, failed });
}
