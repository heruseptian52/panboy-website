import { getSettings } from "../../lib/settings";
import { normalizeWhatsapp } from "../../lib/events";
import { getCommunityMembers } from "../../lib/members";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Community Profile · Panboy Community",
  description:
    "Wadah kolaborasi antar-klan PUBG Mobile untuk terhubung, berbagi, dan berkembang bersama.",
};

const pillars = [
  [
    "CONNECT",
    "Menghubungkan owner dan pengurus klan PUBG Mobile dalam satu jaringan komunitas.",
  ],
  ["SHARE", "Berbagi pengalaman, informasi, ide, dan perkembangan antar-klan."],
  ["COLLABORATE", "Membuka kesempatan membuat event dan program bersama."],
  ["GROW", "Membangun exposure, relasi, dan peluang baru untuk setiap klan."],
];
const benefits = [
  ["EVENT RUTIN", "Event komunitas minimal 1–2 bulan sekali."],
  ["SHARING & NETWORKING", "Ruang berdiskusi dan membangun koneksi."],
  ["COLLABORATION EVENT", "Kesempatan menjalankan event bersama klan lain."],
  ["PROMOSI EVENT", "Membantu publikasi dan exposure event member."],
  ["DESIGN SUPPORT", "Dukungan desain untuk program dan event tertentu."],
  ["LIVE STREAMING", "Dukungan live streaming untuk program komunitas."],
  [
    "WEBSITE MEMBER",
    "Nama dan logo klan tampil sebagai bagian dari komunitas.",
  ],
  ["EVENT TOOLS", "Akses hitung poin dan leaderboard yang praktis."],
  ["UPLOAD EVENT", "Kesempatan mengelola dan mempublikasikan event."],
  ["NETWORK & PARTNERSHIP", "Peluang kolaborasi dengan sponsor dan partner."],
];
function MarkIcon({ index }: { index: number }) {
  const icons = ["◎", "◈", "↗", "✦", "◉", "◇", "▣", "⌁", "＋", "∞"];
  return (
    <span className="community-mark-icon" aria-hidden="true">
      <b>{icons[index % icons.length]}</b>
      <small>{String(index + 1).padStart(2, "0")}</small>
    </span>
  );
}
function TierIcon({ type }: { type: "c" | "s" }) {
  return (
    <span
      className={`community-tier-icon community-tier-icon-${type}`}
      aria-hidden="true"
    >
      {type === "s" ? (
        <svg viewBox="0 0 64 64" fill="none">
          <path
            d="m32 5 7.5 16.2L57 23.8 44.5 36l3 17.5L32 45.2 16.5 53l3-17.5L7 23.8l17.5-2.6L32 5Z"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="m32 14 4.8 10.2 11.2 1.6-8 7.8 1.9 11.1L32 39.4l-9.9 5.3L24 33.6l-8-7.8 11.2-1.6L32 14Z"
            fill="currentColor"
            opacity=".25"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 64 64" fill="none">
          <path
            d="M13 12h38v13c0 13-8 23-19 27C21 48 13 38 13 25V12Z"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M13 18H5v6c0 8 5 13 12 14M51 18h8v6c0 8-5 13-12 14"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path d="M24 56h16M32 52v4" stroke="currentColor" strokeWidth="3" />
          <path
            d="m32 19 3.5 7.2 8 1.2-5.8 5.7 1.4 8L32 37.3l-7.1 3.8 1.4-8-5.8-5.7 8-1.2L32 19Z"
            fill="currentColor"
          />
        </svg>
      )}
    </span>
  );
}
export default async function CommunityProfile() {
  const [settings, members] = await Promise.all([
    getSettings(),
    getCommunityMembers(),
  ]);
  let copy: Record<string, string> = {};
  try {
    copy = JSON.parse(settings.communityProfileTextJson || "{}");
  } catch {}
  const t = (key: string, fallback: string) => copy[key]?.trim() || fallback;
  let management: { photoUrl?: string; name?: string; role?: string }[] = [];
  try {
    management = JSON.parse(settings.memberManagementJson || "[]");
  } catch {
    management = [];
  }
  const managementPhotos = management.filter((item) => item?.photoUrl);
  const joinUrl = `https://wa.me/${normalizeWhatsapp(settings.memberWhatsapp || settings.collabWhatsapp)}?text=${encodeURIComponent("Halo Panboy, saya ingin bergabung dengan Panboy Community.")}`;
  const style = {
    "--gold": settings.primaryColor,
    "--black": settings.backgroundColor,
  } as CSSProperties;
  return (
    <main className="community-profile" style={style}>
      <header className="community-profile-nav">
        <a href="/">
          <img src={settings.logoUrl || "/panboy-menu-logo.png"} alt="Panboy" />
          <span>
            PANBOY<small>COMMUNITY PROFILE</small>
          </span>
        </a>
        <a href="/">← BERANDA</a>
      </header>
      <section className="community-profile-hero">
        <div className="community-profile-hero-copy">
          <small>OFFICIAL COMMUNITY PROFILE</small>
          <h1>
            CONNECT.
            <br />
            <em>SHARE.</em>
            <br />
            GROW TOGETHER.
          </h1>
          <p>
            Wadah bagi klan PUBG Mobile, owner, dan pengurus untuk terhubung,
            berbagi pengalaman, membuat event, dan membangun peluang bersama.
          </p>
          <a
            className="community-profile-cta"
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
          >
            GABUNG PANBOY COMMUNITY <b>↗</b>
          </a>
        </div>
        <div
          className="community-profile-visual"
          aria-label="Logo Panboy Community"
        >
          <div className="community-profile-slide">
            <img
              src={settings.logoUrl || "/panboy-menu-logo.png"}
              alt="Panboy Community"
            />
          </div>
        </div>
      </section>
      <section className="community-profile-intro">
        <div>
          <small>TENTANG PANBOY COMMUNITY</small>
          <h2>
            SATU WADAH.
            <br />
            <em>BANYAK KLAN.</em>
          </h2>
        </div>
        <p>
          Panboy Community tidak mengambil alih identitas setiap klan. Nama,
          owner, pengurus, dan komunitas masing-masing tetap berdiri sendiri.
          Yang kami satukan adalah koneksi, komunikasi, ide, event, kolaborasi,
          dan kesempatan untuk berkembang bersama.
        </p>
      </section>
      <section className="community-pillars">
        <div className="community-section-heading">
          <small>OUR FOUNDATION</small>
          <h2>
            CONNECT <em>•</em> SHARE <em>•</em> COLLABORATE <em>•</em> GROW
          </h2>
        </div>
        <div className="community-pillar-grid">
          {pillars.map(([title, text], index) => (
            <article key={title}>
              <MarkIcon index={index} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="community-membership">
        <div className="community-section-heading">
          <small>MEMBERSHIP PANBOY COMMUNITY</small>
          <h2>
            PILIH LEVEL.
            <br />
            <em>BERKEMBANG BERSAMA.</em>
          </h2>
          <p>
            Program membership dibuat ringan, terbuka, dan terus dikembangkan
            mengikuti pertumbuhan komunitas, sponsor, dan partner.
          </p>
        </div>
        <div className="community-tier-grid">
          <article>
            <TierIcon type="c" />
            <span>TIER C</span>
            <strong>
              Rp10.000 <small>/ BULAN</small>
            </strong>
            <b>PRIZE POOL MULAI Rp1.000.000</b>
            <p>
              Pilihan ringan untuk membangun koneksi dan berkembang bersama
              Panboy Community.
            </p>
            <a href={joinUrl} target="_blank" rel="noreferrer">
              MINAT TIER C ↗
            </a>
          </article>
          <article className="featured">
            <TierIcon type="s" />
            <span>TIER S</span>
            <strong>
              Rp100.000 <small>/ BULAN</small>
            </strong>
            <b>PRIZE POOL Rp3.000.000 – Rp5.000.000</b>
            <p>
              Untuk team profesional komunitas. Event berjalan dengan sistem
              liga, prize pool Rp3–5 juta, serta tetap mendapat tools
              leaderboard dan hitung poin.
            </p>
            <a href={joinUrl} target="_blank" rel="noreferrer">
              MINAT TIER S ↗
            </a>
          </article>
        </div>
      </section>
      <section className="community-benefits">
        <div className="community-section-heading">
          <small>BENEFIT MEMBER</small>
          <h2>
            LEBIH BANYAK
            <br />
            <em>PELUANG.</em>
          </h2>
        </div>
        <div className="community-benefit-grid">
          {benefits.map(([title, text], index) => (
            <article key={title}>
              <MarkIcon index={index} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="community-profile-final">
        <small>OUR COMMUNITY</small>
        <h2>
          Bukan tentang siapa yang paling besar.
          <br />
          <em>Tetapi tentang bagaimana kita tumbuh bersama.</em>
        </h2>
        <p>
          Setiap klan punya tempat untuk berkembang, berdiskusi, dan menciptakan
          sesuatu yang lebih besar.
        </p>
        <a
          className="community-profile-cta"
          href={joinUrl}
          target="_blank"
          rel="noreferrer"
        >
          SIAP BERGABUNG? <b>↗</b>
        </a>
      </section>
      <footer className="community-profile-footer">
        <img src={settings.logoUrl || "/panboy-menu-logo.png"} alt="Panboy" />
        <span>
          PANBOY COMMUNITY
          <br />
          <small>SHARE • CONNECT • COLLABORATE • GROW</small>
        </span>
      </footer>
    </main>
  );
}
