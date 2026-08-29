import { events, rupiah } from "@/lib/events";

export default function Home(){
  const featured = events.filter(e=>e.category==="Event Panboy" || e.category==="Event Premium");
  return <>
    <nav className="nav"><div className="wrap navin"><div className="brand">PANBOY</div><div className="menu"><a href="#event">ALL EVENT</a><a href="#panboy">EVENT PANBOY</a><a href="#topup">TOP UP UC</a><a href="#akun">JUAL AKUN</a><a href="#kerjasama">KERJA SAMA</a></div></div></nav>
    <main>
      <section className="hero"><div className="wrap"><h1><span className="gold">SEMUA EVENT PUBG MOBILE</span><br/>ADA DISINI</h1><p>Temukan event esports terbaru, pilih turnamenmu, dan daftarkan tim langsung melalui admin EVENT.</p><a className="cta" href="#event">LIHAT EVENT</a></div></section>
      <div className="marquee"><span>EVENT TERBARU • TURNAMEN PUBG MOBILE • REGISTRASI MUDAH • PANBOY • EVENT PREMIUM • EVENT OFFICIAL •</span></div>
      <section id="panboy"><div className="wrap"><div className="title"><div><h2>Event Pilihan</h2><p>Event Panboy & Event Premium</p></div></div><div className="grid">{featured.map(e=><EventCard key={e.id} e={e}/>)}</div></div></section>
      <section id="event"><div className="wrap"><div className="title"><div><h2>All Event</h2><p>Online, offline, premium, official.</p></div></div><div className="grid">{events.map(e=><EventCard key={e.id} e={e}/>)}</div></div></section>
      <section id="topup"><div className="wrap"><div className="adminbox"><h2>Top Up UC PUBG</h2><p>Modul katalog & order disiapkan agar nanti dapat dikelola admin.</p></div></div></section>
      <section id="akun"><div className="wrap"><div className="adminbox"><h2>Jual Akun PUBG</h2><p>Status order: Pesanan → Diproses → Selesai.</p></div></div></section>
      <section id="kerjasama"><div className="wrap"><div className="adminbox"><h2>Kerja Sama Event</h2><p>Hubungkan tombol ini ke WhatsApp admin untuk sponsorship, partnership, dan handle event.</p></div></div></section>
    </main>
    <footer className="footer"><div className="wrap"><strong>PANBOY</strong><br/>Website event PUBG Mobile — source mandiri di GitHub.</div></footer>
  </>
}

function EventCard({e}:{e:(typeof events)[number]}){
  const wa = e.adminWa ? `https://wa.me/${e.adminWa}?text=${encodeURIComponent("Halo admin, saya mau daftar "+e.name)}` : "#";
  return <article className="card"><div className="poster">POSTER EVENT</div><div className="meta"><h3>{e.name}</h3><div className="chips"><span className={`chip ${e.mode.toLowerCase()}`}>{e.mode}</span><span className="chip">{e.category}</span><span className="chip">{e.status}</span></div><div className="details"><div>Prizepool: <b>{rupiah(e.prizepool)}</b></div>{e.fee>0&&<div>Fee: <b>{rupiah(e.fee)}</b></div>}<div>Periode: {e.period}</div>{e.city&&<div>Kota: {e.city}</div>}</div><div style={{marginTop:14}}><a className="cta" href={wa} target="_blank">REGIST</a></div></div></article>
}
