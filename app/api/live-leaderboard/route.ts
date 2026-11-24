import { env } from "cloudflare:workers";
import { baseTemplate, cleanTemplate, freshState } from "../../../lib/live-leaderboard";
import { visibleLivePoints } from "../../../lib/scoreboard-match";
import { latestScoreboardResultsCte } from "../../../lib/scoreboard-result-store";
import { ruleForScoreboard } from "../../../lib/point-system";
import { compareLiveTeams } from "../../../lib/live-ranking";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (token.length < 40) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  const config = await env.DB.prepare("SELECT * FROM live_leaderboard_configs WHERE overlay_token=?").bind(token).first<Record<string, any>>();
  if (!config) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  const board=await env.DB.prepare("SELECT active_match_id FROM scoreboards WHERE id=?").bind(config.scoreboard_id).first<{active_match_id:number|null}>(),activeMatch=await env.DB.prepare("SELECT id,match_number AS matchNumber FROM scoreboard_matches WHERE scoreboard_id=? AND id=COALESCE(?,(SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1))").bind(config.scoreboard_id,board?.active_match_id||null,config.scoreboard_id).first<Record<string,any>>(),activeId=Number(activeMatch?.id||0),activeNumber=Number(activeMatch?.matchNumber||0);
  const [teams, totals, pointRule] = await Promise.all([
    env.DB.prepare("SELECT id,slot_number AS slotNumber,name,short_name AS shortName,logo_url AS logoUrl FROM scoreboard_teams WHERE scoreboard_id=? ORDER BY slot_number").bind(config.scoreboard_id).all<Record<string, any>>(),
    env.DB.prepare(`${latestScoreboardResultsCte} SELECT sr.team_id AS teamId,SUM(CASE WHEN sm.match_number<=? THEN CASE WHEN sr.calculation_mode='manual' AND sr.manual_points IS NOT NULL THEN sr.manual_points ELSE sr.total_points END ELSE 0 END) AS points,MAX(CASE WHEN sm.id=? THEN sr.eliminations ELSE 0 END) AS elims,MAX(CASE WHEN sm.id=? THEN sr.placement_points ELSE 0 END) AS activePlacementPoints,MAX(CASE WHEN sm.id=? THEN sr.placement ELSE 0 END) AS activePlacement,SUM(CASE WHEN sm.match_number<=? THEN sr.eliminations ELSE 0 END) AS overallElims,SUM(CASE WHEN sm.match_number<=? AND sr.placement=1 THEN 1 ELSE 0 END) AS wwcd,SUM(CASE WHEN sm.match_number<=? THEN sr.placement_points ELSE 0 END) AS placementPoints,CAST(substr(MAX(CASE WHEN sm.match_number<=? AND sr.placement>0 THEN printf('%06d:%06d',sm.match_number,sr.placement) END),8) AS INTEGER) AS lastPlacement FROM latest_results sr JOIN scoreboard_matches sm ON sm.id=sr.match_id WHERE sm.scoreboard_id=? GROUP BY sr.team_id`).bind(activeNumber,activeId,activeId,activeId,activeNumber,activeNumber,activeNumber,activeNumber,config.scoreboard_id).all<Record<string, any>>(),
    ruleForScoreboard(Number(config.scoreboard_id)),
  ]);
  const templates = JSON.parse(String(config.templates_json || "[]")), template = cleanTemplate(templates.find((item: any) => item.id === config.active_template_id) || templates[0] || baseTemplate), state = JSON.parse(String(config.state_json || "{}")), totalMap = new Map(totals.results.map((item) => [Number(item.teamId), item]));
  let allRows = teams.results.map((team) => { const live = state[team.id] || freshState(), base = totalMap.get(Number(team.id)) || {},players=live.players || freshState().players,isAlive=players.some((player:string)=>player!=="eliminated"),points=visibleLivePoints(Number(base.points||0),Number(base.activePlacementPoints||0),isAlive,Number(base.activePlacement||0)); return { ...team, points, elims: Number(base.elims || 0), overallElims:Number(base.overallElims||0),wwcd:Number(base.wwcd||0),placementPoints:Number(base.placementPoints||0),lastPlacement:Number(base.lastPlacement||0), players }; }).sort((a, b) => compareLiveTeams(a,b,pointRule.tieBreak)).map((item, index) => ({ ...item, rank: index + 1 })), rows = allRows;
  if (config.display_limit !== "all") rows = rows.slice(0, Number(config.display_limit));
  const byId = new Map(allRows.map((item) => [Number(item.id), item])), rawEvents = JSON.parse(String(config.elimination_events_json || "[]")) as any[], winnerHidden = rawEvents.some((event) => event.kind === "hideWinner" && Number(event.epoch) === Number(config.match_epoch)), events = rawEvents.filter((event) => event.kind !== "hideWinner").map((event) => ({ ...event, team: byId.get(Number(event.teamId)) })).filter((event) => event.team);
  return Response.json({ template, rows, allRows, events, winnerHidden, matchEpoch: Number(config.match_epoch), activeMatch, side: config.side, showLegend: Boolean(config.show_legend), updatedAt: config.updated_at });
}
