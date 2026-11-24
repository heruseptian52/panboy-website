export type RankedLiveTeam = {
  points: number;
  wwcd?: number;
  placementPoints?: number;
  overallElims?: number;
  lastPlacement?: number;
  slotNumber?: number;
  id?: number;
};

export function compareLiveTeams(a: RankedLiveTeam, b: RankedLiveTeam, tieBreak: string[] = []) {
  const points = Number(b.points || 0) - Number(a.points || 0);
  if (points) return points;
  for (const rule of tieBreak) {
    let difference = 0;
    if (rule === "wwcd") difference = Number(b.wwcd || 0) - Number(a.wwcd || 0);
    else if (rule === "placementPoints") difference = Number(b.placementPoints || 0) - Number(a.placementPoints || 0);
    else if (rule === "eliminations") difference = Number(b.overallElims || 0) - Number(a.overallElims || 0);
    else if (rule === "lastPlacement") difference = (Number(a.lastPlacement) || 999) - (Number(b.lastPlacement) || 999);
    if (difference) return difference;
  }
  return Number(a.slotNumber || a.id || 0) - Number(b.slotNumber || b.id || 0);
}
