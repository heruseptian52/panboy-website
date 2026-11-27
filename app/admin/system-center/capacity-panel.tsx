"use client";
import {displaySize} from "../../../lib/display-size";
import {useState} from "react";
type Table = {name:string; count:number};
type Report = {tables:Table[]; database:number|null; storage:number; files:number; checked:string; groups:Record<string,{count:number;bytes:number}>};
const size = (value:number|null) => displaySize(value,"MB");
export default function CapacityPanel() {
  const [report,setReport]=useState<Report|null>(null);
  const [health,setHealth]=useState<{checks:{name:string;ms:number;status:string}[];checked:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function scan() {
    setBusy(true); setError("");
    async function read(params:URLSearchParams) {
      const res=await fetch("/api/admin/system-center?"+params,{cache:"no-store",signal:AbortSignal.timeout(30000)});
      if (!res.ok) throw new Error();
      return res.json();
    }
    try {
      const tables:Table[]=[];
      let offset:number|null=0, database:number|null=null;
      do {
        const page=await read(new URLSearchParams({offset:String(offset)}));
        tables.push(...page.rows); database=page.bytes; offset=page.next;
      } while(offset!==null);
      let cursor:string|null="",storage=0,files=0;
      const groups:Report["groups"]={};
      do {
        const page=await read(new URLSearchParams({part:"storage",cursor:cursor || ""}));
        storage+=page.bytes; files+=page.count; cursor=page.next;
        for(const [name,g] of Object.entries(page.groups as Report["groups"])) {
          const total=groups[name] ??= {count:0,bytes:0}; total.count+=g.count; total.bytes+=g.bytes;
        }
      } while(cursor);
      setReport({tables,database,storage,files,groups,checked:new Date().toLocaleString("id-ID")});
    } catch {setError("Pemeriksaan tidak selesai. Coba lagi.");} finally {setBusy(false);}
  }
  async function checkHealth(){setBusy(true);setError("");try{const res=await fetch("/api/admin/system-center?part=health",{cache:"no-store"});if(!res.ok)throw new Error();setHealth(await res.json());}catch{setError("Pemeriksaan sistem gagal.");}finally{setBusy(false);}}
  return <section className="sc-panel" id="capacity"><h2>Database &amp; Storage</h2>
    <button disabled={busy} onClick={scan}>{busy?"Memeriksa…":"Periksa kapasitas"}</button>
    <p role="status">{error || (!report && !busy?"Belum diperiksa":"")}</p>
    {report && <><p>Database terpakai <strong>{size(report.database)}</strong></p><p>Storage terpakai <strong>{size(report.storage)}</strong> · {report.files} file</p>
    <p>Kuota maksimum tidak tersedia dari koneksi penyedia. Sisa dan persentase penggunaan belum dapat dihitung.</p>
    <h3>Rincian storage menurut lokasi upload</h3><div style={{overflowX:"auto"}}><table><thead><tr><th>Kategori</th><th>File</th><th>Ukuran</th><th>Bagian penggunaan</th></tr></thead><tbody>{Object.entries(report.groups).sort((a,b)=>b[1].bytes-a[1].bytes).map(([name,g])=><tr key={name}><td>{name}</td><td>{g.count}</td><td>{size(g.bytes)}</td><td>{report.storage?(100*g.bytes/report.storage).toFixed(1):0}%<div className="sc-meter"><i style={{width:(report.storage?100*g.bytes/report.storage:0)+"%"}}/></div></td></tr>)}</tbody></table></div>
    <small>Terakhir diperiksa {report.checked}</small><details><summary>Jumlah data per tabel ({report.tables.length})</summary><table><thead><tr><th>Tabel</th><th>Jumlah data</th></tr></thead><tbody>{report.tables.map(t=><tr key={t.name}><td>{t.name}</td><td>{t.count}</td></tr>)}</tbody></table></details></>}
    <h2 id="health" style={{marginTop:24}}>System Health</h2><button disabled={busy} onClick={checkHealth}>Periksa sistem</button>
    {health ? <><p>Terakhir diperiksa {new Date(health.checked).toLocaleString("id-ID")}</p>{health.checks.map(c=><p key={c.name}>{c.name} · <strong>{c.status}</strong> · {c.ms} ms</p>)}</> : <p>Database dan storage belum diperiksa.</p>}
    <p>Login, pembayaran, registrasi, upload, leaderboard dan layanan lain belum diperiksa.</p>
  </section>;
}
