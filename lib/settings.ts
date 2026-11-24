import { env } from "cloudflare:workers";
export const defaults = {
  rosterPublicMenuEnabled: "true",
  premiumAdVideoUrl: "",
  premiumAdPhotoUrl: "",
  premiumAdPhotoEnabled: "false",
  premiumAdPhotoRatio: "4:5",
  premiumAdEnabled: "false",
  premiumAdSponsor: "PREMIUM PARTNER",
  premiumAdTitle: "PREMIUM VIDEO",
  premiumAdDescription:
    "Promosikan brand, tim esports, produk, atau event kamu di Panboy.",
  premiumAdLink: "",
  premiumAdButton: "LIHAT SELENGKAPNYA",
  premiumAdLabel: "PREMIUM ADVERTISEMENT",
  premiumAdBadge: "PREMIUM ADS",
  premiumAdAutoplay: "true",
  premiumAdLoop: "true",
  premiumAdPosition: "after_carousel",
  popupEnabled: "false",
  popupMediaType: "image",
  popupImageUrl: "",
  popupVideoUrl: "",
  popupTitle: "EVENT PILIHAN PANBOY",
  popupLinkType: "event",
  popupEventId: "",
  popupLinkUrl: "",
  featuredMemberId: "",
  musicUrl: "",
  musicTitle: "MUSIK PANBOY",
  musicEnabled: "false",
  musicAutoplay: "false",
  musicLoop: "true",
  musicVolume: "35",
  logoUrl: "/panboy-menu-logo.png",
  heroBackground: "",
  siteBackground: "",
  premiumBackground: "",
  eventsBackground: "",
  collabBackground: "",
  partnersBackground: "",
  primaryColor: "#d7a640",
  backgroundColor: "#060607",
  brandName: "PANBOY",
  brandSubtitle: "",
  navEvent: "EVENT",
  navTopup: "TOP UP UC",
  navAccount: "JUAL AKUN",
  navCollab: "KERJA SAMA",
  heroEyebrow: "OFFICIAL ESPORTS EVENT PORTAL",
  heroTitle1: "SEMUA EVENT",
  heroTitle2: "PUBG MOBILE",
  heroTitle3: "ADA DI SINI",
  heroDescription:
    "Temukan event esports terbaru, pilih turnamenmu, dan daftarkan tim langsung melalui admin EVENT.",
  heroButton: "LIHAT SEMUA EVENT",
  carouselEffect: "slide3d",
  tickerText:
    "PUBG MOBILE EVENT | GESER POSTER | DAFTAR VIA WHATSAPP | PUBG MOBILE EVENT",
  tickerSeparator: "◆",
  tickerSpeed: "17",
  tickerDirection: "right",
  tickerEffect: "glow",
  tickerFont: "esports",
  tickerSize: "13",
  tickerSpacing: "0.18",
  allEventTitle: "ALL EVENT",
  allEventDescription:
    "Klik poster event yang kamu inginkan untuk langsung terhubung ke WhatsApp admin registrasi.",
  panboyEventTitle: "EVENT PANBOY",
  panboyEventDescription: "Turnamen resmi yang dikelola oleh Panboy.",
  collabTitle: "KERJA SAMA EVENT ESPORTS.",
  collabDescription:
    "Punya rencana turnamen, grand opening tim, anniversary, atau event komunitas? Panboy siap membantu pengelolaan event, live production, room, leaderboard, dan kebutuhan desain.",
  collabButton: "AJUKAN KERJA SAMA",
  collabEyebrow: "LET'S COLLABORATE",
  collabPoint1: "Event Management",
  collabPoint2: "Live Production",
  collabPoint3: "Creative Design",
  collabWhatsapp: "6281545910291",
  partnerTitle: "PARTNERSHIP PANBOY",
  emptyEventText: "Belum ada event.",
  partnerEmptyText:
    "Logo partnership dapat ditambahkan melalui Dashboard Admin.",
  footerText: "© 2026 PANBOY",
  footerTagline: "ESPORTS • EVENT • PANBOY",
  memberWhatsapp: "6281545910291",
  memberQrisUrl: "/panboy-qris-dana.png",
  memberQrisEnabled: "true",
  memberIpaymuEnabled: "true",
  memberWhatsappMessage: "Halo Admin Panboy, saya tertarik untuk bergabung menjadi Member Panboy Community.\n\nNama Team:\nInstagram Team:\nNama PIC:\nNomor WhatsApp:",
  memberJoinText: "GABUNG MEMBER",
  memberRegistrationStatus: "OPEN",
  topupMarkupJson: '{"global":{"type":"percent","value":0,"minimumProfit":0,"rounding":0},"games":[],"products":[],"member":0,"reseller":0}',
  topupInputRequirementsJson: '{"GAME":["player_id"],"PULSA":["phone"],"PAKET DATA":["phone"],"TOKEN PLN":["customer_id"],"E-WALLET":["destination"],"TAGIHAN":["customer_id"]}',
  memberBenefitVisible: "true",
  memberBenefitTitle: "BENEFIT MEMBER PANBOY COMMUNITY",
  memberBenefitSubtitle: "BERGABUNG DAN TUMBUH BERSAMA KOMUNITAS",
  memberBenefitIntro: "Dapatkan akses informasi, dukungan, dan kesempatan kolaborasi bersama Panboy Community.",
  memberBenefitBanner: "",
  memberBenefitVideo: "",
  memberHowToVisible: "true",
  memberHowToTitle: "CARA BERGABUNG",
  memberHowToSteps: "Klik Gabung Member\nHubungi Admin Panboy\nKirim Data Team\nAdmin melakukan pengecekan\nTeam ditambahkan sebagai Member Panboy Community",
  memberManagementJson: '[{"photoUrl":"","name":"BANG GHIDO","role":"CO-OWNER"},{"photoUrl":"","name":"IYUT","role":"ADMIN"},{"photoUrl":"","name":"NINA","role":"CO-OWNER"},{"photoUrl":"","name":"CHIKA","role":"MODERATOR"},{"photoUrl":"","name":"IYAN","role":"FOUNDER"},{"photoUrl":"","name":"YUMIKO","role":"MODERATOR"}]',
  communityProfileTextJson: "{}",
  memberDuesJson: "{}",
};
export type Settings = typeof defaults;
const cleanBrand = (key: keyof Settings, value: string) =>
  key === "logoUrl" && value === "/panboy-logo.png"
    ? "/panboy-menu-logo.png"
    : key === "brandSubtitle" && value.trim().toUpperCase() === "COMMUNITY"
      ? ""
      : key === "heroTitle1" && value === "YOUR NEXT"
        ? "SEMUA EVENT"
        : key === "heroTitle2" && value === "BATTLE"
          ? "PUBG MOBILE"
          : key === "heroTitle3" && value === "STARTS HERE."
            ? "ADA DI SINI"
            : key === "heroDescription" && /admin\s+panboy/i.test(value)
              ? "Temukan event esports terbaru, pilih turnamenmu, dan daftarkan tim langsung melalui admin EVENT."
              : value.replace(/panboy community/gi, "PANBOY");
export async function ensureSettings() {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)",
  ).run();
}
export function bannerVisibility(values: Partial<Settings>): string {
  if (values.premiumAdPhotoEnabled === "hidden") return "false";
  return values.premiumAdPhotoUrl ? "true" : values.premiumAdPhotoEnabled || "false";
}
export async function getSettings(): Promise<Settings> {
  try {
    const rows = await env.DB.prepare(
      "SELECT key,value FROM site_settings",
    ).all<{ key: keyof Settings; value: string }>();
    const values = Object.fromEntries(
      rows.results.map((x) => [x.key, cleanBrand(x.key, x.value)]),
    ) as Partial<Settings>;
    values.premiumAdPhotoEnabled = bannerVisibility(values);
    if (!values.memberManagementJson || values.memberManagementJson === "[]")
      values.memberManagementJson = defaults.memberManagementJson;
    return {
      ...defaults,
      ...values,
    };
  } catch {
    return defaults;
  }
}
