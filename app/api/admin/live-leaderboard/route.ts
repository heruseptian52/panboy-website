import { env } from "cloudflare:workers";
import { requirePermission } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import {
  baseTemplate,
  cleanTemplate,
  defaultTemplates,
  freshState,
  type PlayerStatus,
  type TeamLiveState,
} from "../../../../lib/live-leaderboard";
import { ruleForScoreboard, score } from "../../../../lib/point-system";
import { visibleLivePoints } from "../../../../lib/scoreboard-match";
import { latestScoreboardResult, latestScoreboardResultsCte, saveScoreboardResult } from "../../../../lib/scoreboard-result-store";
async function boardAccess(id: number, email: string, owner: boolean) {
  return env.DB.prepare(
    `SELECT * FROM scoreboards WHERE id=?${owner ? "" : " AND owner_email=?"}`,
  )
    .bind(...(owner ? [id] : [id, email]))
    .first<Record<string, unknown>>();
}
async function ensure(id: number) {
  let c = await env.DB.prepare(
    "SELECT * FROM live_leaderboard_configs WHERE scoreboard_id=?",
  )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!c) {
    const token =
      crypto.randomUUID().replaceAll("-", "") +
      crypto.randomUUID().replaceAll("-", "");
    await env.DB.prepare(
      "INSERT INTO live_leaderboard_configs(scoreboard_id,overlay_token,active_template_id,templates_json,state_json,display_limit,side,show_legend,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        token,
        "pubg-style",
        JSON.stringify(defaultTemplates),
        "{}",
        "all",
        "right",
        1,
        new Date().toISOString(),
      )
      .run();
    c = await env.DB.prepare(
      "SELECT * FROM live_leaderboard_configs WHERE scoreboard_id=?",
    )
      .bind(id)
      .first<Record<string, unknown>>();
  }
  return c!;
}
const validStatus = new Set<PlayerStatus>(["alive", "knocked", "eliminated"]);
function stateClean(x: unknown) {
  const out: Record<string, TeamLiveState> = {};
  if (!x || typeof x !== "object") return out;
  for (const [id, v] of Object.entries(x as Record<string, any>).slice(0, 24)) {
    const d = freshState(),
      p = Array.isArray(v.players) ? v.players.slice(0, 4) : d.players;
    out[String(Number(id))] = {
      pointsAdjust: Math.max(-999, Math.min(999, Number(v.pointsAdjust) || 0)),
      elimsAdjust: Math.max(-99, Math.min(99, Number(v.elimsAdjust) || 0)),
      players: [0, 1, 2, 3].map((i) =>
        validStatus.has(p[i]) ? p[i] : "alive",
      ) as TeamLiveState["players"],
    };
  }
  return out;
}
export async function GET(r: Request) {
  const a = await requirePermission(r, "liveObs");
  if (!a) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const id = Number(new URL(r.url).searchParams.get("id"));
  const b = await boardAccess(id, a.email, a.isOwner);
  if (!b)
    return Response.json(
      { error: "Leaderboard tidak ditemukan" },
      { status: 404 },
    );
  const c = await ensure(id), activeMatch = await env.DB.prepare("SELECT id,match_number AS matchNumber,status,result_locked AS resultLocked FROM scoreboard_matches WHERE scoreboard_id=? AND id=COALESCE(?,(SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1))").bind(id,Number(b.active_match_id)||null,id).first<Record<string,unknown>>(), activeId=Number(activeMatch?.id||0), activeNumber=Number(activeMatch?.matchNumber||0),pointRule=await ruleForScoreboard(id);
  const
    [teams, totals] = await Promise.all([
      env.DB.prepare(
        "SELECT id,slot_number AS slotNumber,name,logo_url AS logoUrl FROM scoreboard_teams WHERE scoreboard_id=? ORDER BY slot_number",
      )
        .bind(id)
        .all(),
      env.DB.prepare(
        `${latestScoreboardResultsCte} SELECT sr.team_id AS teamId,SUM(CASE WHEN sm.match_number<=? THEN CASE WHEN sr.calculation_mode='manual' AND sr.manual_points IS NOT NULL THEN sr.manual_points ELSE sr.total_points END ELSE 0 END) AS points,MAX(CASE WHEN sm.id=? THEN sr.eliminations ELSE 0 END) AS elims,MAX(CASE WHEN sm.id=? THEN sr.placement_points ELSE 0 END) AS activePlacementPoints,MAX(CASE WHEN sm.id=? THEN sr.placement ELSE 0 END) AS activePlacement,SUM(CASE WHEN sm.match_number<=? THEN sr.eliminations ELSE 0 END) AS overallElims,MAX(CASE WHEN sm.id=? AND sr.calculation_mode='manual' THEN 1 ELSE 0 END) AS manual,SUM(CASE WHEN sm.match_number<=? AND sr.placement=1 THEN 1 ELSE 0 END) AS wwcd,SUM(CASE WHEN sm.match_number<=? THEN sr.placement_points ELSE 0 END) AS placementPoints,CAST(substr(MAX(CASE WHEN sm.match_number<=? AND sr.placement>0 THEN printf('%06d:%06d',sm.match_number,sr.placement) END),8) AS INTEGER) AS lastPlacement FROM latest_results sr JOIN scoreboard_matches sm ON sm.id=sr.match_id WHERE sm.scoreboard_id=? GROUP BY sr.team_id`,
      )
        .bind(activeNumber,activeId,activeId,activeId,activeNumber,activeId,activeNumber,activeNumber,activeNumber,id)
        .all(),
    ]),
    events = JSON.parse(String(c.elimination_events_json || "[]")) as any[],
    winnerHidden = events.some(
      (event) =>
        event.kind === "hideWinner" &&
        Number(event.epoch) === Number(c.match_epoch),
    );
  const liveState=stateClean(JSON.parse(String(c.state_json||"{}"))),liveTotals=totals.results.map((row:any)=>{const team=liveState[String(Number(row.teamId))]||freshState(),isAlive=team.players.some(player=>player!=="eliminated");return{...row,points:visibleLivePoints(Number(row.points||0),Number(row.activePlacementPoints||0),isAlive,Number(row.activePlacement||0))}});
  return Response.json({
    board: { id, name: b.name },
    teams: teams.results,
    totals: liveTotals,
    config: {
      activeTemplateId: c.active_template_id,
      templates: JSON.parse(String(c.templates_json || "[]")),
      state: JSON.parse(String(c.state_json || "{}")),
      displayLimit: c.display_limit,
      side: c.side,
      showLegend: Boolean(c.show_legend),
      overlayToken: c.overlay_token,
      winnerHidden,
      activeMatch,
      rankingTieBreak: pointRule.tieBreak,
    },
  });
}
export async function PUT(r: Request) {
  const a = await requirePermission(r, "liveObs");
  if (!a) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = (await r.json()) as Record<string, any>,
    id = Number(body.id),
    b = await boardAccess(id, a.email, a.isOwner);
  if (!b)
    return Response.json(
      { error: "Leaderboard tidak ditemukan" },
      { status: 404 },
    );
  const current = await ensure(id);
  if(body.action === "updateTeamState"){
    const teamId=Number(body.teamId),known=await env.DB.prepare("SELECT id FROM scoreboard_teams WHERE scoreboard_id=? AND id=?").bind(id,teamId).first<{id:number}>();
    if(!known)return Response.json({error:"Team tidak ditemukan."},{status:404});
    const oldState=stateClean(JSON.parse(String(current.state_json||"{}"))),oldTeam=oldState[String(teamId)]||freshState(),cleaned=stateClean({[teamId]:{...oldTeam,players:body.players}})[String(teamId)]||oldTeam,nextState={...oldState,[teamId]:cleaned},wasAlive=oldTeam.players.some(x=>x!=="eliminated"),isAlive=cleaned.players.some(x=>x!=="eliminated"),epoch=Number(current.match_epoch),events=JSON.parse(String(current.elimination_events_json||"[]")) as any[];
    let activeId=Number(b.active_match_id||0);if(!activeId){const latest=await env.DB.prepare("SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1").bind(id).first<{id:number}>();activeId=Number(latest?.id||0)}
    const teamIds=(await env.DB.prepare("SELECT id FROM scoreboard_teams WHERE scoreboard_id=?").bind(id).all<{id:number}>()).results,remainingBefore=teamIds.filter(x=>(oldState[String(x.id)]||freshState()).players.some(player=>player!=="eliminated")).length;
    if(wasAlive&&!isAlive)events.push({id:`${epoch}-${teamId}-${Date.now()}-${events.length}`,teamId,placement:remainingBefore,epoch,at:Date.now()});
    const now=new Date().toISOString(),kept=events.slice(-50);
    await env.DB.prepare("UPDATE live_leaderboard_configs SET state_json=?,elimination_events_json=?,updated_at=? WHERE scoreboard_id=?").bind(JSON.stringify(nextState),JSON.stringify(kept),now,id).run();
    let winnerResult:Record<string,unknown>|null=null;
    if(activeId&&wasAlive!==isAlive){
      const rule=await ruleForScoreboard(id),saved=await latestScoreboardResult(activeId,teamId),eliminations=Number(saved?.eliminations||0),placement=isAlive?0:remainingBefore,calculated=score(rule,placement,eliminations);
      await saveScoreboardResult({matchId:activeId,teamId,placement,eliminations,placementPoints:calculated.placementPoints,totalPoints:calculated.totalPoints,calculationMode:"auto",manualPoints:null,updatedAt:now});
      const remainingAfter=teamIds.filter(x=>(nextState[String(x.id)]||freshState()).players.some(player=>player!=="eliminated")).length;
      if(remainingAfter===1){const winner=teamIds.find(x=>(nextState[String(x.id)]||freshState()).players.some(player=>player!=="eliminated"));if(winner){const winnerSaved=await latestScoreboardResult(activeId,winner.id),winnerElims=Number(winnerSaved?.eliminations||0),winnerScore=score(rule,1,winnerElims);await saveScoreboardResult({matchId:activeId,teamId:winner.id,placement:1,eliminations:winnerElims,placementPoints:winnerScore.placementPoints,totalPoints:winnerScore.totalPoints,calculationMode:"auto",manualPoints:null,updatedAt:now});winnerResult={matchId:activeId,teamId:winner.id,placement:1,eliminations:winnerElims,placementPoints:winnerScore.placementPoints,totalPoints:winnerScore.totalPoints,calculationMode:"auto",manualPoints:null}}}
    }
    await audit(a.email,"live_team_state","scoreboard",id,`${teamId}:${cleaned.players.join(",")}`);
    return Response.json({ok:true,teamId,players:cleaned.players,winnerResult,updatedAt:now});
  }
  if(body.action === "adjustScore"){
    let activeId=Number(b.active_match_id||0);
    if(!activeId){const latest=await env.DB.prepare("SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1").bind(id).first<{id:number}>();activeId=Number(latest?.id||0)}
    if(!activeId)return Response.json({error:"Buat atau mulai match terlebih dahulu."},{status:409});
    if(body.field!=="elims")return Response.json({error:"PTS dihitung otomatis dari Kill + Placement. Edit Kill atau Placement untuk mengoreksi PTS."},{status:400});
    const teamId=Number(body.teamId),rawDelta=Math.trunc(Number(body.delta)||0),delta=Math.max(-99,Math.min(99,rawDelta));
    if(!teamId||!delta)return Response.json({error:"Perubahan eliminasi tidak valid."},{status:400});
    const existing=await latestScoreboardResult(activeId,teamId),placement=Number(existing?.placement||0),oldElims=Number(existing?.eliminations||0),rule=await ruleForScoreboard(id);
    const eliminations=Math.max(0,oldElims+delta),mode="auto",manualPoints=null;
    const calculated=score(rule,placement,eliminations),now=new Date().toISOString();
    await saveScoreboardResult({matchId:activeId,teamId,placement,eliminations,placementPoints:calculated.placementPoints,totalPoints:calculated.totalPoints,calculationMode:mode,manualPoints,updatedAt:now});
    const activeMatch=await env.DB.prepare("SELECT match_number AS matchNumber FROM scoreboard_matches WHERE id=? AND scoreboard_id=?").bind(activeId,id).first<{matchNumber:number}>(),activeNumber=Number(activeMatch?.matchNumber||0),aggregate=await env.DB.prepare(`${latestScoreboardResultsCte} SELECT sr.team_id AS teamId,SUM(CASE WHEN sm.match_number<=? THEN CASE WHEN sr.calculation_mode='manual' AND sr.manual_points IS NOT NULL THEN sr.manual_points ELSE sr.total_points END ELSE 0 END) AS points,MAX(CASE WHEN sm.id=? THEN sr.eliminations ELSE 0 END) AS elims,MAX(CASE WHEN sm.id=? THEN sr.placement_points ELSE 0 END) AS activePlacementPoints,SUM(CASE WHEN sm.match_number<=? THEN sr.eliminations ELSE 0 END) AS overallElims FROM latest_results sr JOIN scoreboard_matches sm ON sm.id=sr.match_id WHERE sm.scoreboard_id=? AND sr.team_id=? GROUP BY sr.team_id`).bind(activeNumber,activeId,activeId,activeNumber,id,teamId).first<Record<string,unknown>>();
    const liveState=stateClean(JSON.parse(String(current.state_json||"{}"))),teamState=liveState[String(teamId)]||freshState(),isAlive=teamState.players.some(player=>player!=="eliminated"),team={...aggregate,teamId,points:visibleLivePoints(Number(aggregate?.points||0),Number(aggregate?.activePlacementPoints||0),isAlive),elims:Number(aggregate?.elims||0),overallElims:Number(aggregate?.overallElims||0)};
    return Response.json({ok:true,team});
  }
  if(body.action === "nextMatch"){
    const next=await env.DB.prepare("SELECT COALESCE(MAX(match_number),0)+1 AS n FROM scoreboard_matches WHERE scoreboard_id=?").bind(id).first<{n:number}>(),now=new Date().toISOString(),created=await env.DB.prepare("INSERT INTO scoreboard_matches(scoreboard_id,match_number,map_name,status,result_locked,created_at) VALUES(?,?,?,?,?,?)").bind(id,next?.n||1,"","active",0,now).run(),matchId=Number(created.meta.last_row_id),ids=await env.DB.prepare("SELECT id FROM scoreboard_teams WHERE scoreboard_id=?").bind(id).all<{id:number}>(),reset=Object.fromEntries(ids.results.map(x=>[x.id,freshState()]));
    await env.DB.batch([env.DB.prepare("UPDATE scoreboard_matches SET status='completed' WHERE scoreboard_id=? AND id!=? AND status='active'").bind(id,matchId),env.DB.prepare("UPDATE scoreboards SET active_match_id=?,updated_at=? WHERE id=?").bind(matchId,now,id),env.DB.prepare("UPDATE live_leaderboard_configs SET state_json=?,elimination_events_json='[]',match_epoch=match_epoch+1,updated_at=? WHERE scoreboard_id=?").bind(JSON.stringify(reset),now,id)]);
    await audit(a.email,"live_next_match","scoreboard",id,`Match ${next?.n||1}`);
    return Response.json({ok:true,matchId,matchNumber:next?.n||1});
  }
  if (body.action === "resetMatch") {
    const ids = await env.DB.prepare(
        "SELECT id FROM scoreboard_teams WHERE scoreboard_id=?",
      )
        .bind(id)
        .all<{ id: number }>(),
      reset = Object.fromEntries(ids.results.map((x) => [x.id, freshState()]));
    let activeId=Number(b.active_match_id||0);
    if(!activeId){const latest=await env.DB.prepare("SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1").bind(id).first<{id:number}>();activeId=Number(latest?.id||0)}
    const resetNow=new Date().toISOString(),statements=[env.DB.prepare("UPDATE live_leaderboard_configs SET state_json=?,elimination_events_json='[]',match_epoch=match_epoch+1,updated_at=? WHERE scoreboard_id=?").bind(JSON.stringify(reset),resetNow,id)];
    if(activeId)statements.push(env.DB.prepare("UPDATE scoreboard_results SET placement=0,eliminations=0,placement_points=0,total_points=0,calculation_mode='auto',manual_points=NULL,updated_at=? WHERE match_id=?").bind(resetNow,activeId));
    await env.DB.batch(statements);
    await audit(a.email, "live_match_reset", "scoreboard", id, String(b.name));
    return Response.json({ ok: true, reset: true });
  }
  if (body.action === "hideWinner") {
    const events = JSON.parse(
        String(current.elimination_events_json || "[]"),
      ) as any[],
      epoch = Number(current.match_epoch);
    if (
      !events.some(
        (event) => event.kind === "hideWinner" && Number(event.epoch) === epoch,
      )
    )
      events.push({
        id: `hide-winner-${epoch}`,
        kind: "hideWinner",
        epoch,
        at: Date.now(),
      });
    await env.DB.prepare(
      "UPDATE live_leaderboard_configs SET elimination_events_json=?,updated_at=? WHERE scoreboard_id=?",
    )
      .bind(JSON.stringify(events.slice(-50)), new Date().toISOString(), id)
      .run();
    await audit(a.email, "live_winner_hide", "scoreboard", id, String(b.name));
    return Response.json({ ok: true, winnerHidden: true });
  }
  const templates = (
      Array.isArray(body.templates) ? body.templates : defaultTemplates
    )
      .slice(0, 20)
      .map((x: any) => cleanTemplate(x, baseTemplate)),
    active = String(body.activeTemplateId || templates[0]?.id || "pubg-style"),
    limit = ["8", "10", "16", "all"].includes(String(body.displayLimit))
      ? String(body.displayLimit)
      : "all",
    side = body.side === "left" ? "left" : "right",
    legend = body.showLegend === false ? 0 : 1,
    state = stateClean(body.state),
    oldState = stateClean(JSON.parse(String(current.state_json || "{}"))),
    teamIds = (
      await env.DB.prepare(
        "SELECT id FROM scoreboard_teams WHERE scoreboard_id=?",
      )
        .bind(id)
        .all<{ id: number }>()
    ).results,
    alive = (s: TeamLiveState | undefined) =>
      (s || freshState()).players.some((x) => x !== "eliminated"),
    events = JSON.parse(
      String(current.elimination_events_json || "[]"),
    ) as any[];
  let remaining = teamIds.filter((x) => alive(oldState[x.id])).length;
  let activeMatchId=Number(b.active_match_id||0);
  if(!activeMatchId){const latest=await env.DB.prepare("SELECT id FROM scoreboard_matches WHERE scoreboard_id=? ORDER BY match_number DESC,id DESC LIMIT 1").bind(id).first<{id:number}>();activeMatchId=Number(latest?.id||0)}
  const activeRule=await ruleForScoreboard(id),scoreNow=new Date().toISOString();
  for (const x of teamIds) {
    if (!alive(oldState[x.id]) && alive(state[x.id]) && activeMatchId) {
      const saved=await latestScoreboardResult(activeMatchId,x.id);
      if(saved){const eliminations=Number(saved.eliminations||0),calculated=score(activeRule,0,eliminations);await saveScoreboardResult({matchId:activeMatchId,teamId:x.id,placement:0,eliminations,placementPoints:0,totalPoints:calculated.totalPoints,calculationMode:"auto",manualPoints:null,updatedAt:scoreNow})}
    }
    if (alive(oldState[x.id]) && !alive(state[x.id])) {
      events.push({
        id: `${current.match_epoch}-${x.id}-${Date.now()}-${events.length}`,
        teamId: x.id,
        placement: remaining,
        epoch: Number(current.match_epoch),
        at: Date.now(),
      });
      if(activeMatchId){const saved=await latestScoreboardResult(activeMatchId,x.id),eliminations=Number(saved?.eliminations||0),calculated=score(activeRule,remaining,eliminations);await saveScoreboardResult({matchId:activeMatchId,teamId:x.id,placement:remaining,eliminations,placementPoints:calculated.placementPoints,totalPoints:calculated.totalPoints,calculationMode:"auto",manualPoints:null,updatedAt:scoreNow})}
      remaining--;
    }
  }
  if(remaining===1&&activeMatchId){const winner=teamIds.find(x=>alive(state[x.id]));if(winner){const saved=await latestScoreboardResult(activeMatchId,winner.id);if(Number(saved?.placement||0)!==1){const eliminations=Number(saved?.eliminations||0),calculated=score(activeRule,1,eliminations);await saveScoreboardResult({matchId:activeMatchId,teamId:winner.id,placement:1,eliminations,placementPoints:calculated.placementPoints,totalPoints:calculated.totalPoints,calculationMode:"auto",manualPoints:null,updatedAt:scoreNow})}}}
  const kept = events.slice(-50);
  await env.DB.prepare(
    "UPDATE live_leaderboard_configs SET active_template_id=?,templates_json=?,state_json=?,elimination_events_json=?,display_limit=?,side=?,show_legend=?,updated_at=? WHERE scoreboard_id=?",
  )
    .bind(
      active,
      JSON.stringify(templates),
      JSON.stringify(state),
      JSON.stringify(kept),
      limit,
      side,
      legend,
      new Date().toISOString(),
      id,
    )
    .run();
  await audit(
    a.email,
    "live_leaderboard_update",
    "scoreboard",
    id,
    String(b.name),
  );
  return Response.json({
    ok: true,
    events: kept.slice(events.length - kept.length),
  });
}
