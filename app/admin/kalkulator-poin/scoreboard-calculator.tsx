"use client";
import { uploadForm } from "../../../lib/upload-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSlotWorkbook, downloadWorkbook, readSlotWorkbook, type SlotSheetRow } from "../../../lib/simple-xlsx";
type Board = { id: number; name: string; mode: string; pointSystemId?:number; activeMatchId?:number };
type Team = { id: number; slotNumber: number; name: string; shortName: string; logoUrl: string };
type Match = { id: number; matchNumber: number; mapName: string; status:string; resultLocked:boolean };
type Result = {
  matchId: number;
  teamId: number;
  placement: number;
  eliminations: number;
  placementPoints: number;
  totalPoints: number;
  calculationMode?:"auto"|"manual";
  manualPoints?:number|null;
};
type Detail = {
  board: Board;
  teams: Team[];
  matches: Match[];
  results: Result[];
  rule: {
    name: string;
    eliminationPoint: number;
    placement: Record<string, number>;
  };
};
type Draft = Record<string, { placement: string; eliminations: string }>;
const blank = () => Array(24).fill("") as string[];
export default function Calculator() {
  const [boards, setBoards] = useState<Board[]>([]),
    [systems, setSystems] = useState<{ id: number; name: string }[]>([]),
    [detail, setDetail] = useState<Detail | null>(null),
    [name, setName] = useState(""),
    [mode, setMode] = useState("team"),
    [count, setCount] = useState(16),
    [names, setNames] = useState(blank),
    [shortNames, setShortNames] = useState(blank),
    [logos, setLogos] = useState(blank),
    [pointSystemId, setPointSystemId] = useState(0),
    [draft, setDraft] = useState<Draft>({}),
    draftRef=useRef<Draft>({}),
    [busy, setBusy] = useState(-1),
    [message, setMessage] = useState(""),
    saveTimers=useRef<Record<string,ReturnType<typeof setTimeout>>>({}),
    saveQueues=useRef<Record<string,Promise<void>>>({}),
    [importRows, setImportRows] = useState<Array<SlotSheetRow & { valid: boolean; reason: string; overwrite: boolean }>>([]);
  async function list() {
    const r = await fetch("/api/admin/scoreboards"),
      x = await r.json();
    if (r.ok) {
      setBoards(x.boards);
      setSystems(x.systems);
    }
  }
  useEffect(() => {
    list();
    return()=>Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);
  useEffect(()=>{const id=detail?.board.id;if(!id||typeof BroadcastChannel==="undefined")return;const channel=new BroadcastChannel(`panboy-scoreboard-${id}`);channel.onmessage=event=>{if(event.data?.type!=="result"||!event.data.result)return;const result=event.data.result as Result,key=`${result.matchId}-${result.teamId}`;setDetail(current=>current?{...current,results:[...current.results.filter(row=>!(row.matchId===result.matchId&&row.teamId===result.teamId)),result]}:current);const active=document.activeElement instanceof HTMLElement?document.activeElement.dataset.resultKey:"";if(saveTimers.current[key]||active===key)return;const next={...draftRef.current,[key]:{placement:String(result.placement),eliminations:String(result.eliminations)}};draftRef.current=next;setDraft(next)};return()=>channel.close()},[detail?.board.id]);
  async function open(id: number) {
    const [r, teamResponse] = await Promise.all([fetch(`/api/admin/scoreboards?id=${id}`), fetch(`/api/admin/scoreboard-teams?id=${id}`)]),
      x = await r.json(), teamData = await teamResponse.json();
    if (!r.ok) return;
    if (teamResponse.ok) x.teams = teamData.teams;
    setDetail(x);
    const d: Draft = {};
    x.results.forEach(
      (v: Result) =>
        (d[`${v.matchId}-${v.teamId}`] = {
          placement: String(v.placement),
          eliminations: String(v.eliminations),
        }),
    );
    draftRef.current=d;
    setDraft(d);
  }
  async function saveTeam(team: Team, changes: Partial<Team>) {
    if (!detail) return false;
    const next = { ...team, ...changes };
    const r = await fetch("/api/admin/scoreboard-teams", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detail.board.id, teamId: team.id, name: next.name, shortName: next.shortName, logoUrl: next.logoUrl }) }), x = await r.json();
    setMessage(r.ok ? "Perubahan team tersimpan otomatis." : x.error);
    if (r.ok) setDetail((current) => current ? { ...current, teams: current.teams.map((item) => item.id === team.id ? next : item) } : current);
    return r.ok;
  }
  function exportTeams(template = false) {
    const rows = template ? [{ slot: 3, name: "Team Alpha", shortName: "ALP" }, { slot: 4, name: "Bigetron Red", shortName: "BTR" }, { slot: 5, name: "Panboy Esport", shortName: "PBY" }] : (detail?.teams || []).map((team) => ({ slot: team.slotNumber, name: team.name, shortName: team.shortName || "" }));
    downloadWorkbook(createSlotWorkbook(rows), template ? "template-team-slot.xlsx" : `team-${detail?.board.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "leaderboard"}.xlsx`);
  }
  async function selectImport(file: File) {
    try {
      const parsed = await readSlotWorkbook(file), slots = new Set<number>(), available = new Map((detail?.teams || []).map((team) => [team.slotNumber, team]));
      setImportRows(parsed.map((row) => {
        let reason = "";
        if (!Number.isInteger(row.slot) || !available.has(row.slot)) reason = "Slot tidak tersedia";
        else if (slots.has(row.slot)) reason = "Slot duplikat";
        else if (!row.name) reason = "Nama team kosong";
        else if (row.shortName.length < 2 || row.shortName.length > 4) reason = "Short Name harus 2–4 karakter";
        slots.add(row.slot);
        const old = available.get(row.slot);
        return { ...row, valid: !reason, reason, overwrite: Boolean(old?.name || old?.shortName) };
      }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "File tidak dapat dibaca."); }
  }
  async function confirmImport() {
    if (!detail) return;
    const valid = importRows.filter((row) => row.valid);
    if (!valid.length) return setMessage("Tidak ada baris valid untuk di-import.");
    if (valid.some((row) => row.overwrite) && !confirm("Data pada slot yang sudah terisi akan ditimpa. Logo tetap dipertahankan. Lanjutkan?")) return;
    const r = await fetch("/api/admin/scoreboard-teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detail.board.id, rows: valid }) }), x = await r.json();
    setMessage(r.ok ? `${x.imported} data berhasil di-import. ${x.failed} data gagal.` : x.error);
    if (r.ok) { setImportRows([]); await open(detail.board.id); }
  }
  async function post(body: Record<string, unknown>, refresh = true) {
    const r = await fetch("/api/admin/scoreboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      x = await r.json();
    setMessage(r.ok ? "Perubahan tersimpan." : x.error);
    if (r.ok) {
      list();
      if (x.id) {
        const participants = Array.isArray(body.participants) ? body.participants as Array<{ name?: string; shortName?: string }> : [];
        if (participants.some((item) => item.shortName)) await fetch("/api/admin/scoreboard-teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: x.id, rows: participants.map((item, index) => ({ slot: index + 3, name: item.name, shortName: item.shortName })) }) });
        open(x.id);
      }
      else if (detail && refresh) open(detail.board.id);
    }
    return r.ok;
  }
  async function saveResult(
    m: Match,
    t: Team,
    v: { placement: string; eliminations: string },calculationMode:"auto"|"manual"="auto",manualPoints?:number,
  ) {
    if (!detail) return;
    const duplicate = Boolean(v.placement)&&Object.entries(draftRef.current).some(
      ([key, row]) =>
        key.startsWith(`${m.id}-`) &&
        key !== `${m.id}-${t.id}` &&
        row.placement === v.placement,
    );
    if (duplicate) {
      setMessage(
        `Rank ${v.placement} sudah digunakan team lain pada Match ${m.matchNumber}.`,
      );
      return;
    }
    const placement = Number(v.placement||0),
      eliminations = Number(v.eliminations || 0),
      pp = Number(detail.rule.placement[String(placement)] || 0),
      totalPoints = pp + eliminations * detail.rule.eliminationPoint,
      r = await fetch("/api/admin/scoreboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "result",
          id: detail.board.id,
          matchId: m.id,
          teamId: t.id,
          placement,
          eliminations,
          calculationMode,
          manualPoints,
        }),
      }),
      x = await r.json();
    if (!r.ok) {
      setMessage(x.error);
      return;
    }
    const stored=(x.result||{matchId:m.id,teamId:t.id,placement,eliminations,placementPoints:pp,totalPoints,calculationMode,manualPoints:calculationMode==="manual"?Number(manualPoints||0):null}) as Result;
    if(typeof BroadcastChannel!=="undefined"){const channel=new BroadcastChannel(`panboy-scoreboard-${detail.board.id}`);channel.postMessage({type:"result",result:stored,sequence:Date.now()});channel.close()}
    setMessage(placement===1?`WWCD tersimpan otomatis: ${stored.placementPoints} placement PTS + ${eliminations*detail.rule.eliminationPoint} kill PTS.`:"Rank, kill, dan poin tersimpan otomatis.");
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            results: [
              ...prev.results.filter(
                (z) => !(z.matchId === m.id && z.teamId === t.id),
              ),
              stored,
            ],
          }
        : prev,
    );
  }
  function queueResult(m:Match,t:Team,v:{placement:string;eliminations:string},calculationMode:"auto"|"manual"="auto",manualPoints?:number){const key=`${m.id}-${t.id}`;saveQueues.current[key]=(saveQueues.current[key]||Promise.resolve()).then(()=>saveResult(m,t,v,calculationMode,manualPoints)).catch(()=>setMessage("Gagal menyinkronkan hasil match."));return saveQueues.current[key]}
  function savedMode(m:Match,t:Team){const saved=detail?.results.find(result=>result.matchId===m.id&&result.teamId===t.id);return{mode:(saved?.calculationMode||"auto") as "auto"|"manual",manual:saved?.manualPoints??undefined}}
  function scheduleResult(m:Match,t:Team,next:{placement:string;eliminations:string}){const key=`${m.id}-${t.id}`;if(saveTimers.current[key])clearTimeout(saveTimers.current[key]);saveTimers.current[key]=setTimeout(()=>{delete saveTimers.current[key];void queueResult(m,t,draftRef.current[key]||next,"auto")},400)}
  function flushResult(m:Match,t:Team){const key=`${m.id}-${t.id}`;if(saveTimers.current[key]){clearTimeout(saveTimers.current[key]);delete saveTimers.current[key]}return queueResult(m,t,draftRef.current[key]||{placement:"",eliminations:""},"auto")}
  function changeRank(m: Match, t: Team, value: string) {
    const numeric = value.replace(/^0+(?=\d)/, ""),
      clean = numeric === "" ? "" : String(Math.min(detail?.teams.length || 24, Math.max(1, Number(numeric))));
    const k = `${m.id}-${t.id}`,next={...(draft[k] || { placement: "", eliminations: "" }),placement:clean};
    draftRef.current={...draftRef.current,[k]:next};
    setDraft((d) => ({
      ...d,
      [k]: next,
    }));
    scheduleResult(m,t,next);
    setMessage("");
  }
  function changeKill(m: Match, t: Team, value: string) {
    const k = `${m.id}-${t.id}`,
      numeric = value.replace(/^0+(?=\d)/, ""),
      clean = numeric === "" ? "" : String(Math.min(999, Math.max(0, Number(numeric)))),next={...(draft[k] || { placement: "", eliminations: "" }),eliminations:clean};
    draftRef.current={...draftRef.current,[k]:next};
    setDraft((d) => ({
      ...d,
      [k]: next,
    }));
    scheduleResult(m,t,next);
  }
  async function upload(file: File, index: number, team?: Team) {
    setBusy(index);
    const f = new FormData();
    f.append("poster", file);
    const r = await uploadForm("/api/admin/upload", { method: "POST", body: f }),
      x = await r.json();
    setBusy(-1);
    if (!r.ok) return setMessage(x.error);
    if (team)
      saveTeam(team, { logoUrl: x.url });
    else {
      const n = [...logos];
      n[index] = x.url;
      setLogos(n);
    }
  }
  async function removeBoard(id: number) {
    if (confirm("Hapus leaderboard beserta seluruh match dan hasilnya?")) {
      await post({ action: "delete", id }, false);
      if (detail?.board.id === id) setDetail(null);
    }
  }
  const ranking = useMemo(
    () =>
      detail
        ? detail.teams
            .map((t) => {
              const rs = detail.results.filter((r) => r.teamId === t.id);
              return {
                ...t,
                matches: rs.length,
                wwcd: rs.filter((r) => r.placement === 1).length,
                kills: rs.reduce((n, r) => n + r.eliminations, 0),
                place: rs.reduce((n, r) => n + r.placementPoints, 0),
                lastPlacement: detail.matches.length
                  ? rs.find((r) => r.matchId === detail.matches.at(-1)?.id)?.placement || 999
                  : 999,
                total: rs.reduce((n, r) => n + (r.calculationMode==="manual"&&r.manualPoints!=null?r.manualPoints:r.totalPoints), 0),
              };
            })
            .sort(
              (a, b) =>
                b.total - a.total ||
                b.wwcd - a.wwcd ||
                b.place - a.place ||
                b.kills - a.kills ||
                a.lastPlacement - b.lastPlacement,
            )
        : [],
    [detail],
  );
  function participant(i: number) {
    return (
      <div className="manual-team-row" key={i}>
        <span>{i + 3}</span>
        <div className="logo-preview">
          {logos[i] ? <img src={logos[i]} alt="" /> : <b>LOGO</b>}
        </div>
        <input
          value={names[i]}
          onChange={(e) => {
            const n = [...names];
            n[i] = e.target.value;
            setNames(n);
          }}
          placeholder={`${mode === "solo" ? "Player" : "Team"} ${i + 3}`}
        />
        <input
          value={shortNames[i]}
          maxLength={4}
          onChange={(e) => { const next = [...shortNames]; next[i] = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); setShortNames(next); }}
          placeholder="SHORT NAME"
        />
        <input
          value={logos[i]}
          onChange={(e) => {
            const n = [...logos];
            n[i] = e.target.value;
            setLogos(n);
          }}
          placeholder="Link logo (opsional)"
        />
        <label className="mini-upload">
          {busy === i ? "..." : "UPLOAD"}
          <input
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
            onChange={(e) =>
              e.target.files?.[0] && upload(e.target.files[0], i)
            }
          />
        </label>
      </div>
    );
  }
  if (!detail) {
    const half = Math.ceil(count / 2),
      cols = [
        Array.from({ length: half }, (_, i) => i),
        Array.from({ length: count - half }, (_, i) => i + half),
      ];
    return (
      <section className="admin-content calculator-page">
        <div className="admin-title">
          <div>
            <small>STANDALONE TOOL UNTUK EO</small>
            <h1>HITUNG POIN PUBG MOBILE</h1>
            <p>Slot dimulai dari 3 dan tersusun berurutan per kolom.</p>
          </div>
          <div><a href="/admin/leaderboard/point-system">PENGATURAN POINT</a><a href="/admin/desain-leaderboard">TEMPLATE & EXPORT</a></div>
        </div>
        {message && <p className="form-message">{message}</p>}
        <div className="calculator-start">
          <section>
            <h2>BUAT LEADERBOARD BARU</h2>
            <label>
              Nama turnamen
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="calculator-choices">
              <label>
                Mode
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="solo">SOLO</option>
                  <option value="duo">DUO</option>
                  <option value="team">TEAM / SQUAD</option>
                </select>
              </label>
              <label>
                Jumlah peserta
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option value={n} key={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Point System
                <select
                  value={pointSystemId}
                  onChange={(e) => setPointSystemId(Number(e.target.value))}
                >
                  <option value="0">PUBG Mobile Current</option>
                  {systems.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h3>NAMA & LOGO SLOT 3–{count + 2}</h3>
            <div className="participant-columns">
              {cols.map((col, i) => (
                <div key={i}>{col.map(participant)}</div>
              ))}
            </div>
            <button
              className="gold-action"
              disabled={!name || !names.slice(0, count).every(Boolean)}
              onClick={() =>
                post({
                  action: "create",
                  name,
                  mode,
                  pointSystemId,
                  participants: names
                    .slice(0, count)
                    .map((n, i) => ({ name: n, shortName: shortNames[i], logoUrl: logos[i] })),
                })
              }
            >
              BUAT & MULAI HITUNG
            </button>
          </section>
          <aside>
            <h2>LEADERBOARD TERSIMPAN</h2>
            {boards.map((b) => (
              <article className="board-list-row" key={b.id}>
                <button onClick={() => open(b.id)}>
                  <b>{b.name}</b>
                  <span>{b.mode.toUpperCase()}</span>
                </button>
                <button className="danger" onClick={() => removeBoard(b.id)}>
                  HAPUS
                </button>
              </article>
            ))}
          </aside>
        </div>
      </section>
    );
  }
  return (
    <section className="admin-content calculator-page">
      <div className="admin-title">
        <div>
          <small>
            {detail.board.mode.toUpperCase()} · {detail.rule.name}
          </small>
          <h1>{detail.board.name}</h1>
          <p>
            Rank duplikat ditolak. Angka nol di depan kill otomatis dibuang.
          </p>
        </div>
        <div>
          <button onClick={() => setDetail(null)}>← DAFTAR</button>
          <button
            className="danger"
            onClick={() => removeBoard(detail.board.id)}
          >
            HAPUS LEADERBOARD
          </button>
        </div>
      </div>
      {message && <p className="form-message">{message}</p>}
      {!detail.teams.length && (
        <div className="repair-notice">
          <b>Daftar peserta leaderboard lama ini kosong.</b>
          <p>Hapus lalu buat ulang leaderboard ini.</p>
        </div>
      )}
      <section className="team-logo-manager">
        <div className="team-manager-heading"><div><h2>NAMA & LOGO SLOT</h2><p>SHORT NAME 2–4 huruf/angka digunakan khusus pada Live Observer.</p></div><div className="team-excel-actions"><button onClick={() => exportTeams(true)}>DOWNLOAD TEMPLATE</button><button onClick={() => exportTeams(false)}>EXPORT EXCEL</button><label>IMPORT EXCEL<input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(e) => { const file = e.target.files?.[0]; if (file) void selectImport(file); e.target.value = ""; }}/></label></div></div>
        <div>
          {detail.teams.map((t, i) => (
            <article key={t.id}>
              <b className="team-slot">{t.slotNumber}</b>
              <div className="logo-preview">
                {t.logoUrl ? <img src={t.logoUrl} alt={t.name} /> : <b>LOGO</b>}
              </div>
              <input
                defaultValue={t.name}
                onBlur={(e) =>
                  e.target.value !== t.name &&
                  saveTeam(t, { name: e.target.value })
                }
              />
              <input className="observer-name-input" defaultValue={t.shortName} maxLength={4} placeholder="SHORT NAME" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); }} onBlur={(e) => e.target.value !== (t.shortName || "") && saveTeam(t, { shortName: e.target.value })}/>
              <input
                defaultValue={t.logoUrl}
                placeholder="Link logo"
                onBlur={(e) =>
                  e.target.value !== t.logoUrl &&
                  saveTeam(t, { logoUrl: e.target.value })
                }
              />
              <label className="mini-upload">
                {busy === i ? "..." : "UPLOAD"}
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
                  onChange={(e) =>
                    e.target.files?.[0] && upload(e.target.files[0], i, t)
                  }
                />
              </label>
            </article>
          ))}
        </div>
      </section>
      {importRows.length > 0 && <div className="excel-import-backdrop" role="dialog" aria-modal="true"><section className="excel-import-preview"><header><div><small>PREVIEW IMPORT EXCEL</small><h2>PERIKSA DATA SEBELUM DISIMPAN</h2></div><button onClick={() => setImportRows([])}>✕</button></header><div className="excel-preview-summary"><b>{importRows.filter((row) => row.valid).length} VALID</b><b>{importRows.filter((row) => !row.valid).length} GAGAL</b><span>Logo pada slot tidak akan diubah.</span></div><div className="excel-preview-table"><table><thead><tr><th>SLOT</th><th>NAMA TEAM</th><th>SHORT NAME</th><th>STATUS</th></tr></thead><tbody>{importRows.map((row, index) => <tr key={`${row.slot}-${index}`} className={row.valid ? "valid" : "invalid"}><td>{row.slot || "—"}</td><td>{row.name || "—"}</td><td>{row.shortName || "—"}</td><td>{row.valid ? row.overwrite ? "AKAN MENIMPA" : "SIAP" : row.reason}</td></tr>)}</tbody></table></div><footer><button onClick={() => setImportRows([])}>BATAL</button><button className="gold-action" onClick={confirmImport}>IMPORT {importRows.filter((row) => row.valid).length} DATA</button></footer></section></div>}
      <div className="calculator-actions">
        <label>PENGATURAN POINT<select value={detail.board.pointSystemId||0} onChange={async e=>{await post({action:"pointSystem",id:detail.board.id,pointSystemId:Number(e.target.value)});}}><option value="0">DEFAULT PUBG MOBILE</option>{systems.map(system=><option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
        <button
          className="gold-action"
          onClick={() => post({ action: "match", id: detail.board.id })}
        >
          + TAMBAH MATCH {detail.matches.length + 1}
        </button>
      </div>
      {detail.matches.map((m) => (
        <section className="match-input-card" key={m.id}>
          <header>
            <div>
              <h2>MATCH {m.matchNumber}</h2>
              <div className="match-edit">
                <input type="number" defaultValue={m.matchNumber} />
                <input defaultValue={m.mapName} placeholder="Nama map" />
                <button
                  onClick={(e) => {
                    const p = e.currentTarget.parentElement!,
                      ins = p.querySelectorAll("input");
                    post({
                      action: "matchEdit",
                      id: detail.board.id,
                      matchId: m.id,
                      matchNumber: ins[0].value,
                      mapName: ins[1].value,
                    });
                  }}
                >
                  SIMPAN REVISI
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a
                className="download-match-button"
                href={`/admin/desain-leaderboard?board=${detail.board.id}&match=${m.id}`}
                style={{ padding: "10px 14px", border: "1px solid #d7a936", background: "#d7a936", color: "#080604", fontSize: 9, fontWeight: 950, textDecoration: "none" }}
              >
                DOWNLOAD HASIL MATCH {m.matchNumber}
              </a>
              <button
                className="danger"
                onClick={() =>
                  confirm(`Hapus Match ${m.matchNumber}?`) &&
                  post({ action: "matchDelete", id: detail.board.id, matchId: m.id })
                }
              >
                HAPUS MATCH
              </button>
              {detail.board.activeMatchId!==m.id&&<button onClick={()=>post({action:"startMatch",id:detail.board.id,matchId:m.id})}>START MATCH</button>}
              {detail.board.activeMatchId===m.id&&!m.resultLocked&&<button className="gold-action" onClick={()=>post({action:"saveMatch",id:detail.board.id,matchId:m.id})}>SAVE MATCH</button>}
              {m.resultLocked&&<button onClick={()=>post({action:"unlockMatch",id:detail.board.id,matchId:m.id})}>EDIT / UNLOCK</button>}
            </div>
          </header>
          <div className="match-input-table">
            <b>SLOT</b>
            <b>NAMA</b>
            <b># RANK</b>
            <b>KILL</b>
            <b>POINT</b>
            <b>STATUS</b>
            {detail.teams.map((t) => {
              const k = `${m.id}-${t.id}`,
                v = draft[k] || { placement: "", eliminations: "" },
                saved = detail.results.find(
                  (r) => r.matchId === m.id && r.teamId === t.id,
                ),
                autoPreview = Number(detail.rule.placement[v.placement] || 0) + Number(v.eliminations || 0) * detail.rule.eliminationPoint,
                manualStillApplies=saved?.calculationMode==="manual"&&saved.manualPoints!=null&&saved.placement===Number(v.placement||0)&&saved.eliminations===Number(v.eliminations||0),
                preview=manualStillApplies?saved.manualPoints:autoPreview;
              return (
                <div className="match-input-row" key={t.id}>
                  <span>{t.slotNumber}</span>
                  <strong className="team-with-logo">
                    {t.logoUrl && <img src={t.logoUrl} alt="" />}
                    {t.name}
                  </strong>
                  <input
                    data-result-key={k}
                    inputMode="numeric"
                    min={1}
                    max={detail.teams.length || 24}
                    value={v.placement}
                    onChange={(e) =>
                      changeRank(m, t, e.target.value.replace(/\D/g, ""))
                    }
                    onBlur={() => void flushResult(m,t)}
                    placeholder="#"
                  />
                  <input
                    data-result-key={k}
                    inputMode="numeric"
                    min={0}
                    max={999}
                    value={v.eliminations}
                    onChange={(e) =>
                      changeKill(m, t, e.target.value.replace(/\D/g, ""))
                    }
                    onBlur={() => void flushResult(m,t)}
                    placeholder="0"
                  />
                  <b>{preview}</b>
                  <i>{saved?.calculationMode==="manual"?<><input type="number" min="0" defaultValue={saved.manualPoints??autoPreview} onBlur={e=>void queueResult(m,t,v,"manual",Number(e.target.value))}/><button onClick={()=>void queueResult(m,t,v,"auto")}>RESET TO AUTO</button></>:<><span>{saved ? "AUTO · TERSIMPAN" : "OTOMATIS"}</span>{saved&&<button onClick={()=>void queueResult(m,t,v,"manual",autoPreview)}>MANUAL OVERRIDE</button>}</>}</i>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <section className="standalone-leaderboard">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2>OVERALL LEADERBOARD</h2>
          <a
            href={`/admin/desain-leaderboard?board=${detail.board.id}&match=overall`}
            style={{ padding: "11px 15px", border: "1px solid #d7a936", background: "#d7a936", color: "#080604", fontSize: 9, fontWeight: 950, textDecoration: "none" }}
          >
            DOWNLOAD OVERALL PNG / JPG / PDF
          </a>
        </div>
        <div className="leaderboard-table">
          <header>
            <span>#</span>
            <span>TEAM / PLAYER</span>
            <span>M</span>
            <span>WWCD</span>
            <span>KILL</span>
            <span>PLACE</span>
            <span>TOTAL</span>
          </header>
          {ranking.map((x, i) => (
            <div key={x.id}>
              <b>{i + 1}</b>
              <span className="team-with-logo">
                {x.logoUrl ? (
                  <img src={x.logoUrl} alt="" />
                ) : (
                  <i>{x.slotNumber}</i>
                )}
                <strong>{x.name}</strong>
              </span>
              <span>{x.matches}</span>
              <span>{x.wwcd}</span>
              <span>{x.kills}</span>
              <span>{x.place}</span>
              <strong>{x.total}</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
