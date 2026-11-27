type PointRule = { placement:Record<string,number>; eliminationPoint:number };

export type MatchScore = {
  placement: number;
  eliminations: number;
  placementPoints: number;
  eliminationPoints: number;
  totalPoints: number;
  calculationMode?: string;
  manualPoints?: number | null;
};

export function effectivePoints(result: MatchScore) {
  return result.calculationMode === "manual" && result.manualPoints != null
    ? Number(result.manualPoints)
    : Number(result.totalPoints);
}

export function calculateMatchScore(rule: PointRule, placement: number, eliminations: number) {
  const safePlacement=Math.max(0,placement),safeEliminations=Math.max(0,eliminations),placementPoints=Number(rule.placement[String(safePlacement)]||0),eliminationPoints=safeEliminations*Number(rule.eliminationPoint||0);
  return {placementPoints,eliminationPoints,totalPoints:placementPoints+eliminationPoints};
}

export function visibleLivePoints(points: number, activePlacementPoints: number, isAlive: boolean, activePlacement = 0) {
  return Number(points) - (isAlive && Number(activePlacement) !== 1 ? Number(activePlacementPoints) : 0);
}

export function liveTotals(
  results: Array<MatchScore & { matchNumber: number }>,
  activeMatchNumber: number,
) {
  const included = results.filter((result) => result.matchNumber <= activeMatchNumber);
  const current = included.find((result) => result.matchNumber === activeMatchNumber);
  return {
    points: included.reduce((total, result) => total + effectivePoints(result), 0),
    elims: current ? Number(current.eliminations) : 0,
    overallElims: included.reduce((total, result) => total + Number(result.eliminations), 0),
  };
}
