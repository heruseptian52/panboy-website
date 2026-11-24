import type { RenderTeam } from "./leaderboard-render";

type SourceTeam = Pick<RenderTeam, "id" | "slotNumber" | "name" | "logoUrl">;
type SourceResult = { matchId: number; teamId: number; placement: number; eliminations: number; placementPoints: number; totalPoints: number };

export function rankLeaderboardTeams(teams: SourceTeam[], results: SourceResult[], matchId?: number): RenderTeam[] {
  return teams.map((team) => {
    const rows = results.filter((result) => result.teamId === team.id && (!matchId || result.matchId === matchId));
    return {
      ...team,
      matches: rows.length,
      wwcd: rows.filter((result) => result.placement === 1).length,
      kills: rows.reduce((total, result) => total + result.eliminations, 0),
      placementPoints: rows.reduce((total, result) => total + result.placementPoints, 0),
      total: rows.reduce((total, result) => total + result.totalPoints, 0),
    };
  }).filter((team) => !matchId || team.matches > 0).sort((a, b) =>
    b.total - a.total || b.wwcd - a.wwcd || b.placementPoints - a.placementPoints || b.kills - a.kills || a.slotNumber - b.slotNumber,
  );
}
