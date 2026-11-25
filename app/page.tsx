import EventCardInfo from "./event-card-info";
import type { CSSProperties } from "react";
import {
  EventRecord,
  eventStartDate,
  getEvents,
  normalizeWhatsapp,
  registrationCloseAt,
} from "../lib/events";
import { getPartners } from "../lib/shop";
import { getSettings } from "../lib/settings";
import EventCountdown from "./event-countdown";
import EventBrowser from "./event-browser";
import FeaturedCarousel from "./featured-carousel";
import SiteMusic from "./site-music";
import PremiumVideoPlayer from "./premium-video-player";
import { getFeatureFlags } from "../lib/features";
import { getCommunityMembers } from "../lib/members";
import MemberHeroCarousel from "./member-hero-carousel";
import { getHomeData } from "../lib/home-data";
import PanboyIcon from "./panboy-icon";
import SitePopup from "./site-popup";
import {getPublicShowcases} from "../lib/showcase";
import {ShowcaseSection} from "./showcase/showcase-view";
export const dynamic = "force-dynamic";
function ChatIcon() {
  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.7 9.7 0 0 1-4-.9L3 21l1.7-4.8A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.7 8.4c.4 3.3 2.3 5.2 5.6 5.6" />
    </svg>
  );
}
function formatRupiah(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits
    ? `Rp${Number(digits).toLocaleString("id-ID")}`
    : "Hubungi Admin";
}
function wa(e: EventRecord) {
  return `https://wa.me/${normalizeWhatsapp(e.whatsapp)}?text=${encodeURIComponent(`Halo Admin, saya ingin registrasi event ${e.title}.`)}`;
}
function Card({ event: e }: { event: EventRecord }) {
  const offline = e.eventMode.toLowerCase() === "offline",
    location = offline
      ? [e.city, e.province].filter(Boolean).join(", ")
      : `Event ${e.eventMode}`,
    showFee = e.status === "OPEN REGISTRATION" || e.status === "REGISTRATION",
    fee = formatRupiah(e.registrationFee),
    prize = formatRupiah(e.prizepool),
    modeClass = offline
      ? "offline"
      : e.eventMode.toLowerCase() === "online"
        ? "online"
        : "custom";
  return (
    <a className="event-card" href={`/event/${e.id}`}>
      <div className="poster-wrap">
        <img src={e.imageUrl} alt={e.title} loading="lazy" decoding="async" />
        <span className="event-status">{e.registrationType === "INTERNAL" ? "EVENT INTERNAL" : e.status}</span>
        <span className={`event-mode ${modeClass}`}>
          {e.eventMode.toUpperCase()}
        </span>
        <EventCountdown closeAt={registrationCloseAt(e)} />
        <div className="poster-action">
          <span className="action-label">
            <ChatIcon />
            {e.registrationType === "INTERNAL" ? "LIHAT EVENT INTERNAL" : "LIHAT DETAIL & REGISTRASI"}
          </span>
          <b>↗</b>
        </div>
      </div>
      <EventCardInfo event={e} formatRupiah={formatRupiah} />
    </a>
  );
}
function monthGroups(events: EventRecord[]) {
  const groups = new Map<string, { label: string; events: EventRecord[] }>();
  for (const event of events) {
    const start = eventStartDate(event),
      key = start.slice(0, 7) || "lainnya";
    if (!groups.has(key)) {
      const date = start ? new Date(`${start}T12:00:00+07:00`) : null;
      groups.set(key, {
        label: date
          ? new Intl.DateTimeFormat("id-ID", {
              month: "long",
              year: "numeric",
              timeZone: "Asia/Jakarta",
            })
              .format(date)
              .toUpperCase()
          : "EVENT LAINNYA",
        events: [],
      });
    }
    groups.get(key)!.events.push(event);
  }
  return [...groups.values()];
}
function EventGroups({
  events,
  dark = false,
}: {
  events: EventRecord[];
  dark?: boolean;
}) {
  return (
    <div className="event-months">
      {monthGroups(events).map((group) => (
        <section className="event-month" key={group.label}>
          <div className={`month-heading${dark ? " dark" : ""}`}>
            <span>{group.label}</span>
            <i />
          </div>
          <div className="event-grid">
            {group.events.map((event) => (
              <Card event={event} key={event.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
export default async function Home() {
  const [{ events, partners, settings: s, features: f, members },showcase] = await Promise.all([getHomeData(),getPublicShowcases()]),
    featuredEvents = events.filter((e) =>
      ["EVENT PANBOY", "EVENT PREMIUM"].includes(e.category.toUpperCase()),
    );
  const style = {
    "--gold": s.primaryColor,
    "--black": s.backgroundColor,
    backgroundImage: s.siteBackground
      ? `linear-gradient(90deg, rgba(7,8,9,.92), rgba(7,8,9,.96) 25%, rgba(7,8,9,.97) 75%, rgba(7,8,9,.92)), url("${s.siteBackground}")`
      : undefined,
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as CSSProperties;
  const sectionBackground = (url: string): CSSProperties | undefined =>
    url
      ? {
          backgroundImage: `linear-gradient(90deg, rgba(8,9,10,.90), rgba(8,9,10,.96) 25%, rgba(8,9,10,.96) 75%, rgba(8,9,10,.90)), url("${url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;
  const memberShowcase = [...members].sort((a,b) => Number(b.id === Number(s.featuredMemberId)) - Number(a.id === Number(s.featuredMemberId)) || a.sortOrder - b.sortOrder);
  const selectedPopupEvent = events.find(e => String(e.id) === s.popupEventId);
  const popupUrl = (s.popupMediaType === "event" || s.popupLinkType === "event") ? (selectedPopupEvent ? `/event/${selectedPopupEvent.id}` : "") : /^(https?:\/\/)/i.test(s.popupLinkUrl.trim()) ? s.popupLinkUrl.trim() : "";
  const showVideo = s.premiumAdEnabled === "true" && Boolean(s.premiumAdVideoUrl);
  const showPhoto = s.premiumAdPhotoEnabled === "true" && Boolean(s.premiumAdPhotoUrl);
  const premiumSection = f.premiumAds && (showVideo || showPhoto) ? (
    <section className="premium-video-ad" aria-label="Media premium" style={sectionBackground(s.premiumBackground)}>
      <div className="container premium-media-stack">
        {showVideo && <>
          <h2>{s.premiumAdTitle.trim() || "PREMIUM VIDEO"}</h2>
          <PremiumVideoPlayer src={s.premiumAdVideoUrl} autoplay={s.premiumAdAutoplay === "true"} loop={s.premiumAdLoop === "true"}/>
        </>}
        {showPhoto && <img className="premium-media-photo" data-format={s.premiumAdPhotoRatio}
          src={s.premiumAdPhotoUrl} alt="Banner Panboy Community" loading="lazy" decoding="async"/>}
      </div>
    </section>
  ) : null;
  return (
    <main className="panboy-main-refresh" id="beranda">
      <div className="theme-scope" style={style}>
        {s.popupEnabled === "true" && <SitePopup image={s.popupMediaType === "event" ? selectedPopupEvent?.imageUrl || "" : s.popupImageUrl} video={s.popupVideoUrl} title={s.popupTitle} url={popupUrl} type={s.popupMediaType}/>}
        <SiteMusic
          url={s.musicUrl}
          title={s.musicTitle}
          enabled={f.music && s.musicEnabled === "true"}
          autoplay={s.musicAutoplay === "true"}
          loop={s.musicLoop === "true"}
          volume={Number(s.musicVolume) || 0}
        />
        <header className="site-header">
          <nav className="nav container">
            <a className="brand" href="#beranda" title="Beranda" aria-label="Beranda Panboy Community">
              <img src={s.logoUrl} alt="Logo Panboy" />
              <span>
                {s.brandName}
                <small>{s.brandSubtitle}</small>
              </span>
            </a>
            <div className="nav-links">
              <a href="/community-profile" title="Profile">
                <PanboyIcon name="profile" />
                <span>PROFILE</span>
              </a>
              {s.rosterPublicMenuEnabled !== "false" && <a href="/data-event" title="Data Player Event"><PanboyIcon name="event" /><span>DATA PLAYER EVENT</span></a>}
              <a href="/management" title="Management"><PanboyIcon name="management" /><span>MANAGEMENT</span></a>
              <a href="/blacklist-player" title="Blacklist Player"><PanboyIcon name="member" /><span>BLACKLIST PLAYER</span></a>
              <a href="/member" title="Member">
                <PanboyIcon name="member" />
                <span>MEMBER</span>
              </a>
              <a href="/jasa-design" title="Jasa Design"><PanboyIcon name="design" /><span>JASA DESIGN</span></a>
              <a href="/handle-event" title="Jasa Handle Event"><PanboyIcon name="handle" /><span>JASA HANDLE EVENT</span></a>
              <a href="/live-streaming" title="Jasa Live Streaming"><PanboyIcon name="live" /><span>JASA LIVE STREAMING</span></a>
              {f.eventCatalog && (
                <a href="#all-event" title={s.navEvent}>
                  <PanboyIcon name="allEvents" />
                  <span>{s.navEvent}</span>
                </a>
              )}
              {f.topup && (
                <a href="/top-up-uc" title={s.navTopup}>
                  <PanboyIcon name="topup" />
                  <span>{s.navTopup}</span>
                </a>
              )}
              {f.accountMarketplace && (
                <a href="/jual-akun" title={s.navAccount}>
                  <PanboyIcon name="account" />
                  <span>{s.navAccount}</span>
                </a>
              )}
              {f.collaboration && (
                <a href="#kerjasama" title={s.navCollab}>
                  <PanboyIcon name="collab" />
                  <span>{s.navCollab}</span>
                </a>
              )}
            </div>
          </nav>
        </header>
        <section
          className="home-hero"
          style={s.heroBackground ? { backgroundImage: `radial-gradient(ellipse 45% 75% at 94% 50%, rgba(174,115,37,.34), transparent 78%), linear-gradient(90deg, rgba(6,7,8,.99) 0%, rgba(6,7,8,.94) 48%, rgba(6,7,8,.70) 100%), url("${s.heroBackground}")` } : undefined}
        >
          <div className="container home-hero-inner">
            <div className="home-hero-copy">
              <p className="eyebrow"><span /> {s.heroEyebrow}</p>
              <h1>{s.heroTitle1}<br /><em>{s.heroTitle2}</em><br />{s.heroTitle3}</h1>
              <p className="refresh-motto">TOGETHER. CREATE. CONQUER.</p>
              <p className="home-hero-description">{s.heroDescription}</p>
              <div className="refresh-hero-actions"><a className="button gold" href="#all-event">{s.heroButton}<span>↗</span></a><a className="button refresh-outline" href="/member"><PanboyIcon name="member"/>Jadi bagian dari kami</a></div>
            </div>
            <MemberHeroCarousel
              members={members.map((member) => ({
                id: member.id,
                teamName: member.teamName,
                logoUrl: member.logoUrl,
                photos: [
                  member.playerPhoto1Url && {
                    url: member.playerPhoto1Url,
                    x: member.playerPhoto1X,
                    y: member.playerPhoto1Y,
                    scale: member.playerPhoto1Scale,
                  },
                  member.playerPhoto2Url && {
                    url: member.playerPhoto2Url,
                    x: member.playerPhoto2X,
                    y: member.playerPhoto2Y,
                    scale: member.playerPhoto2Scale,
                  },
                ].filter((photo): photo is { url: string; x: number; y: number; scale: number } => Boolean(photo)),
              }))}
            />
          </div>
        </section>
        <section className="container refresh-quick" aria-label="Jelajahi komunitas">
          {[{icon:"event" as const,title:"Arena kompetisi",body:"Temukan event untuk tim kamu",href:"#all-event"},{icon:"member" as const,title:"Keluarga Panboy",body:"Bertumbuh bersama komunitas",href:"/member"},{icon:"leaderboard" as const,title:"Panggung juara",body:"Ikuti perjalanan setiap event",href:"#all-event"}].map(x=><a href={x.href} key={x.title}><PanboyIcon name={x.icon}/><span><b>{x.title}</b><small>{x.body}</small></span><span className="refresh-arrow">↗</span></a>)}
        </section>
        {s.premiumAdPosition === "top" && premiumSection}
        {f.featuredCarousel && (
          <FeaturedCarousel
            events={featuredEvents.slice(0, 8)}
            effect={s.carouselEffect}
            ticker={{
              text: s.tickerText,
              separator: s.tickerSeparator,
              speed: s.tickerSpeed,
              direction: s.tickerDirection,
              effect: s.tickerEffect,
              font: s.tickerFont,
              size: s.tickerSize,
              spacing: s.tickerSpacing,
            }}
          />
        )}
        {s.premiumAdPosition === "after_carousel" && premiumSection}
        {f.eventCatalog && (
          <section
            className="events-section event-catalog"
            id="all-event"
            style={sectionBackground(s.eventsBackground)}
          >
            <div className="arena-atmosphere" aria-hidden="true">
              <span className="arena-shuriken arena-shuriken-one" />
              <span className="arena-shuriken arena-shuriken-two" />
              <span className="arena-shard arena-shard-one" />
              <span className="arena-shard arena-shard-two" />
              <span className="arena-orbit" />
              <span className="arena-particles" />
            </div>
            <div className="container">
              <div className="refresh-heading refresh-event-heading"><div><p className="eyebrow">THE NEXT BATTLEGROUND</p><h2>Arena berikutnya<span>.</span></h2><p>Siapkan tim terbaikmu. Tulis cerita juaramu di sini.</p></div><div className="arena-actions"><a className="submit-event-cta" href={`https://wa.me/${normalizeWhatsapp(s.collabWhatsapp)}?text=${encodeURIComponent("Halo Panboy Community, saya ingin bikin event bersama Panboy. Bisa diskusi konsep dan kerja samanya?")}`} target="_blank" rel="noreferrer"><PanboyIcon name="member"/><span>BIKIN EVENT BERSAMA PANBOY<small>Yuk diskusikan event kamu</small></span></a><a className="submit-event-cta" href="/ajukan-event"><PanboyIcon name="registration"/><span>AJUKAN EVENT KAMU<small>Poster diperiksa admin sebelum tayang</small></span></a></div></div>
              {events.length ? (
                <EventBrowser events={events} />
              ) : (
                <p>{s.emptyEventText}</p>
              )}
            </div>
          </section>
        )}
        {s.premiumAdPosition === "after_events" && premiumSection}
        {!!showcase.ads.length&&<ShowcaseSection ads={showcase.ads} whatsapp={showcase.whatsapp}/>}
        <section className="container refresh-members" aria-labelledby="refresh-member-title"><div className="refresh-heading"><div><p className="eyebrow">MORE THAN JUST A TEAM</p><h2 id="refresh-member-title">Satu komunitas. Satu keluarga<span>.</span></h2><p>Mereka yang ikut membangun cerita Panboy Community.</p></div><a href="/member">Semua member ↗</a></div><div className="refresh-member-grid">{memberShowcase.map(m=><a href="/member" key={m.id}>{m.logoUrl?<img src={m.logoUrl} alt={m.teamName} loading="lazy" decoding="async"/>:<PanboyIcon name="member"/>}<b>{m.teamName}</b><small>Member komunitas · {m.membershipTier || "C"}</small></a>)}</div><div className="refresh-member-join"><PanboyIcon name="member"/><div><p className="eyebrow">TEMPAT UNTUK TIM KAMU</p><h3>Langkah besar dimulai dari kebersamaan.</h3><p>Kenali program dan benefit member Panboy Community.</p></div><a className="button gold" href="/member">Lihat benefit member ↗</a></div></section>
        <section className="container refresh-services"><div className="refresh-heading"><div><p className="eyebrow">LET’S MAKE IT HAPPEN</p><h2>Dari ide, jadi panggung nyata<span>.</span></h2><p>Semua kebutuhan tim dan event kamu, dikerjakan bersama Panboy.</p></div></div><div className="refresh-service-grid">{[{icon:"design" as const,title:"Design kreatif",text:"Logo, poster, leaderboard, dan identitas visual untuk tim serta event kamu.",href:"/jasa-design",tag:"VISUAL IDENTITY"},{icon:"handle" as const,title:"Handle event",text:"Pengelolaan turnamen, room esport, spected, dan hitung poin.",href:"/handle-event",tag:"TOURNAMENT MANAGEMENT"},{icon:"live" as const,title:"Live streaming",text:"Hadirkan setiap momen melalui siaran, observer, dan caster.",href:"/live-streaming",tag:"BROADCAST & CASTER"}].map((x,i)=><a href={x.href} key={x.title}><div><PanboyIcon name={x.icon}/><small>0{i+1}</small></div><p className="eyebrow">{x.tag}</p><h3>{x.title}</h3><p>{x.text}</p><span>Lihat layanan <b>↗</b></span></a>)}</div></section>

        {f.collaboration && (
          <section
            className="collab-section"
            id="kerjasama"
            style={sectionBackground(s.collabBackground)}
          >
            <div className="container collab-grid">
              <div className="collab-mark">
                <img src={s.logoUrl} alt="Panboy" />
                <span>
                  EVENT
                  <br />
                  PARTNER
                </span>
              </div>
              <div className="collab-copy">
                <p className="eyebrow dark">
                  <span /> {s.collabEyebrow}
                </p>
                <h2>{s.collabTitle}</h2>
                <p>{s.collabDescription}</p>
                <div className="collab-points">
                  <span>✓ {s.collabPoint1}</span>
                  <span>✓ {s.collabPoint2}</span>
                  <span>✓ {s.collabPoint3}</span>
                </div>
                <a
                  className="button collab-button"
                  href={`https://wa.me/${normalizeWhatsapp(s.collabWhatsapp)}?text=${encodeURIComponent("Halo Panboy, saya ingin mengajak kerja sama untuk event esports.")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.collabButton} <span>→</span>
                </a>
              </div>
            </div>
          </section>
        )}
        {f.partnerships && (
          <section
            className="partners-section"
            style={sectionBackground(s.partnersBackground)}
          >
            <div className="container">
              <p>{s.partnerTitle}</p>
              {partners.length ? (
                <div className="partner-logos">
                  {partners.map((x) =>
                    x.linkUrl ? (
                      <a
                        href={x.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        key={x.id}
                      >
                        <img src={x.logoUrl} alt={x.name} loading="lazy" decoding="async" />
                        <span>{x.name}</span>
                      </a>
                    ) : (
                      <div key={x.id}>
                        <img src={x.logoUrl} alt={x.name} loading="lazy" decoding="async" />
                        <span>{x.name}</span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <span className="partner-empty">{s.partnerEmptyText}</span>
              )}
            </div>
          </section>
        )}
        {s.premiumAdPosition === "bottom" && premiumSection}
        <nav className="refresh-bottom-nav" aria-label="Navigasi utama HP">{[{icon:"home" as const,label:"Beranda",href:"#beranda"},{icon:"event" as const,label:"Event",href:"#all-event"},{icon:"member" as const,label:"Member",href:"/member"},{icon:"design" as const,label:"Layanan",href:"/jasa-design"},{icon:"management" as const,label:"Profil",href:"/community-profile"}].map(x=><a href={x.href} key={x.label}><PanboyIcon name={x.icon}/><span>{x.label}</span></a>)}</nav>
        <footer className="panboy-footer">
          <div className="footer-stage">
            <div className="footer-stage-art" aria-hidden="true"><span className="footer-blade footer-blade-one"/><span className="footer-blade footer-blade-two"/><span className="footer-stage-orbit"/></div>
            <div className="container footer-stage-content">
              <img src={s.logoUrl} alt="" loading="lazy" decoding="async" />
              <p>THE NEXT BATTLEGROUND STARTS HERE</p>
              <strong>{s.brandName}</strong>
              <span>TOGETHER. CREATE. CONQUER.</span>
            </div>
          </div>
          <div className="container footer-main">
            <div className="footer-about"><div className="brand footer-brand"><img src={s.logoUrl} alt="Logo Panboy" loading="lazy" decoding="async"/><span>{s.brandName}</span></div>{!s.footerText.trim().startsWith("©") && <p>{s.footerText}</p>}<small>{s.footerTagline}</small></div>
            <nav className="footer-column" aria-label="Jelajahi Panboy"><h2>JELAJAHI</h2><a href="#all-event">Semua Event</a><a href="/member">Member Community</a><a href="/management">Management</a><a href="/community-profile">Profil Panboy</a></nav>
            <nav className="footer-column" aria-label="Layanan Panboy"><h2>LAYANAN</h2><a href="/jasa-design">Jasa Design</a><a href="/handle-event">Handle Event</a><a href="/live-streaming">Live Streaming</a><a href="/pembayaran">Pembayaran Member</a></nav>
            <div className="footer-column footer-contact"><h2>HUBUNGI KAMI</h2><a href="mailto:heruseptian52@gmail.com">heruseptian52@gmail.com</a><a href="https://wa.me/6281545910291" target="_blank" rel="noreferrer">WhatsApp: +62 815-4591-0291</a><p>Jl. Pembangunan RT 18, Makroman, Sambutan, Samarinda, Kalimantan Timur, Indonesia</p></div>
          </div>
          <div className="container footer-bottom"><span>© {new Date().getFullYear()} {s.brandName}. Semua hak dilindungi.</span><nav className="footer-legal" aria-label="Informasi legal"><a href="/kontak">Kontak</a><a href="/syarat-ketentuan">Syarat &amp; Ketentuan</a><a href="/kebijakan-pengembalian">Pengembalian Dana</a><a href="/faq">FAQ</a></nav></div>
        </footer>
      </div>
    </main>
  );
}
