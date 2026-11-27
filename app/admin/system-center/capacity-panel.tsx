"use client";
import {useState} from "react";
type Table = {name:string; count:number};
type Report = {tables:Table[]; database:number|null; storage:number; files:number; checked:string};
const size = (value:number|null) => value === null ? "Tidak tersedia" : value.toLocaleString("id-ID")+" byte";
export default function CapacityPanel() {
  const [report,setReport]=useState<Report|null>(null);
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
      do {
        const page=await read(new URLSearchParams({part:"storage",cursor:cursor || ""}));
        storage+=page.bytes; files+=page.count; cursor=page.next;
      } while(cursor);
      setReport({tables,database,storage,files,checked:new Date().toLocaleString("id-ID")});
    } catch {setError("Pemeriksaan tidak selesai. Coba lagi.");} finally {setBusy(false);}
  }
  return <section className="admin-card"><h2>Database &amp; Storage</h2>
    <button disabled={busy} onClick={scan}>{busy?"Memeriksa…":"Periksa kapasitas"}</button>
    <p role="status">{error || (!report && !busy?"Belum diperiksa":"")}</p>
    {report && <><p>Database terpakai <strong>{size(report.database)}</strong></p><p>Storage terpakai <strong>{size(report.storage)}</strong> · {report.files} file</p>
    <p>Kuota maksimum tidak tersedia dari koneksi penyedia. Sisa dan persentase penggunaan belum dapat dihitung.</p>
    <small>Terakhir diperiksa {report.checked}</small><details><summary>Jumlah data per tabel ({report.tables.length})</summary><table><thead><tr><th>Tabel</th><th>Jumlah data</th></tr></thead><tbody>{report.tables.map(t=><tr key={t.name}><td>{t.name}</td><td>{t.count}</td></tr>)}</tbody></table></details></>}
  </section>;
}
