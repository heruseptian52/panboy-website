import type { CSSProperties } from "react";
import { getSettings } from "../../lib/settings";
import ServiceOrder from "../jasa-design/service-order";
import {getCasterProfiles} from "../../lib/caster-profiles";
import "../jasa-design/jasa-design.css";
import "../jasa-design/service-nav.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jasa Live Streaming Esports | Panboy" };

const services = [
  ["LIVE YOUTUBE", "Siaran pertandingan langsung ke YouTube untuk menjangkau penonton event kamu."],
  ["1–2 OBSERVER", "Pilihan observer sesuai kebutuhan pertandingan, termasuk paket dual observer."],
  ["OVERLAY & SCOREBOARD", "Tampilan live dilengkapi overlay dan scoreboard agar pertandingan mudah diikuti."],
  ["SPONSOR DISPLAY", "Penempatan materi sponsor di tampilan live sesuai aset yang disiapkan."],
  ["CASTER VIA DISCORD", "Dukungan caster melalui Discord dapat disesuaikan dengan kebutuhan event."],
  ["REPLAY & HIGHLIGHT", "Dukungan replay dan highlight untuk menangkap momen penting pertandingan."],
];

function StreamIcon({index}:{index:number}){
  const drawings=[<><rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 10 4-2v8l-4-2m-9-4 4 2-4 2z"/></>,<><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3M7 21h11"/></>,<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 15h3m3 0h3"/></>,<><path d="M4 8h16v10H4zM7 8V5h10v3m-7 5h4"/></>,<><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></>,<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 8 6 4-6 4V8z"/></>];
  return <span className="stream-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{drawings[index]}</svg></span>;
}

export default async function Page() {
  const [s,casters] = await Promise.all([getSettings(),getCasterProfiles()]);
  const wa = String(s.memberWhatsapp || s.collabWhatsapp || "").replace(/\D/g, "");
  const style = { "--gold": s.primaryColor, "--black": s.backgroundColor } as CSSProperties;
  return <main className="design-page" style={style}>
    <header className="design-nav"><a href="/"><img src={s.logoUrl} alt="Panboy"/><span>PANBOY<small>COMMUNITY</small></span></a><a href="/">← BERANDA</a></header>
    <nav className="service-switch"><a href="/jasa-design">JASA DESIGN</a><a href="/handle-event">HANDLE EVENT</a><a className="active" href="/live-streaming">LIVE STREAMING</a></nav>
    <section className="design-hero"><small>ESPORTS BROADCAST SERVICES</small><h1>LIVE <em>STREAMING</em></h1><p>Buat turnamen kamu tampil lebih profesional melalui siaran YouTube dengan observer, overlay, scoreboard, sponsor, dan dukungan produksi.</p><a className="design-button" href="#pilih-layanan">PILIH PAKET ↘</a></section>
    <section className="design-section stream-services-section"><div className="design-heading"><small>BROADCAST SUPPORT</small><h2>LAYANAN <em>STREAMING</em></h2></div><div className="design-services">{services.map(([name,description],i)=><article key={name} className="design-card"><StreamIcon index={i}/><h3>{name}</h3><p>{description}</p><a className="design-link" href="#pilih-layanan">PILIH PAKET ↘</a></article>)}</div><p className="service-note">Kebutuhan teknis, jumlah match, observer, caster, dan materi sponsor dapat dikonsultasikan terlebih dahulu.</p></section>
    <ServiceOrder kind="stream" whatsapp={wa} casters={casters}/>
    <a className="design-float" href="#pilih-layanan" aria-label="Pilih paket Live Streaming">PILIH</a>
  </main>;
}
