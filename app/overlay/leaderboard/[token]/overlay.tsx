"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { drawLeaderboard, type RenderTeam } from "../../../../lib/leaderboard-render";
import { rankLeaderboardTeams } from "../../../../lib/leaderboard-ranking";

export default function Overlay({ token }: { token: string }) {
  const [data, setData] = useState<any>(null), canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true,loading=false;
    async function load() {
      if(loading)return;loading=true;try{const response = await fetch(`/api/scoreboard-overlay?token=${token}`, { cache: "no-store" });
      if (response.ok && active) {const next=await response.json();setData((old:any)=>JSON.stringify(old)===JSON.stringify(next)?old:next)} }catch{}finally{loading=false}
    }
    void load();
    const timer = setInterval(load, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [token]);
  const ranking = useMemo<RenderTeam[]>(() => data ? rankLeaderboardTeams(data.teams, data.results) : [], [data]);
  useEffect(() => { if(!data||!canvas.current)return;let active=true;const scratch=document.createElement("canvas");void drawLeaderboard(scratch,data.board,ranking).then(()=>{if(active&&canvas.current){canvas.current.width=scratch.width;canvas.current.height=scratch.height;canvas.current.getContext("2d")?.drawImage(scratch,0,0)}}).catch(()=>{});return()=>{active=false}}, [data, ranking]);
  if (!data) return null;
  return <main className="obs-overlay"><canvas ref={canvas} /></main>;
}
