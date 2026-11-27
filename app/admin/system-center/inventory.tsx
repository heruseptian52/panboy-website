"use client";
import {displaySize} from "../../../lib/display-size";
import {useState} from "react";
type Item={key:string;size:number;uploaded:string};
export default function Inventory(){
 const [files,setFiles]=useState<Item[]>([]),[cursor,setCursor]=useState<string|null>(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[query,setQuery]=useState(""),[sort,setSort]=useState("large"),[started,setStarted]=useState(false);
 async function load(reset=false){
 setBusy(true);setError("");
 try{const r=await fetch("/api/admin/system-center?"+new URLSearchParams({part:"inventory",cursor:reset?"":cursor||""}),{cache:"no-store",signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error();const result=await r.json();setFiles(prev=>reset?result.files:[...prev,...result.files]);setCursor(result.next);setStarted(true);}catch{setError("Inventaris gagal dimuat. Coba lagi.");}finally{setBusy(false);}
 }
 const shown=files.filter(f=>f.key.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==="large"?b.size-a.size:sort==="small"?a.size-b.size:sort==="new"?Date.parse(b.uploaded)-Date.parse(a.uploaded):Date.parse(a.uploaded)-Date.parse(b.uploaded));
 return <section id="inventory" className="sc-panel"><h2>Inventaris Media & Smart Cleanup</h2><p>Periksa lokasi file, ukuran dan tanggal upload. Status referensi belum diverifikasi; file hanya dapat ditinjau di sini.</p><div className="sc-toolbar"><button onClick={()=>load(true)} disabled={busy}>{busy?"Memuat…":"Muat inventaris"}</button><input type="search" placeholder="Cari nama atau folder" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Urutan file" value={sort} onChange={e=>setSort(e.target.value)}><option value="large">Terbesar</option><option value="small">Terkecil</option><option value="new">Terbaru</option><option value="old">Terlama</option></select></div><p role="status">{error || (started?shown.length+" hasil dari "+files.length+" file yang dimuat":"Belum diperiksa")}</p>{started&&<><div className="sc-scroll"><table><thead><tr><th>Lokasi file</th><th>Ukuran</th><th>Upload</th><th>Status</th></tr></thead><tbody>{shown.map(f=><tr key={f.key}><td>{f.key}</td><td>{displaySize(f.size)}</td><td>{new Date(f.uploaded).toLocaleDateString("id-ID")}</td><td>Perlu diperiksa</td></tr>)}</tbody></table></div>{cursor&&<button disabled={busy} onClick={()=>load()}>Muat 100 file berikutnya</button>}</>}</section>;
}
