import { env } from "cloudflare:workers";
import { requireAnyPermission } from "../../../../lib/admin-auth";
import {readTemplateCatalog} from "../../../../lib/leaderboard-catalog";
import {roleDefault,stylePreset} from "../../../../lib/leaderboard-style";
import { audit } from "../../../../lib/audit";
import {
  DEFAULT_PLACEMENT,
  DEFAULT_TIE_BREAK,
  score,
  type PointRule,
} from "../../../../lib/point-system";
import { latestScoreboardResultsCte, saveScoreboardResult } from "../../../../lib/scoreboard-result-store";
const short = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
const clean = (v: unknown, n = 120) =>
  String(v ?? "")
    .trim()
    .slice(0, n);
async function access(id: number, email: string, owner: boolean) {
  return env.DB.prepare(
    `SELECT * FROM scoreboards WHERE id=?${owner ? "" : " AND owner_email=?"}`,
  )
    .bind(...(owner ? [id] : [id, email]))
    .first<Record<string, unknown>>();
}
async function rule(b: Record<string, unknown>): Promise<PointRule> {
  const x = b.point_system_id
    ? await env.DB.prepare("SELECT * FROM point_systems WHERE id=?")
        .bind(Number(b.point_system_id))
        .first<Record<string, unknown>>()
    : null;
  return x
    ? {
        id: Number(x.id),
        name: String(x.name),
        placement: JSON.parse(String(x.placement_json)),
        eliminationPoint: Number(x.elimination_point),
        tieBreak: JSON.parse(String(x.tie_break_json)),
        specialRules: String(x.special_rules || ""),
      }
    : {
        id: 0,
        name: "PUBG Mobile Current",
        placement: DEFAULT_PLACEMENT,
        eliminationPoint: 1,
        tieBreak: DEFAULT_TIE_BREAK,
        specialRules: "",
      };
}
async function recalculateBoard(board: Record<string, unknown>) {
  const activeRule = await rule(board), now = new Date().toISOString();
  const rows = await env.DB.prepare("SELECT sr.id,sr.placement,sr.eliminations FROM scoreboard_results sr JOIN scoreboard_matches sm ON sm.id=sr.match_id WHERE sm.scoreboard_id=? AND sr.calculation_mode='auto'").bind(Number(board.id)).all<{id:number;placement:number;eliminations:number}>();
  for (const row of rows.results) {
    const next = score(activeRule, Number(row.placement), Number(row.eliminations));
    await env.DB.prepare("UPDATE scoreboard_results SET placement_points=?,total_points=?,updated_at=? WHERE id=?").bind(next.placementPoints,next.totalPoints,now,row.id).run();
  }
}
export async function GET(r: Request) {
  const a = await requireAnyPermission(r, ["leaderboard", "leaderboardDesign", "liveObs"]);
  if (!a) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const id = Number(new URL(r.url).searchParams.get("id") || 0);
  if (!id) {
    const boards = await env.DB.prepare(
        `SELECT id,name,mode,owner_email AS ownerEmail,updated_at AS updatedAt FROM scoreboards${a.isOwner ? "" : " WHERE owner_email=?"} ORDER BY updated_at DESC`,
      )
        .bind(...(a.isOwner ? [] : [a.email]))
        .all(),
      systems = await env.DB.prepare(
        "SELECT id,name FROM point_systems WHERE archived=0 ORDER BY name",
      ).all();
    return Response.json({ boards: boards.results, systems: systems.results });
  }
  const board = await access(id, a.email, a.isOwner);
  if (!board)
    return Response.json(
      { error: "Kalkulator tidak ditemukan" },
      { status: 404 },
    );
  const [teams, matches, results, activeRule] = await Promise.all([
    env.DB.prepare(
      "SELECT id,slot_number AS slotNumber,name,logo_url AS logoUrl FROM scoreboard_teams WHERE scoreboard_id=? ORDER BY slot_number",
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      "SELECT id,match_number AS matchNumber,map_name AS mapName,status,result_locked AS resultLocked FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number",
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      `${latestScoreboardResultsCte} SELECT sr.match_id AS matchId,sr.team_id AS teamId,sr.placement,sr.eliminations,sr.placement_points AS placementPoints,sr.total_points AS totalPoints,sr.calculation_mode AS calculationMode,sr.manual_points AS manualPoints FROM latest_results sr JOIN scoreboard_matches sm ON sm.id=sr.match_id WHERE sm.scoreboard_id=?`,
    )
      .bind(id)
      .all(),
    rule(board),
  ]);
  return Response.json({
    board: {
      id: Number(board.id),
      name: String(board.name),
      mode: String(board.mode),
      pointSystemId: Number(board.point_system_id || 0),
      activeMatchId: Number(board.active_match_id || (matches.results.at(-1) as {id?:number}|undefined)?.id || 0),
    },
    teams: teams.results,
    matches: matches.results,
    results: results.results,
    rule: activeRule,
  });
}
export async function POST(r: Request) {
  const a = await requireAnyPermission(r, ["leaderboard", "leaderboardDesign", "liveObs"]);
  if (!a) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>,
    action = clean(b.action, 30),
    now = new Date().toISOString();
  if (action === "create") {
    const name = clean(b.name),
      mode = clean(b.mode, 10),
      items = Array.isArray(b.participants)
        ? b.participants
            .slice(0, 24)
            .map((x: any) => ({
              name: clean(x.name, 80),
              logoUrl: clean(x.logoUrl, 500),
            }))
            .filter((x) => x.name)
        : [];
    if (!name || !items.length || !["solo", "duo", "team"].includes(mode))
      return Response.json(
        { error: "Nama, mode, dan peserta wajib diisi" },
        { status: 400 },
      );
    const styleId=roleDefault(await readTemplateCatalog(),a.isOwner),initialLayout=styleId==="original"?{}:{styleId,design:stylePreset(styleId).design,backgroundMode:"transparent",followMaster:true};
    const x = await env.DB.prepare(
        "INSERT INTO scoreboards(name,mode,point_system_id,owner_email,created_at,updated_at,layout_json) VALUES(?,?,?,?,?,?,?)",
      )
        .bind(name, mode, Number(b.pointSystemId) || null, a.email, now, now,JSON.stringify(initialLayout))
        .run(),
      id = Number(x.meta.last_row_id);
    await env.DB.batch(
      items.map((t, i) =>
        env.DB.prepare(
          "INSERT INTO scoreboard_teams(scoreboard_id,slot_number,name,logo_url,created_at) VALUES(?,?,?,?,?)",
        ).bind(id, i + 3, t.name, t.logoUrl, now),
      ),
    );
    await audit(
      a.email,
      "scoreboard_create",
      "scoreboard",
      id,
      `${name} · ${items.length} peserta`,
    );
    return Response.json({ ok: true, id });
  }
  const id = Number(b.id),
    board = await access(id, a.email, a.isOwner);
  if (!board)
    return Response.json(
      { error: "Kalkulator tidak ditemukan" },
      { status: 404 },
    );
  let responseData:Record<string,unknown>={};
  if (action === "match") {
    const x = await env.DB.prepare(
      "SELECT COALESCE(MAX(match_number),0)+1 n FROM scoreboard_matches WHERE scoreboard_id=?",
    )
      .bind(id)
      .first<{ n: number }>();
    const created = await env.DB.prepare(
      "INSERT INTO scoreboard_matches(scoreboard_id,match_number,map_name,status,result_locked,created_at) VALUES(?,?,?,?,?,?)",
    )
      .bind(id, x?.n || 1, clean(b.mapName, 40), "active", 0, now)
      .run(), matchId = Number(created.meta.last_row_id);
    await env.DB.batch([
      env.DB.prepare("UPDATE scoreboard_matches SET status='completed' WHERE scoreboard_id=? AND id!=? AND status='active'").bind(id,matchId),
      env.DB.prepare("UPDATE scoreboards SET active_match_id=? WHERE id=?").bind(matchId,id),
    ]);
    const config = await env.DB.prepare("SELECT state_json FROM live_leaderboard_configs WHERE scoreboard_id=?").bind(id).first<{state_json:string}>();
    if(config){const parsed=JSON.parse(String(config.state_json||"{}")),reset=Object.fromEntries(Object.keys(parsed).map(teamId=>[teamId,{pointsAdjust:0,elimsAdjust:0,players:["alive","alive","alive","alive"]}]));await env.DB.prepare("UPDATE live_leaderboard_configs SET state_json=?,elimination_events_json='[]',match_epoch=match_epoch+1,updated_at=? WHERE scoreboard_id=?").bind(JSON.stringify(reset),now,id).run()}
  } else if (action === "matchEdit")
    await env.DB.prepare(
      "UPDATE scoreboard_matches SET match_number=?,map_name=? WHERE id=? AND scoreboard_id=?",
    )
      .bind(
        Math.max(1, Number(b.matchNumber)),
        clean(b.mapName, 40),
        Number(b.matchId),
        id,
      )
      .run();
  else if (action === "matchDelete") {
    await env.DB.prepare(
      "DELETE FROM scoreboard_matches WHERE id=? AND scoreboard_id=?",
    )
      .bind(Number(b.matchId), id)
      .run();
    const rows = await env.DB.prepare(
      "SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number,id",
    )
      .bind(id)
      .all<{ id: number }>();
    for (let i = 0; i < rows.results.length; i++)
      await env.DB.prepare(
        "UPDATE scoreboard_matches SET match_number=? WHERE id=?",
      )
        .bind(i + 1, rows.results[i].id)
        .run();
    const active = await env.DB.prepare("SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1").bind(id).first<{id:number}>();
    await env.DB.prepare("UPDATE scoreboards SET active_match_id=? WHERE id=?").bind(active?.id||null,id).run();
  } else if (action === "startMatch") {
    const matchId=Number(b.matchId),match=await env.DB.prepare("SELECT id FROM scoreboard_matches WHERE id=? AND scoreboard_id=?").bind(matchId,id).first();
    if(!match)return Response.json({error:"Match tidak ditemukan"},{status:404});
    await env.DB.batch([
      env.DB.prepare("UPDATE scoreboard_matches SET status='completed' WHERE scoreboard_id=? AND status='active'").bind(id),
      env.DB.prepare("UPDATE scoreboard_matches SET status='active',result_locked=0 WHERE id=?").bind(matchId),
      env.DB.prepare("UPDATE scoreboards SET active_match_id=? WHERE id=?").bind(matchId,id),
    ]);
    const config=await env.DB.prepare("SELECT state_json FROM live_leaderboard_configs WHERE scoreboard_id=?").bind(id).first<{state_json:string}>();
    if(config){const parsed=JSON.parse(String(config.state_json||"{}")),reset=Object.fromEntries(Object.keys(parsed).map(teamId=>[teamId,{pointsAdjust:0,elimsAdjust:0,players:["alive","alive","alive","alive"]}]));await env.DB.prepare("UPDATE live_leaderboard_configs SET state_json=?,elimination_events_json='[]',match_epoch=match_epoch+1,updated_at=? WHERE scoreboard_id=?").bind(JSON.stringify(reset),now,id).run()}
  } else if (action === "saveMatch" || action === "unlockMatch") {
    const locked=action==="saveMatch"?1:0,status=action==="saveMatch"?"completed":"active";
    await env.DB.prepare("UPDATE scoreboard_matches SET result_locked=?,status=? WHERE id=? AND scoreboard_id=?").bind(locked,status,Number(b.matchId),id).run();
  } else if (action === "pointSystem") {
    await env.DB.prepare("UPDATE scoreboards SET point_system_id=? WHERE id=?").bind(Number(b.pointSystemId)||null,id).run();
    const updated={...board,point_system_id:Number(b.pointSystemId)||null};
    await recalculateBoard(updated);
  } else if (action === "result") {
    const matchId = Number(b.matchId),
      teamId = Number(b.teamId),
      placement = Math.max(0, Math.min(24, Number(b.placement) || 0)),
      eliminations = Math.max(0, Math.min(999, Number(b.eliminations) || 0));
    if (!matchId || !teamId)
      return Response.json(
        { error: "Team dan match wajib dipilih" },
        { status: 400 },
      );
    const match=await env.DB.prepare("SELECT result_locked AS locked FROM scoreboard_matches WHERE id=? AND scoreboard_id=?").bind(matchId,id).first<{locked:number}>();
    if(!match)return Response.json({error:"Match tidak ditemukan"},{status:404});
    if(match.locked)return Response.json({error:"Match sudah dikunci. Buka kembali sebelum mengedit."},{status:409});
    const duplicate = placement>0 ? await env.DB.prepare(
      "SELECT team_id AS teamId FROM scoreboard_results WHERE match_id=? AND placement=? AND team_id!=?",
    )
      .bind(matchId, placement, teamId)
      .first<{ teamId: number }>() : null;
    if (duplicate)
      return Response.json(
        { error: `Rank ${placement} sudah dipakai team lain pada match ini.` },
        { status: 409 },
      );
    const s = score(await rule(board), placement, eliminations),
      calculationMode=b.calculationMode==="manual"?"manual":"auto",
      manualPoints=calculationMode==="manual"?Math.max(0,Number(b.manualPoints)||0):null;
    await saveScoreboardResult({matchId,teamId,placement,eliminations,placementPoints:s.placementPoints,totalPoints:s.totalPoints,calculationMode,manualPoints,updatedAt:now});
    responseData={result:{matchId,teamId,placement,eliminations,placementPoints:s.placementPoints,totalPoints:s.totalPoints,calculationMode,manualPoints,wwcd:placement===1}};
  } else if (action === "team")
    await env.DB.prepare(
      "UPDATE scoreboard_teams SET name=?,logo_url=? WHERE id=? AND scoreboard_id=?",
    )
      .bind(clean(b.name, 80), clean(b.logoUrl, 500), Number(b.teamId), id)
      .run();
  else if (action === "teamsReplace") {
    const items = Array.isArray(b.participants)
      ? b.participants
          .slice(0, 24)
          .map((x: any) => ({
            name: clean(x.name, 80),
            logoUrl: clean(x.logoUrl, 500),
          }))
          .filter((x) => x.name)
      : [];
    await env.DB.prepare("DELETE FROM scoreboard_teams WHERE scoreboard_id=?")
      .bind(id)
      .run();
    if (items.length)
      await env.DB.batch(
        items.map((t, i) =>
          env.DB.prepare(
            "INSERT INTO scoreboard_teams(scoreboard_id,slot_number,name,logo_url,created_at) VALUES(?,?,?,?,?)",
          ).bind(id, i + 3, t.name, t.logoUrl, now),
        ),
      );
  } else if (action === "delete") {
    await env.DB.prepare("DELETE FROM scoreboards WHERE id=?").bind(id).run();
    await audit(
      a.email,
      "scoreboard_delete",
      "scoreboard",
      id,
      String(board.name),
    );
    return Response.json({ ok: true });
  } else return Response.json({ error: "Aksi tidak valid" }, { status: 400 });
  await env.DB.prepare("UPDATE scoreboards SET updated_at=? WHERE id=?")
    .bind(now, id)
    .run();
  return Response.json({ ok: true,...responseData });
}
