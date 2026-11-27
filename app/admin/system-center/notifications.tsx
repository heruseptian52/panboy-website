"use client";
import {useState} from "react";
const items=[
 {key:"registrations",label:"Pengajuan member baru",href:"/admin/member/pendaftaran"},
 {key:"payments",label:"Pembayaran iuran",href:"/admin/member-dues/pembayaran"},
 {key:"market",label:"Pengajuan Esports Market",href:"/admin/esports-market"},
 {key:"roster",label:"Roster perlu ditinjau",href:"/admin/data-event"}
] as const;
export default function Notifications(){
 const [counts,setCounts]=useState<Record<string,number>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function refresh(){setBusy(true);setError("");try{const r=await fetch("/api/admin/member-alerts",{cache:"no-store",signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error();setCounts(await r.json());}catch{setError("Notifikasi gagal dimuat.");}finally{setBusy(false);}}
 return <section className="sc-panel" id="notifications"><h2>Notification Center</h2><p>Jumlah pengajuan dan data yang masih perlu ditinjau.</p><button onClick={refresh} disabled={busy}>{busy?"Memuat…":"Periksa notifikasi"}</button><p role="status">{error||(!counts?"Belum diperiksa":"")}</p>{counts&&<div className="sc-grid">{items.map(i=><a key={i.key} className="sc-card" href={i.href}><h2>{i.label}</h2><strong style={{fontSize:30,color:"#dcb55e"}}>{counts[i.key]??"Tidak tersedia"}</strong><span className="sc-arrow">Buka data ↗</span></a>)}</div>}</section>;
}
