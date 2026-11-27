import { env } from "cloudflare:workers";
import { requirePermission } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import { preserveLockedLeaderboard } from "../../../../lib/master-layout";
import {readTemplateCatalog} from "../../../../lib/leaderboard-catalog";
import {canChooseStyle,isStyleId,sanitizeDesign} from "../../../../lib/leaderboard-style";
import type { Layout } from "../../../../lib/leaderboard-render";
import { latestScoreboardResultsCte } from "../../../../lib/scoreboard-result-store";

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
async function allowed(id: number, email: string, owner: boolean) {
  return env.DB.prepare(`SELECT * FROM scoreboards WHERE id=?${owner ? "" : " AND owner_email=?"}`)
    .bind(...(owner ? [id] : [id, email])).first<Record<string, unknown>>();
}

export async function GET(request: Request) {
  const admin = await requirePermission(request, "leaderboardDesign");
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id")), board = await allowed(id, admin.email, admin.isOwner);
  if (!board) return Response.json({ error: "Leaderboard tidak ditemukan" }, { status: 404 });
  if (!board.overlay_token) {
    const token = crypto.randomUUID().replaceAll("-", "");
    await env.DB.prepare("UPDATE scoreboards SET overlay_token=? WHERE id=?").bind(token, id).run();
    board.overlay_token = token;
  }
  const [teams, matches, results] = await Promise.all([
    env.DB.prepare("SELECT id,slot_number AS slotNumber,name,logo_url AS logoUrl FROM scoreboard_teams WHERE scoreboard_id=? ORDER BY slot_number").bind(id).all(),
    env.DB.prepare("SELECT id,match_number AS matchNumber,map_name AS mapName FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number").bind(id).all(),
    env.DB.prepare(`${latestScoreboardResultsCte} SELECT sr.match_id AS matchId,sr.team_id AS teamId,sr.placement,sr.eliminations,sr.placement_points AS placementPoints,sr.total_points AS totalPoints FROM latest_results sr JOIN scoreboard_matches sm ON sm.id=sr.match_id WHERE sm.scoreboard_id=?`).bind(id).all(),
  ]);
  const stored = JSON.parse(String(board.layout_json || "{}")) as Layout, layout = preserveLockedLeaderboard(stored, stored);
  if (!layout.lockedVariant && typeof layout.followMaster !== "boolean") layout.followMaster = true;
  return Response.json({ board: { id, name: board.name, mode: board.mode, templateUrl: board.template_url, canvasWidth: board.canvas_width, canvasHeight: board.canvas_height, layout, overlayToken: board.overlay_token }, teams: teams.results, matches: matches.results, results: results.results });
}

export async function POST(request: Request) {
  const admin = await requirePermission(request, "leaderboardDesign");
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>, id = Number(body.id), board = await allowed(id, admin.email, admin.isOwner);
  if (!board) return Response.json({ error: "Leaderboard tidak ditemukan" }, { status: 404 });
  const current = JSON.parse(String(board.layout_json || "{}")) as Layout, requested = typeof body.layout === "object" && body.layout ? body.layout as Layout : {}, layout = preserveLockedLeaderboard(requested, current), width = Math.min(6000, Math.max(320, Number(body.canvasWidth) || 1920)), height = Math.min(6000, Math.max(320, Number(body.canvasHeight) || 1080));
  const existingStyle=isStyleId(current.styleId)?current.styleId:"original",chosen=layout.styleId??existingStyle;
  if(!canChooseStyle(await readTemplateCatalog(),admin.isOwner,chosen,existingStyle))return Response.json({error:"Template ini disembunyikan untuk akses Anda."},{status:403});
  if(layout.styleId||current.styleId){if(!requested.styleId&&current.design)layout.design=current.design;layout.styleId=chosen;if(layout.design||chosen!=="original")layout.design=sanitizeDesign(layout.design,chosen)}
  await env.DB.prepare("UPDATE scoreboards SET template_url=?,canvas_width=?,canvas_height=?,layout_json=?,updated_at=? WHERE id=?")
    .bind(clean(body.templateUrl), width, height, JSON.stringify(layout).slice(0, 20000), new Date().toISOString(), id).run();
  await audit(admin.email, "leaderboard_template_edit", "scoreboard", id, `Template ${width}x${height}`);
  return Response.json({ ok: true, lockedVariant: layout.lockedVariant || null });
}
