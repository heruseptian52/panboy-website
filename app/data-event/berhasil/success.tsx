"use client";
import {useEffect,useState} from "react";
import type {RosterOptions} from "../../../lib/roster-options";
import "../style.css";

type Saved = {title:string; teamName:string; contactPhone:string; groupUrl:string; players:{nick:string;playerId:string}[]; zones:string[]; logoName:string; options:RosterOptions};
export default function Success(){
  const [saved,setSaved]=useState<Saved|null>(null),[editLink,setEditLink]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    const event=params.get("event"), token=params.get("token");
    if(!event||!token){setError("Tautan konfirmasi tidak tersedia.");return}
    const edit=new URL("/data-event",location.origin);
    edit.search=new URLSearchParams({event,token}).toString();
    setEditLink(edit.href);
    fetch("/api/roster-events?"+new URLSearchParams({id:event,token}),{cache:"no-store"})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setSaved(data)})
      .catch(e=>setError(e.message||"Data gagal dimuat. Muat ulang halaman."));
  },[]);
  const summary=saved ? [
    saved.title,"Team: "+saved.teamName,
    ...(saved.options.phoneEnabled&&saved.contactPhone?["Nomor HP: "+saved.contactPhone]:[]),
    ...(saved.options.playersEnabled?saved.players.map((p,i)=>`${i+1}. ${p.nick} · ${p.playerId}`):[]),
    ...(saved.options.zonesEnabled?saved.options.maps.map((m,i)=>m+": "+(saved.zones[i]||"—")):[]),
    ...(saved.options.logoEnabled&&saved.logoName?["Logo: "+saved.logoName]:[])
  ].join("\n") : "";
  async function copy(value:string,message:string){
    try{await navigator.clipboard.writeText(value);setNotice(message)}
    catch{setNotice("Tekan lama pada teks di bawah lalu pilih Salin.")}
  }
  return <main className="roster-page"><header><a href="/">← BERANDA</a><strong>PANBOY COMMUNITY</strong><a href="/data-event">FORM DATA</a></header>
    <section className="roster-panel roster-success"><h1>{saved?"Data team berhasil disimpan":error||"Memuat data team…"}</h1>
    {saved&&<><p><strong>{saved.teamName}</strong> · {saved.title}</p>
    {saved.groupUrl?<><p>Gabung ke grup event dahulu. Setelah itu buka pesan siap kirim, pilih grup event, lalu tekan kirim di WhatsApp.</p>
    <a className="primary success-cta" href={saved.groupUrl} target="_blank" rel="noopener noreferrer">GABUNG GRUP WHATSAPP ↗</a>
    <a className="primary success-cta" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">KIRIM DATA KE WHATSAPP ↗</a></>:
    <a className="primary success-cta" href={`https://wa.me/6281545910291?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">KONFIRMASI KE ADMIN VIA WHATSAPP ↗</a>}</>}
    {editLink&&<div className="success-edit"><strong>Link edit pribadi team</strong><p>Simpan link ini untuk mengubah nama team dan isian sebelum batas edit. Jika lupa, minta link ke admin event.</p>
    <input aria-label="Link edit pribadi" value={editLink} readOnly onFocus={e=>e.target.select()}/>
    <button onClick={()=>copy(editLink,"Link edit pribadi tersalin.")}>SALIN LINK EDIT</button> <a href={editLink}>EDIT DATA TEAM</a></div>}
    <p role="status">{notice}</p><a className="success-back" href="/data-event">Kembali ke formulir</a></section></main>;
}
