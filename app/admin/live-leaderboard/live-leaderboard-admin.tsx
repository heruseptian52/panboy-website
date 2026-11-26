"use client";
import {shortLink,copyShortLink} from "../../../lib/short-link-client";
import {StyleControls} from "../kelola-template-leaderboard/style-controls";
import type {StyleId,BoardStyle} from "../../../lib/leaderboard-style";
import { useEffect, useMemo, useRef, useState } from "react";
import LiveLeaderboardPanel, {
  type LiveRow,
} from "../../live-leaderboard-panel";
import {
  baseTemplate,
  withBoardStyle,
  cleanTemplate,
  freshState,
  type LiveTemplate,
  type PlayerStatus,
  type TeamLiveState,
} from "../../../lib/live-leaderboard";
import { compareLiveTeams } from "../../../lib/live-ranking";
type Board = { id: number; name: string };
type Team = {
  id: number;
  slotNumber: number;
  name: string;
  shortName?: string;
  logoUrl: string;
};
const statuses: PlayerStatus[] = ["alive", "knocked", "eliminated"];
export default function LiveLeaderboardAdmin() {
  const [boards, setBoards] = useState<Board[]>([]),
    [boardId, setBoardId] = useState(0),
    [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [previewScale, setPreviewScale] = useState(1),
    [shortObs,setShortObs]=useState(""),
    saveQueue = useRef(Promise.resolve()),
    scoreQueue = saveQueue,
    autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    scoreSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pendingScoreDeltas = useRef(new Map<number, number>()),
    realtimeSequence = useRef(0),
    dataRef = useRef<any>(null),
    boardRef=useRef(0),
    styleTimer=useRef<ReturnType<typeof setTimeout>|null>(null),
    pendingStyle=useRef<{styleId:StyleId;design?:BoardStyle;id:number}|null>(null),
    latestScoreSequence=useRef(new Map<number,number>()),
    previewRef = useRef<HTMLDivElement | null>(null);
  const [mode,setMode]=useState<"split"|"operator"|"preview">("split");
  const [split,setSplit]=useState(65);
  const [query,setQuery]=useState("");
  const [zoom,setZoom]=useState(false);
  const [previewWidth,setPreviewWidth]=useState(0);
  const [lastKill,setLastKill]=useState<{id:number;delta:number;match:number}|null>(null);
  const [connection,setConnection]=useState("Menghubungkan");
  const iframeRef=useRef<HTMLIFrameElement|null>(null);
  const workspaceRef=useRef<HTMLDivElement|null>(null);
  const consoleRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{try{const value=Number(localStorage.getItem("panboy-live-split"));if(value>=45&&value<=75)setSplit(value)}catch{}},[]);
  function adjustSplit(value:number){const v=Math.min(75,Math.max(45,Math.round(value)));setSplit(v);try{localStorage.setItem("panboy-live-split",String(v))}catch{}}
  useEffect(()=>{setLastKill(null);setQuery("");setConnection("Menghubungkan")},[boardId]);
  useEffect(()=>{setLastKill(null)},[data?.activeMatch?.id]);
  useEffect(()=>{let last=Date.now();const onMessage=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===iframeRef.current?.contentWindow&&e.data?.type==="panboy-preview-heartbeat"){last=Date.now();setConnection("Terhubung")}};window.addEventListener("message",onMessage);const timer=setInterval(()=>{if(last&&Date.now()-last>6500)setConnection("Koneksi terputus")},1500);return()=>{clearInterval(timer);window.removeEventListener("message",onMessage)}},[boardId]);
  const channelRef=useRef<BroadcastChannel|null>(null);
  useEffect(()=>{setShortObs("");const token=data?.config?.overlayToken;if(!token)return;let mounted=true;void shortLink(location.origin+"/overlay/live-leaderboard/"+token).then(url=>{if(mounted)setShortObs(url)});if(typeof BroadcastChannel!=="undefined")channelRef.current=new BroadcastChannel(`panboy-live-${token}`);return()=>{mounted=false;channelRef.current?.close();channelRef.current=null}},[data?.config?.overlayToken]);
  function broadcastTeam(teamId:number,patch:Record<string,unknown>){
    const sequence=Date.now()*1000+(++realtimeSequence.current);channelRef.current?.postMessage({type:"team-patch",teamId,patch,sequence});return sequence;
  }
  function refreshOverlay(teamId?:number,sequence?:number){channelRef.current?.postMessage({type:"refresh",teamId,sequence})}
  useEffect(()=>{dataRef.current=data},[data]);
  useEffect(() => {
    fetch("/api/admin/scoreboards")
      .then((r) => r.json())
      .then((x) => {
        setBoards(x.boards || []);
        const saved=Number(new URL(location.href).searchParams.get("board"));
        if (x.boards?.length) setBoardId(x.boards.some((board:{id:number})=>board.id===saved)?saved:x.boards[0].id);
      });
  }, []);
  useEffect(() => {
    if (!boardId) return;
    boardRef.current=boardId;setData(null);dataRef.current=null;
    void loadBoard(boardId);
  }, [boardId]);
  function chooseBoard(id:number){flushStyle();flushScoresNow();if(autoSaveTimer.current){clearTimeout(autoSaveTimer.current);autoSaveTimer.current=null;if(dataRef.current)persistLive(dataRef.current.config)}setBoardId(id);const url=new URL(location.href);url.searchParams.set("board",String(id));history.replaceState(history.state,"",url)}
  async function loadBoard(id=boardId,sequence?:number){
    try{const r=await fetch(`/api/admin/live-leaderboard?id=${id}`,{cache:"no-store"}),live=await r.json();if(boardRef.current!==id||(sequence!==undefined&&sequence!==realtimeSequence.current))return;if(!r.ok||!live.board||!live.config)throw Error(live.error||"Gagal memuat leaderboard.");dataRef.current=live;setData(live)}catch(e){setMsg((e as Error).message)}
  }
  useEffect(
    () => () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (scoreSaveTimer.current) clearTimeout(scoreSaveTimer.current);
      if(styleTimer.current)clearTimeout(styleTimer.current);
    },
    [],
  );
  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const update = () => {setPreviewScale(element.clientWidth / 1920);setPreviewWidth(element.clientWidth)},
      observer = new ResizeObserver(update);
    update();
    observer.observe(element);
    return () => observer.disconnect();
  }, [Boolean(data),mode]);
  const templates: LiveTemplate[] = (data?.config.templates || []).map(
      (x: Partial<LiveTemplate>) => cleanTemplate(x, baseTemplate),
    ),
    active: LiveTemplate =
      templates.find((x) => x.id === data?.config.activeTemplateId) ||
      templates[0] ||
      baseTemplate,
    state: Record<string, TeamLiveState> = data?.config.state || {},
    totals = new Map<number, any>(
      (data?.totals || []).map((x: any) => [Number(x.teamId), x]),
    );
  const rows = useMemo<LiveRow[]>(() => {
    if (!data) return [];
    let x = (data.teams as Team[])
      .map((t) => {
        const s = state[t.id] || freshState(),
          b = totals.get(t.id) || {};
        return {
          id: t.id,
          rank: 0,
          name: t.name,
          shortName: t.shortName,
          logoUrl: t.logoUrl,
          points: Number(b.points || 0),
          elims: Number(b.elims || 0),
          overallElims:Number(b.overallElims||0),
          wwcd:Number(b.wwcd||0),
          placementPoints:Number(b.placementPoints||0),
          lastPlacement:Number(b.lastPlacement||0),
          slotNumber:t.slotNumber,
          players: s.players,
        };
      })
      .sort((a, b) => compareLiveTeams(a,b,data.config.rankingTieBreak||[]))
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return x;
  }, [data, state]);
  function persistLive(configData: any) {
    saveQueue.current = saveQueue.current
      .then(() =>
        fetch("/api/admin/live-leaderboard", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: boardId, ...configData,action:"updateConfig" }),
        }).then(async r=>{if(!r.ok)throw Error((await r.json()).error||"Gagal menyimpan template.");refreshOverlay()}),
      )
      .catch(e=>setMsg(e.message));
  }
  function schedulePreview(configData: any) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      persistLive(configData);
      autoSaveTimer.current = null;
    }, 120);
  }
  function config(p:any,autoSave=true){const d=dataRef.current;if(!d)return;const next={...d,config:{...d.config,...p}};dataRef.current=next;setData(next);if(autoSave)schedulePreview(next.config)}
  function setTemplate(p: Partial<LiveTemplate>) {
    config({
      templates: templates.map((x) =>
        x.id === active.id ? { ...x, ...p } : x,
      ),
    });
  }
  function teamState(id: number, p: Partial<TeamLiveState>) {
    flushScoresNow();const current=dataRef.current;
    if(!current)return;
    const currentState:Record<string,TeamLiveState>=current.config?.state||{};
    const nextState = {
        ...currentState,
        [id]: { ...(currentState[id] || freshState()), ...p },
      };
    const nextData={...current,config:{...current.config,state:nextState}};
    dataRef.current=nextData;
    setData(nextData);
    const sequence=broadcastTeam(id,{players:nextState[id].players});
    saveQueue.current=saveQueue.current.then(()=>fetch("/api/admin/live-leaderboard",{
      method:"PUT",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:boardId,action:"updateTeamState",teamId:id,players:nextState[id].players}),
    }).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"Gagal memperbarui status team.");if(boardRef.current===boardId){refreshOverlay(id,sequence);if(result.placementChanged)setTimeout(()=>{const queued=saveQueue.current;void queued.then(()=>{if(boardRef.current===boardId)void loadBoard(boardId,realtimeSequence.current)})},80)}if(typeof BroadcastChannel!=="undefined"&&(result.winnerResult||result.teamResult)){const channel=new BroadcastChannel(`panboy-scoreboard-${boardId}`);for(const item of [result.teamResult,result.winnerResult])if(item)channel.postMessage({type:"result",result:item,sequence:Date.now()});channel.close()}})).catch(error=>{setMsg(error instanceof Error?error.message:"Gagal memperbarui status team.");refreshOverlay(id,sequence);void loadBoard(boardId)});
  }
  function quick(id: number, n: number) {
    const s = dataRef.current?.config?.state?.[id] || freshState();
    teamState(id, {
      ...s,
      players: [0, 1, 2, 3].map((i) =>
        i < n ? "alive" : "eliminated",
      ) as TeamLiveState["players"],
    });
  }
  function cyclePlayer(id:number,index:number){
    const s=dataRef.current?.config?.state?.[id]||freshState(),p=[...s.players] as TeamLiveState["players"],status=p[index];
    p[index]=statuses[(statuses.indexOf(status)+1)%3];
    teamState(id,{players:p});
  }
  async function save(){
    setBusy(true);try{flushStyle();if(autoSaveTimer.current){clearTimeout(autoSaveTimer.current);autoSaveTimer.current=null}flushScoresNow();await saveQueue.current;const current=dataRef.current;if(!current)return;const r=await fetch("/api/admin/live-leaderboard",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:boardId,...current.config,action:"updateConfig"})});if(!r.ok)throw Error((await r.json()).error||"Gagal menyimpan.");refreshOverlay();setMsg("LIVE LEADERBOARD TERSIMPAN & OBS DIPERBARUI.")}catch(e){setMsg((e as Error).message||"GAGAL MENYIMPAN.")}finally{setBusy(false)}
  }
  function duplicate() {
    const id = `custom-${Date.now()}`,
      copy = { ...active, id, name: `${active.name} COPY` };
    config({ templates: [...templates, copy], activeTemplateId: id });
  }
  function removeTemplate() {
    if (templates.length <= 1)
      return setMsg("MINIMAL HARUS ADA SATU TEMPLATE.");
    if (!confirm(`Hapus template ${active.name}?`)) return;
    const next = templates.filter((x) => x.id !== active.id);
    config({ templates: next, activeTemplateId: next[0].id });
  }
  async function resetMatch() {
    if (!confirm("Reset status eliminasi dan ALIVE untuk match baru?")) return;
    setBusy(true);
    flushScoresNow();
    await Promise.all([saveQueue.current,scoreQueue.current]);
    const r = await fetch("/api/admin/live-leaderboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: boardId, action: "resetMatch" }),
    });
    if (r.ok) {
      const fresh = Object.fromEntries(
        (data.teams as Team[]).map((team) => [team.id, freshState()]),
      );
      config({ state: fresh, winnerHidden: false }, false);refreshOverlay();await loadBoard();
      setLastKill(null);setMsg("MATCH BARU DIMULAI. STATUS ELIMINASI SUDAH DIRESET.");
    } else setMsg("GAGAL RESET MATCH.");
    setBusy(false);
  }
  async function nextMatch(){if(!confirm("Selesaikan match aktif dan mulai match berikutnya? PTS tetap, ELIMS dan ALIVE kembali ke awal."))return;setBusy(true);flushScoresNow();await Promise.all([saveQueue.current,scoreQueue.current]);const r=await fetch("/api/admin/live-leaderboard",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:boardId,action:"nextMatch"})}),x=await r.json();if(r.ok){refreshOverlay();await loadBoard();setMsg(`MATCH ${x.matchNumber} DIMULAI. PTS DIBAWA, ELIMS DIRESET 0.`)}else setMsg(x.error||"GAGAL MEMULAI MATCH BERIKUTNYA.");setBusy(false)}
  function flushScoresNow(){
    if(scoreSaveTimer.current){clearTimeout(scoreSaveTimer.current);scoreSaveTimer.current=null}
    const changes=[...pendingScoreDeltas.current.entries()].filter(([,delta])=>delta!==0),sequences=new Map(changes.map(([team])=>[team,latestScoreSequence.current.get(team)]));
    pendingScoreDeltas.current.clear();
    if(!changes.length)return;
    scoreQueue.current=scoreQueue.current.then(async()=>{
      const results=await Promise.all(changes.map(async([teamId,delta])=>{
        const r=await fetch("/api/admin/live-leaderboard",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:boardId,action:"adjustScore",teamId,field:"elims",delta})});
        const x=await r.json();
        if(!r.ok)throw new Error(x.error||"Gagal memperbarui eliminasi.");
        return x.team;
      }));
      if(boardRef.current!==boardId)return;for(const [teamId,sequence] of sequences)refreshOverlay(teamId,sequence);setData((current:any)=>{if(!current)return current;const next={...current,totals:(current.totals||[]).map((row:any)=>{
        const saved=results.find((team:any)=>Number(team?.teamId)===Number(row.teamId));
        return saved&&latestScoreSequence.current.get(Number(row.teamId))===sequences.get(Number(row.teamId))?{...row,...saved}:row;
      })};dataRef.current=next;return next});
    }).catch((error)=>{setMsg(error instanceof Error?error.message:"Gagal memperbarui eliminasi.");for(const [teamId,sequence] of sequences)refreshOverlay(teamId,sequence);void loadBoard(boardId)});
  }
  function updateElims(teamId:number,delta:number,record=true){
    const current=dataRef.current;
    if(!current)return;
    const totalsNow=current.totals||[],existing=totalsNow.find((row:any)=>Number(row.teamId)===teamId),oldElims=Number(existing?.elims||0),nextElims=Math.max(0,oldElims+delta),applied=nextElims-oldElims;
    if(!applied)return;
    if(record)setLastKill({id:teamId,delta:applied,match:Number(current.activeMatch?.id||0)});
    const increment=applied*Number(current.config.eliminationPoint??1),found=Boolean(existing),nextTotals=(found?totalsNow:[...totalsNow,{teamId,points:0,elims:0,overallElims:0}]).map((row:any)=>Number(row.teamId)!==teamId?row:{...row,elims:nextElims,overallElims:Math.max(0,Number(row.overallElims||0)+applied),points:Math.max(0,Number(row.points||0)+increment)}),nextData={...current,totals:nextTotals};
    dataRef.current=nextData;
    setData(nextData);
    latestScoreSequence.current.set(teamId,broadcastTeam(teamId,{elims:nextElims,overallElims:Math.max(0,Number(existing?.overallElims||0)+applied),points:Math.max(0,Number(existing?.points||0)+increment)}));
    pendingScoreDeltas.current.set(teamId,(pendingScoreDeltas.current.get(teamId)||0)+applied);
    if(scoreSaveTimer.current)clearTimeout(scoreSaveTimer.current);
    scoreSaveTimer.current=setTimeout(flushScoresNow,15);
  }
  async function hideWinner() {
    setBusy(true);
    await saveQueue.current;
    const r = await fetch("/api/admin/live-leaderboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: boardId, action: "hideWinner" }),
    });
    if (r.ok) {
      config({ winnerHidden: true }, false);refreshOverlay();
      setMsg("POPUP WWCD DISEMBUNYIKAN.");
    } else setMsg("GAGAL MENYEMBUNYIKAN WWCD.");
    setBusy(false);
  }
  function flushStyle(){if(styleTimer.current){clearTimeout(styleTimer.current);styleTimer.current=null}const pending=pendingStyle.current;pendingStyle.current=null;if(!pending)return;saveQueue.current=saveQueue.current.then(async()=>{const r=await fetch("/api/admin/live-leaderboard",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...pending,action:"setBoardStyle"})});if(!r.ok)throw Error((await r.json()).error);if(boardRef.current===pending.id)refreshOverlay()}).catch(e=>{setMsg(e.message);void loadBoard(pending.id)})}
  function changeBoardStyle(styleId:StyleId,design?:BoardStyle){
   const current=dataRef.current;if(!current)return;const next={...current,config:{...current.config,boardStyle:{...current.config.boardStyle,styleId,design}}};setData(next);dataRef.current=next;channelRef.current?.postMessage({type:"style-patch",styleId,design});pendingStyle.current={id:boardId,styleId,design};if(styleTimer.current)clearTimeout(styleTimer.current);styleTimer.current=setTimeout(flushStyle,100)
  }
  if (!data)
    return (
      <section className="live-admin-loading">
        <label>
          PILIH LEADERBOARD
          <select
            value={boardId}
            onChange={(e) => chooseBoard(Number(e.target.value))}
          >
            {boards.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          {boardId ? "Memuat live leaderboard..." : "Belum ada leaderboard."}
        </p>
      </section>
    );
  const url = `${location.origin}/overlay/live-leaderboard/${data.config.overlayToken}`;
  const teamList=(data.teams as Team[]).filter(t=>!query.trim()||[t.name,t.shortName,String(t.slotNumber)].some(v=>String(v||"").toLowerCase().includes(query.trim().toLowerCase())));
  const aliveCount=rows.filter(row=>row.players.some(p=>p!=="eliminated")).length;
  const detailTemplate=withBoardStyle(active,data.config.boardStyle);
  const detailRows=rows.slice(0,data.config.displayLimit==="all"?rows.length:Number(data.config.displayLimit)||rows.length);
  const detailScale=Math.min(1.5,Math.max(.1,(previewWidth-12)/detailTemplate.panelWidth));
  const detailHeight=Math.min(detailTemplate.panelHeight,detailTemplate.headerHeight+detailRows.length*(detailTemplate.rowHeight+detailTemplate.spacing)+(data.config.showLegend?38:0));
  function undoKill(){if(!lastKill||lastKill.match!==Number(dataRef.current?.activeMatch?.id||0))return;updateElims(lastKill.id,-lastKill.delta,false);setLastKill(null);setMsg("Input eliminasi terakhir dibatalkan.")}
  function copyObs(){void copyShortLink(shortObs||url).then(()=>setMsg("Link OBS singkat tersalin.")).catch(()=>setMsg("Gagal menyalin link OBS."))}

  return (
    <section ref={consoleRef} className="live-admin operator-console">
      <div className="operator-toolbar">
        <div className="operator-board-select"><label htmlFor="operator-board">LEADERBOARD</label><select id="operator-board" value={boardId} onChange={e=>chooseBoard(Number(e.target.value))}>{boards.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div className="operator-match"><strong>MATCH {data.activeMatch?.matchNumber||"—"}</strong><span>{aliveCount}/{rows.length} TEAM ALIVE</span></div>
        <div className="live-control-actions">
          <button className="danger" disabled={busy||data.config.winnerHidden} onClick={hideWinner}>HIDE WWCD</button>
          <button className="danger" disabled={busy} onClick={resetMatch}>RESET MATCH</button>
          <button className="operator-next" disabled={busy} onClick={nextMatch}>NEXT MATCH</button>
          <button onClick={copyObs}>SALIN LINK OBS</button>
        </div>
        <div className="operator-view-options" aria-label="Mode tampilan">
          {([["split","Split screen"],["operator","Operator saja"],["preview","Preview saja"]] as const).map(([id,label])=><button key={id} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}
          <button onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen?.();else void consoleRef.current?.requestFullscreen?.().catch(()=>setMsg("Fullscreen tidak tersedia di browser ini."))}}>FULL SCREEN</button>
          <a href={url} target="_blank" rel="noopener noreferrer">POP-OUT OBS</a>
        </div>
        {msg&&<p className="operator-message" role="status">{msg}</p>}
      </div>
      <div ref={workspaceRef} className={`operator-workspace mode-${mode}`} style={{"--operator-width":`${split}%`} as React.CSSProperties}>
        <section className="live-controls operator-controls" aria-label="Control panel operator">
          <div className="operator-list-head"><h2>CONTROL PANEL OPERATOR</h2><div><input type="search" aria-label="Cari team atau slot" placeholder="Cari nama team / slot..." value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={undoKill} disabled={busy||!lastKill} title="Batalkan perubahan eliminasi terakhir">UNDO ELIMS</button></div><span>{teamList.length} dari {rows.length} team</span></div>
          <div className="operator-team-list">
          {teamList.map((team) => {
            const s = state[team.id] || freshState(),
              row = rows.find((x) => x.id === team.id);
            return (
              <article key={team.id} className={s.players.every(p=>p==="eliminated")?"operator-wiped":""}>
                <span className="operator-slot" aria-label={`Slot ${team.slotNumber}`}>{String(team.slotNumber).padStart(2, "0")}</span>
                <img src={team.logoUrl} alt="" />
                <strong title={team.name}>{team.name}</strong>
                <div className="score-step operator-points">
                  <span title="Otomatis: Kill Point + Placement Point">PTS {row?.points ?? 0}</span>
                </div>
                <div className="score-step operator-elims">
                  <span>ELIMS {row?.elims ?? 0}</span>
                  <button
                    disabled={busy} onClick={() => updateElims(team.id,-1)}
                  >
                    −
                  </button>
                  <button
                    disabled={busy} onClick={() => updateElims(team.id,1)}
                  >
                    +
                  </button>
                </div>
                <div className="player-statuses">
                  {s.players.map((status, i) => (
                    <button
                      key={i}
                      className={status}
                      disabled={busy} onClick={() => cyclePlayer(team.id,i)}
                    >
                      P{i + 1} <small>{status === "eliminated" ? "OUT" : status === "knocked" ? "KNOCK" : "ALIVE"}</small>
                    </button>
                  ))}
                </div>
                <div className="quick-status">
                  {[4, 3, 2, 1, 0].map((n) => (
                    <button key={n} className={n===0?"wipe-button":""} disabled={busy} onClick={() => quick(team.id, n)}>
                      {n ? `${n} ALIVE` : "TEAM WIPE"}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}

            {!teamList.length&&<p className="operator-empty">Team tidak ditemukan.</p>}
          </div>
        </section>
        <div className="operator-divider" role="separator" aria-label="Atur lebar control panel" aria-orientation="vertical" aria-valuemin={45} aria-valuemax={75} aria-valuenow={split} tabIndex={0}
          onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();adjustSplit(split+(e.key==="ArrowLeft"?-2:2))}}}
          onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId)}}
          onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const rect=workspaceRef.current?.getBoundingClientRect();if(rect)adjustSplit((e.clientX-rect.left)/rect.width*100)}}}
          onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}/>
        <aside className="operator-preview" aria-label="Live OBS preview">
          <div className="operator-preview-head"><h2>LIVE PREVIEW OBS</h2><span className={connection==="Terhubung"?"online":"offline"}>{connection} (preview)</span></div>
          <div className="operator-preview-actions"><button aria-pressed={!zoom} onClick={()=>setZoom(false)}>LAYAR UTUH</button><button aria-pressed={zoom} onClick={()=>setZoom(true)}>ZOOM RANKING</button><span>1920 × 1080</span></div>
          <div ref={previewRef} className="live-preview-stage live-preview-overlay" style={zoom?{height:0,aspectRatio:"unset",border:0,visibility:"hidden",pointerEvents:"none"}:undefined}>
            <iframe ref={iframeRef} key={url} src={url} title="Live OBS preview" style={{transform:`scale(${previewScale})`}}/>
          </div>
          {zoom&&<div className="operator-zoom-panel" style={{height:detailHeight*detailScale+12}}><div style={{width:detailTemplate.panelWidth,transform:`scale(${detailScale})`,transformOrigin:"top left"}}><LiveLeaderboardPanel template={detailTemplate} rows={detailRows} showLegend={data.config.showLegend}/></div></div>}
          <p className="operator-preview-note">{zoom?"Ranking diperbesar untuk operator; popup dan framing asli tersedia di Layar Utuh.":"Preview menampilkan seluruh kanvas OBS tanpa mengubah ukuran overlay asli."}</p>
          <details className="live-settings operator-settings"><summary>PENGATURAN DESAIN & OVERLAY</summary>
        <label>
          WARNA LIVE / TEMPLATE LAMA
          <select
            value={active.id}
            onChange={(e) => config({ activeTemplateId: e.target.value })}
          >
            {templates.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          NAMA TEMPLATE
          <input
            value={active.name}
            onChange={(e) => setTemplate({ name: e.target.value })}
          />
        </label>
        <div className="live-template-actions">
          <button onClick={duplicate}>DUPLICATE</button>
          <button onClick={() => config({ activeTemplateId: active.id })}>
            SET DEFAULT
          </button>
          <button className="danger" onClick={removeTemplate}>
            DELETE
          </button>
        </div>
        <StyleControls id={data.config.boardStyle?.styleId||"original"} design={data.config.boardStyle?.design} onChange={changeBoardStyle}/>
        <div className="live-setting-grid">
          {(
            [
              ["panelWidth", "Panel Width"],
              ["panelHeight", "Panel Height"],
              ["rowHeight", "Row Height"],
              ["headerHeight", "Header Height"],
              ["rankX", "Rank X"],
              ["logoX", "Logo X"],
              ["teamX", "Team X"],
              ["ptsX", "PTS X"],
              ["elimsX", "ELIMS X"],
              ["aliveX", "ALIVE X"],
              ["fontSize", "Font Size"],
              ["logoSize", "Logo Size"],
              ["spacing", "Spacing"],
              ["backgroundOpacity", "BG Opacity"],
              ["rowOpacity", "Row Opacity"],
            ] as const
          ).map(([k, label]) => (
            <label key={k}>
              {label}
              <input
                type="number"
                step={
                  k.includes("Opacity") ||
                  k === "backgroundOpacity" ||
                  k === "rowOpacity"
                    ? 0.05
                    : 1
                }
                value={active[k]}
                onChange={(e) => setTemplate({ [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        {(
          [
            ["backgroundColor", "Background"],
            ["headerColor", "Header"],
            ["aliveColor", "Alive"],
            ["knockedColor", "Knocked"],
            ["eliminatedColor", "Eliminated"],
            ["dividerColor", "Divider"],
          ] as const
        ).map(([k, label]) => (
          <label key={k}>
            {label}
            <input
              type="color"
              value={active[k]}
              onChange={(e) => setTemplate({ [k]: e.target.value })}
            />
          </label>
        ))}
        <label>
          POSISI OBS
          <select
            value={data.config.side}
            onChange={(e) => config({ side: e.target.value })}
          >
            <option value="left">LEFT</option>
            <option value="right">RIGHT</option>
          </select>
        </label>
        <label>
          TEAM DITAMPILKAN
          <select
            value={data.config.displayLimit}
            onChange={(e) => config({ displayLimit: e.target.value })}
          >
            <option value="8">TOP 8</option>
            <option value="10">TOP 10</option>
            <option value="16">TOP 16</option>
            <option value="all">ALL TEAM</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={data.config.showLegend}
            onChange={(e) => config({ showLegend: e.target.checked })}
          />{" "}
          SHOW LEGEND
        </label>
        <button className="live-save" disabled={busy} onClick={save}>
          SAVE TEMPLATE & LIVE DATA
        </button>

          </details>
        </aside>
      </div>
    </section>
  );
}
