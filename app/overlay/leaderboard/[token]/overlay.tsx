"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { drawLeaderboard, type RenderTeam } from "../../../../lib/leaderboard-render";
import { rankLeaderboardTeams } from "../../../../lib/leaderboard-ranking";

export default function Overlay({ token }: { token: string }) {
  const [data, setData] = useState<any>(null), canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`/api/scoreboard-overlay?token=${token}`, { cache: "no-store" });
      if (response.ok && active) setData(await response.json());
    }
    void load();
    const timer = setInterval(load, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [token]);
  const ranking = useMemo<RenderTeam[]>(() => data ? rankLeaderboardTeams(data.teams, data.results) : [], [data]);
  useEffect(() => { if (data && canvas.current) void drawLeaderboard(canvas.current, data.board, ranking); }, [data, ranking]);
  if (!data) return null;
  return <main className="obs-overlay"><canvas ref={canvas} /></main>;
}
