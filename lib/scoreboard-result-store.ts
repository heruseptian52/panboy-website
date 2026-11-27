import { env } from "cloudflare:workers";

export const latestScoreboardResultsCte = `WITH latest_results AS (
  SELECT * FROM (
    SELECT sr.*,ROW_NUMBER() OVER (
      PARTITION BY sr.match_id,sr.team_id
      ORDER BY sr.updated_at DESC,sr.id DESC
    ) AS result_order
    FROM scoreboard_results sr
  ) WHERE result_order=1
)`;

export type StoredScoreboardResult = {
  id: number;
  placement: number;
  eliminations: number;
  calculationMode: string;
  manualPoints: number | null;
};

export async function latestScoreboardResult(matchId:number,teamId:number) {
  return env.DB.prepare("SELECT id,placement,eliminations,calculation_mode AS calculationMode,manual_points AS manualPoints FROM scoreboard_results WHERE match_id=? AND team_id=? ORDER BY updated_at DESC,id DESC LIMIT 1")
    .bind(matchId,teamId).first<StoredScoreboardResult>();
}

export async function saveScoreboardResult(input:{matchId:number;teamId:number;placement:number;eliminations:number;placementPoints:number;totalPoints:number;calculationMode:string;manualPoints:number|null;updatedAt:string}) {
  const x=input;
  await env.DB.prepare("INSERT INTO scoreboard_results(match_id,team_id,placement,eliminations,placement_points,total_points,calculation_mode,manual_points,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM scoreboard_results WHERE match_id=? AND team_id=?)")
    .bind(x.matchId,x.teamId,x.placement,x.eliminations,x.placementPoints,x.totalPoints,x.calculationMode,x.manualPoints,x.updatedAt,x.matchId,x.teamId).run();
  const rows=await env.DB.prepare("SELECT id FROM scoreboard_results WHERE match_id=? AND team_id=? ORDER BY updated_at DESC,id DESC").bind(x.matchId,x.teamId).all<{id:number}>(),canonical=rows.results[0];
  if(!canonical)throw new Error("Hasil match tidak dapat disimpan");
  await env.DB.prepare("UPDATE scoreboard_results SET placement=?,eliminations=?,placement_points=?,total_points=?,calculation_mode=?,manual_points=?,updated_at=? WHERE id=?").bind(x.placement,x.eliminations,x.placementPoints,x.totalPoints,x.calculationMode,x.manualPoints,x.updatedAt,canonical.id).run();
  return canonical.id;
}
