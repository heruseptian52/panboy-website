"use client";
import {useEffect,useRef,useState} from "react";
import type {RosterOptions} from "../../../lib/roster-options";
import {teamWhatsAppUrl} from "../../../lib/roster-whatsapp";
import "../style.css";

type Saved = {title:string; teamName:string; contactPhone:string; groupUrl:string; players:{nick:string;playerId:string}[]; zones:string[]; logoName:string; options:RosterOptions};
export default function Success(){
  const [saved,setSaved]=useState<Saved|null>(null),[editLink,setEditLink]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[redirecting,setRedirecting]=useState(false);
  const whatsappOpened=useRef(false);
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    const event=params.get("event"), token=params.get("token");
    setRedirecting(params.get("wa")==="1");
    if(!event||!token){setError("Tautan konfirmasi tidak tersedia.");return}
    const edit=new URL("/data-event",location.origin);
    edit.search=new URLSearchParams({event,token}).toString();
    setEditLink(edit.href);
    fetch("/api/roster-events?"+new URLSearchParams({id:event,token}),{cache:"no-store"})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setSaved(data)})
      .catch(e=>setError(e.message||"Data gagal dimuat. Muat ulang halaman."));
  },[]);
  useEffect(()=>{
    if(!saved||whatsappOpened.current||new URLSearchParams(location.search).get("wa")!=="1")return;
    whatsappOpened.current=true;
    const current=new URL(location.href);
    current.searchParams.delete("wa");
    history.replaceState(history.state,"",current.href);
    location.assign(saved.groupUrl || teamWhatsAppUrl(saved.teamName));
  },[saved]);
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
  if(redirecting&&!error)return <main className="roster-page"><section className="roster-panel roster-success" role="status"><div className="success-mark">✓</div><h1>BERHASIL</h1><p>Mohon ditunggu, Anda sedang diarahkan ke WhatsApp event...</p><progress className="roster-redirect-progress"/>{saved&&<a className="success-back" href={saved.groupUrl||teamWhatsAppUrl(saved.teamName)} rel="noreferrer">Buka WhatsApp jika belum dialihkan</a>}</section></main>;
  return <main className="roster-page"><header><a href="/">← BERANDA</a><strong>PANBOY COMMUNITY</strong><a href="/data-event">FORM DATA</a></header>
    <section className="roster-panel roster-success"><h1>{saved?"Data team berhasil disimpan":error||"Memuat data team…"}</h1>
    {saved&&<><p><strong>{saved.teamName}</strong> · {saved.title}</p>
    {saved.groupUrl?<><p>Grup WhatsApp event terbuka otomatis. Link undangan grup tidak dapat mengisi pesan secara langsung; untuk mengirim nama team, gunakan tombol di bawah lalu pilih grup event dan tekan Kirim.</p>
    <a className="primary success-cta" href={saved.groupUrl} target="_blank" rel="noopener noreferrer">BUKA GRUP EVENT ↗</a>
    <a className="primary success-cta" href={teamWhatsAppUrl(saved.teamName)} target="_blank" rel="noopener noreferrer">KIRIM NAMA TEAM KE GRUP ↗</a></>:
    <><p>WhatsApp terbuka dengan nama team siap kirim. Pilih penerima lalu tekan kirim.</p><a className="primary success-cta" href={teamWhatsAppUrl(saved.teamName)} target="_blank" rel="noopener noreferrer">BUKA WHATSAPP DENGAN NAMA TEAM ↗</a><a className="success-back" href={`https://wa.me/6281545910291?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">KONFIRMASI KE ADMIN VIA WHATSAPP ↗</a></>}</>}
    {editLink&&<div className="success-edit"><strong>Link edit pribadi team</strong><p>Simpan link ini untuk mengubah nama team dan isian sebelum batas edit. Jika lupa, minta link ke admin event.</p>
    <input aria-label="Link edit pribadi" value={editLink} readOnly onFocus={e=>e.target.select()}/>
    <button onClick={()=>copy(editLink,"Link edit pribadi tersalin.")}>SALIN LINK EDIT</button> <a href={editLink}>EDIT DATA TEAM</a></div>}
    <p role="status">{notice}</p><a className="success-back" href="/data-event">Kembali ke formulir</a></section></main>;
}
