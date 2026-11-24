"use client";
import { uploadForm } from "../../lib/upload-form";
import { useEffect, useMemo, useState } from "react";
import PlayerPhoto from "./player-photo";
import type { CommunityMember } from "../../lib/members";
import type { MemberBenefit } from "../../lib/member-benefits";
import { BenefitIcon } from "./benefit-icon";
type MemberConfig = {
  memberWhatsapp: string;
  memberWhatsappMessage: string;
  memberJoinText: string;
  memberRegistrationStatus: string;
  memberBenefitVisible: string;
  memberBenefitTitle: string;
  memberBenefitSubtitle: string;
  memberBenefitIntro: string;
  memberBenefitBanner: string;
  memberBenefitVideo: string;
  memberHowToVisible: string;
  memberHowToTitle: string;
  memberHowToSteps: string;
};
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </svg>
  );
}
function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="fill-dot"
        d="M14.2 3h3.1c.3 2.3 1.6 3.7 3.7 4v3.1a8.5 8.5 0 0 1-3.7-1.2v6.2a6.1 6.1 0 1 1-6.1-6.1c.4 0 .8 0 1.2.1v3.2a3 3 0 1 0 1.8 2.8V3Z"
      />
    </svg>
  );
}
function embedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").pop();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
  } catch {}
  return "";
}
function Media({ url, title }: { url: string; title: string }) {
  if (!url) return null;
  const embed = embedUrl(url);
  return embed ? (
    <iframe
      src={embed}
      title={title}
      allow="encrypted-media; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  ) : /\.(mp4|webm)(\?|$)/i.test(url) || url.startsWith("/api/images/") ? (
    <video src={url} controls preload="metadata" playsInline />
  ) : (
    <a
      className="benefit-media-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      LIHAT VIDEO ↗
    </a>
  );
}
export default function MemberBrowser({
  members,
  benefits,
  config,
}: {
  members: CommunityMember[];
  benefits: MemberBenefit[];
  config: MemberConfig;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [registrationOpen, setRegistrationOpen] = useState(false),
    [registrationType, setRegistrationType] = useState<"team" | "organizer">("team"),
    [registration, setRegistration] = useState({
      teamName: "",
      ownerName: "",
      managementName: "",
      whatsapp: "",
      instagram: "",
      tiktok: "",
      logoUrl: "",
    }),
    [registrationMsg, setRegistrationMsg] = useState(""),
    [registrationBusy, setRegistrationBusy] = useState(false),
    [logoUploading, setLogoUploading] = useState(false),
    filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      const matches = q
        ? members.filter((x) => x.teamName.toLowerCase().includes(q))
        : members;
      // Keep the admin's relative order within each group.
      return [...matches.filter((x) => x.playerPhoto1Url || x.playerPhoto2Url),
        ...matches.filter((x) => !x.playerPhoto1Url && !x.playerPhoto2Url)];
    }, [members, query]),
    isOpen = config.memberRegistrationStatus !== "CLOSE",
    showBenefits = config.memberBenefitVisible === "true";
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const joinButton = (
    label: string,
    className = "",
    type: "team" | "organizer" = "team",
  ) =>
    isOpen ? (
      <button
        className={className}
        onClick={() => {
          setRegistrationMsg("");
          setRegistrationType(type);
          setRegistrationOpen(true);
        }}
        data-track={label}
      >
        {label}
      </button>
    ) : (
      <span className={`member-closed ${className}`}>
        PENDAFTARAN MEMBER SEDANG DITUTUP
      </span>
    );
  return (
    <>
      <div className="member-actions">
        {joinButton(config.memberJoinText || "GABUNG MEMBER", "member-join")}
        {joinButton(
          "GABUNG MEMBER ORGANIZER",
          "member-organizer-join",
          "organizer",
        )}
        {showBenefits && (
          <button onClick={() => setOpen(true)} data-track="BENEFIT BERGABUNG">
            BENEFIT BERGABUNG
          </button>
        )}
      </div>
      {registrationOpen && (
        <div className="benefit-modal" role="dialog" aria-modal="true">
          <form
            className="benefit-dialog member-registration-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setRegistrationBusy(true);
              const r = await fetch("/api/member-registrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(registration),
                }),
                x = await r.json();
              setRegistrationBusy(false);
              if (!r.ok)
                return setRegistrationMsg(x.error || "Gagal mengirim data.");
              setRegistrationMsg(
                "Data berhasil dikirim. Menunggu konfirmasi admin.",
              );
              const adminNumber = config.memberWhatsapp.replace(/\D/g, "");
              if (adminNumber) {
                const adminMessage = [
                  `Halo Admin Panboy, ada pendaftaran member ${registrationType === "organizer" ? "organizer " : ""}baru.`,
                  "",
                  `${registrationType === "organizer" ? "Organizer" : "Team"}: ${registration.teamName}`,
                  registration.ownerName && `Owner: ${registration.ownerName}`,
                  registration.managementName && `Manager: ${registration.managementName}`,
                  `WhatsApp: ${registration.whatsapp}`,
                ].filter((line) => line !== false && line !== "").join("\n");
                window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(adminMessage)}`, "_blank", "noopener,noreferrer");
              }
              setRegistration({
                teamName: "",
                ownerName: "",
                managementName: "",
                whatsapp: "",
                instagram: "",
                tiktok: "",
                logoUrl: "",
              });
            }}
          >
            <button
              type="button"
              className="benefit-close"
              onClick={() => setRegistrationOpen(false)}
            >
              ×
            </button>
            <h2>
              {registrationType === "organizer"
                ? "GABUNG MEMBER ORGANIZER"
                : "GABUNG MEMBER"}
            </h2>
            <p>
              Isi data {registrationType === "organizer" ? "organizer" : "team"} untuk diverifikasi admin.
            </p>
            {(
              [
                [
                  "teamName",
                  registrationType === "organizer"
                    ? "NAMA ORGANIZER"
                    : "NAMA TEAM",
                ],
                ["ownerName", "NAMA OWNER (OPSIONAL)"],
                ["managementName", "NAMA MANAGER (OPSIONAL)"],
                ["whatsapp", "NOMOR WHATSAPP"],
                ["instagram", "INSTAGRAM (OPSIONAL)"],
                ["tiktok", "TIKTOK (OPSIONAL)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={key === "teamName" || key === "whatsapp"}
                  value={registration[key]}
                  onChange={(e) =>
                    setRegistration({ ...registration, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              {registrationType === "organizer" ? "LOGO ORGANIZER (OPSIONAL)" : "LOGO TEAM (OPSIONAL)"}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoUploading(true);
                  setRegistrationMsg("Logo sedang diunggah...");
                  const f = new FormData();
                  f.append("logo", file);
                  try {
                    const r = await uploadForm("/api/uploads/team-logo", { method: "POST", body: f });
                    const x = await r.json();
                    if (!r.ok) throw new Error(x.error || "Upload logo gagal.");
                    setRegistration((current) => ({ ...current, logoUrl: x.url }));
                    setRegistrationMsg("Logo berhasil diunggah.");
                  } catch (error) {
                    setRegistrationMsg(error instanceof Error ? error.message : "Upload logo gagal.");
                  } finally {
                    setLogoUploading(false);
                  }
                }}
              />
            </label>
            {registration.logoUrl && (
              <img
                className="admin-media-preview"
                src={registration.logoUrl}
                alt={registrationType === "organizer" ? "Logo organizer" : "Logo team"}
              />
            )}
            {registrationMsg && (
              <p className="form-message">{registrationMsg}</p>
            )}
            <button disabled={registrationBusy || logoUploading}>
              {registrationBusy ? "MENGIRIM..." : logoUploading ? "MENGUNGGAH LOGO..." : "KIRIM PENDAFTARAN"}
            </button>
          </form>
        </div>
      )}
      <div className="member-toolbar">
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama team..."
            aria-label="Cari nama team"
          />
        </label>
        <strong>{filtered.length} TEAM</strong>
      </div>
      {filtered.length ? (
        <div className="member-grid">
          {filtered.map((item) => {
            const photos = [item.playerPhoto1Url, item.playerPhoto2Url].filter(Boolean);
            return (
              <article
                className={`member-card ${photos.length ? "has-player-photos" : "no-player-photos"}`}
                key={item.id}
              >
                {photos.length > 0 && (
                  <div
                    className={`member-player-photos count-${photos.length}`}
                  >
                    {item.playerPhoto1Url && (
                      <PlayerPhoto src={item.playerPhoto1Url} alt={`Player 1 ${item.teamName}`}
                        x={item.playerPhoto2Url ? item.playerPhoto1X : 50 + (item.playerPhoto1X - 42)}
                        y={item.playerPhoto1Y} scale={item.playerPhoto1Scale} />
                    )}
                    {item.playerPhoto2Url && (
                      <PlayerPhoto src={item.playerPhoto2Url} alt={`Player 2 ${item.teamName}`}
                        x={item.playerPhoto1Url ? item.playerPhoto2X : 50 + (item.playerPhoto2X - 58)}
                        y={item.playerPhoto2Y} scale={item.playerPhoto2Scale}
                        front={Boolean(item.playerPhoto1Url)} />
                    )}
                  </div>
                )}
                <div className="member-logo">
                  {item.logoUrl ? (
                    <img
                      src={item.logoUrl}
                      alt={`Logo ${item.teamName}`}
                      style={{
                        transform: photos.length
                          ? `translate(${item.logoX}%,${item.logoY}%) scale(${item.logoScale / 100})`
                          : `translate(${Math.max(-8, Math.min(8, item.logoX))}%,${Math.max(-8, Math.min(8, item.logoY))}%) scale(${Math.min(1.15, item.logoScale / 100)})`,
                      }}
                    />
                  ) : (
                    <b className="member-logo-fallback">
                      {item.teamName.slice(0, 3).toUpperCase()}
                    </b>
                  )}
                </div>
                <h2>{item.teamName}</h2>
                <div
                  className={`member-status ${item.active ? "active" : "inactive"}`}
                >
                  <b>
                    {item.active ? "AKTIF" : "NONAKTIF"}
                  </b>
                  {item.membershipEnd && (
                    <span>
                      sampai{" "}
                      {new Date(
                        `${item.membershipEnd}T00:00:00`,
                      ).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {(item.instagramUrl || item.tiktokUrl) && (
                  <div className="member-socials">
                    {item.instagramUrl && (
                      <a
                        href={item.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Instagram ${item.teamName}`}
                        title={item.instagramUsername}
                      >
                        <InstagramIcon />
                      </a>
                    )}
                    {item.tiktokUrl && (
                      <a
                        href={item.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`TikTok ${item.teamName}`}
                        title={item.tiktokUsername}
                      >
                        <TiktokIcon />
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="member-empty">
          {members.length
            ? "TIDAK ADA MEMBER YANG COCOK DENGAN PENCARIAN."
            : "BELUM ADA MEMBER YANG DITAMPILKAN."}
        </div>
      )}
      {open && (
        <div
          className="benefit-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Benefit Member"
        >
          <div className="benefit-dialog membership-landing">
            <button
              className="benefit-close"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              ×
            </button>
            <section className="membership-hero">
              {config.memberBenefitBanner && (
                <img
                  src={config.memberBenefitBanner}
                  alt="Banner Member Panboy Community"
                />
              )}
              <div className="membership-hero-shade" />
              <div className="membership-hero-copy">
                <small>MEMBERSHIP ESPORTS COMMUNITY</small>
                <h2>
                  MEMBER
                  <br />
                  <span>PANBOY COMMUNITY</span>
                </h2>
                <div className="membership-price">
                  <strong>Rp10.000</strong>
                  <span>/BULAN · TIER C</span>
                </div>
                <div className="membership-price">
                  <strong>Rp100.000</strong>
                  <span>/BULAN · TIER S</span>
                </div>
                <p>
                  Tier S untuk team profesional komunitas: event sistem liga
                  dengan prize pool Rp3–5 juta. Tier C dan Tier S sama-sama
                  mendapatkan tools leaderboard serta hitung poin.
                </p>
                <p>
                  Bergabung bersama Panboy Community dan dapatkan akses ke event
                  komunitas, tools turnamen, publikasi event, serta berbagai
                  benefit lainnya.
                </p>
                {joinButton("GABUNG MEMBER", "membership-cta")}
              </div>
            </section>
            <section className="benefit-intro">
              <small>
                {config.memberBenefitSubtitle || "MEMBERSHIP BENEFITS"}
              </small>
              <h3>
                {config.memberBenefitTitle || "BENEFIT MEMBER PANBOY COMMUNITY"}
              </h3>
              <p>{config.memberBenefitIntro}</p>
            </section>
            <section className="benefit-card-grid">
              {benefits.map((x, i) => (
                <article
                  key={x.id}
                  className={`benefit-card ${x.featured ? "featured" : ""}`}
                  style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
                >
                  {x.imageUrl && (
                    <img
                      className="benefit-card-image"
                      src={x.imageUrl}
                      alt={x.title}
                    />
                  )}
                  <div className="benefit-icon">
                    <BenefitIcon name={x.iconName} />
                  </div>
                  <small>
                    {x.featured
                      ? "FEATURED BENEFIT"
                      : String(i + 1).padStart(2, "0")}
                  </small>
                  <h4>{x.title}</h4>
                  <p>{x.description}</p>
                  {x.videoUrl && (
                    <Media url={x.videoUrl} title={x.title} />
                  )}{" "}
                  {x.ctaText && x.ctaUrl && (
                    <a
                      className="benefit-card-cta"
                      href={x.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {x.ctaText}
                    </a>
                  )}
                </article>
              ))}
            </section>
            <section className="community-event-showcase">
              <div>
                <span className="showcase-icon">
                  <BenefitIcon name="trophy" />
                </span>
                <small>EVENT KHUSUS</small>
                <h3>PANBOY COMMUNITY</h3>
                <p>
                  Event komunitas direncanakan berlangsung rutin untuk member
                  resmi.
                </p>
              </div>
              <dl>
                <div>
                  <dt>
                    <BenefitIcon name="calendar" /> JADWAL EVENT
                  </dt>
                  <dd>1–2 BULAN SEKALI</dd>
                </div>
                <div>
                  <dt>
                    <BenefitIcon name="trophy" /> PRIZE POOL
                  </dt>
                  <dd>MULAI Rp1.000.000</dd>
                </div>
              </dl>
            </section>
            <section className="community-event-showcase tier-s-showcase">
              <div>
                <span className="showcase-icon">
                  <BenefitIcon name="crown" />
                </span>
                <small>EVENT KHUSUS TIER S</small>
                <h3>TIER S LEAGUE</h3>
                <p>
                  Kompetisi khusus team profesional komunitas dengan sistem liga
                  dan persaingan yang lebih kompetitif.
                </p>
              </div>
              <dl>
                <div>
                  <dt>
                    <BenefitIcon name="calendar" /> JADWAL EVENT
                  </dt>
                  <dd>1–2 BULAN SEKALI</dd>
                </div>
                <div>
                  <dt>
                    <BenefitIcon name="trophy" /> PRIZE POOL
                  </dt>
                  <dd>Rp3.000.000–Rp5.000.000</dd>
                </div>
              </dl>
            </section>
            <section className="member-tools">
              <header>
                <small>MEMBER ACCESS</small>
                <h3>TOOLS UNTUK MEMBER</h3>
              </header>
              <div>
                {[
                  [
                    "calculator",
                    "HITUNG POINT OTOMATIS",
                    "Kelola perhitungan turnamen dengan lebih cepat dan praktis.",
                  ],
                  [
                    "chart",
                    "TOOLS LEADERBOARD",
                    "Buat leaderboard kompetitif yang rapi dan siap dipublikasikan.",
                  ],
                  [
                    "upload",
                    "UPLOAD & KELOLA EVENT",
                    "Kelola event sendiri melalui akses admin yang diberikan Panboy.",
                  ],
                  [
                    "megaphone",
                    "PUBLIKASI EVENT",
                    "Tampilkan event melalui website Panboy Community.",
                  ],
                ].map(([icon, title, desc]) => (
                  <article key={title}>
                    <BenefitIcon name={icon} />
                    <div>
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            {config.memberBenefitVideo && (
              <section className="benefit-main-video">
                <small>VIDEO BENEFIT</small>
                <Media
                  url={config.memberBenefitVideo}
                  title="Video benefit Panboy Community"
                />
              </section>
            )}
            {config.memberHowToVisible === "true" && (
              <section className="member-howto">
                <small>LANGKAH MUDAH</small>
                <h3>{config.memberHowToTitle}</h3>
                <ol>
                  {config.memberHowToSteps
                    .split("\n")
                    .filter(Boolean)
                    .map((x, i) => (
                      <li key={i}>
                        <b>{String(i + 1).padStart(2, "0")}</b>
                        <span>{x}</span>
                      </li>
                    ))}
                </ol>
              </section>
            )}
            <footer className="membership-final-cta">
              <small>SIAP BERGABUNG?</small>
              <h3>
                JADILAH BAGIAN DARI
                <br />
                <span>PANBOY COMMUNITY</span>
              </h3>
              <div>
                <strong>Rp10.000</strong>
                <span>/ BULAN</span>
              </div>
              <p>
                Event <i /> Tools <i /> Community <i /> Collaboration
              </p>
              {joinButton("GABUNG MEMBER SEKARANG", "membership-cta")}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
