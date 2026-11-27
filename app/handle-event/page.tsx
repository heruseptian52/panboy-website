import type { CSSProperties } from "react";
import { getSettings } from "../../lib/settings";
import ServiceOrder from "../jasa-design/service-order";
import "../jasa-design/jasa-design.css";
import "../jasa-design/service-nav.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jasa Handle Event Esports | Panboy" };

const services = [
  ["FREE ROOM ESPORT", "Room esport untuk pertandingan."],
  ["OPEN ROOM", "Membuka dan menyiapkan room sesuai jadwal match."],
  ["SPECTED", "Memantau jalannya pertandingan."],
  ["HITUNG POINT", "Menghitung poin pertandingan dan hasil team."],
];

export default async function Page() {
  const s = await getSettings();
  const wa = String(s.memberWhatsapp || s.collabWhatsapp || "").replace(/\D/g, "");
  const style = { "--gold": s.primaryColor, "--black": s.backgroundColor } as CSSProperties;
  return <main className="design-page" style={style}>
    <header className="design-nav"><a href="/"><img src={s.logoUrl} alt="Panboy"/><span>PANBOY<small>COMMUNITY</small></span></a><a href="/">← BERANDA</a></header>
    <nav className="service-switch"><a href="/jasa-design">JASA DESIGN</a><a className="active" href="/handle-event">HANDLE EVENT</a><a href="/live-streaming">LIVE STREAMING</a></nav>
    <section className="design-hero"><small>ESPORTS EVENT OPERATIONS</small><h1>HANDLE <em>EVENT</em></h1><p>Kami bantu operasional turnamen dari pendaftaran hingga rekap hasil, agar event kamu berjalan lebih rapi dan terarah.</p><div className="service-price"><span>MULAI DARI</span><strong>Rp75.000</strong><small>/ HARI · MAKS. 4 GRUP</small></div><a className="design-button" href="#pilih-layanan">PILIH LAYANAN ↘</a></section>
    <section className="design-section"><div className="design-heading"><small>WHAT WE HANDLE</small><h2>LAYANAN <em>EVENT</em></h2></div><div className="design-services">{services.map(([name,description],i)=><article key={name} className="design-card"><span className="design-icon">0{i+1}</span><h3>{name}</h3><p>{description}</p><a className="design-link" href="#pilih-layanan">PILIH LAYANAN ↘</a></article>)}</div><p className="service-note">Harga paket berlaku hingga 4 grup. Event dengan lebih dari 4 grup akan dikenakan biaya tambahan sesuai kebutuhan.</p></section>
    <ServiceOrder kind="event" whatsapp={wa}/>
    <a className="design-float" href="#pilih-layanan" aria-label="Pilih layanan Handle Event">PILIH</a>
  </main>;
}
