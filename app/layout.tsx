import type { Metadata } from "next";
import "./globals.css";
import "./premium-gold.css";
import "./business-info.css";
import "./community-refresh.css";
import "./site-polish.css";
import AnalyticsTracker from "./analytics-tracker";
import NavigationAccelerator from "./navigation-accelerator";
import UploadStatus from "./upload-status";
export const metadata: Metadata = {
  metadataBase: new URL("https://panboycommunity.my.id"),
  title: { default: "Panboy | Event Esports & PUBG Mobile", template: "%s | Panboy" },
  description: "Website resmi Panboy. Temukan event esports PUBG Mobile online dan offline, top up UC, jual akun, serta layanan kerja sama event.",
  keywords: ["Panboy","panboycommunity","event esports","turnamen PUBG Mobile","event PUBG Mobile","top up UC PUBG","komunitas esports Indonesia"],
  alternates: { canonical: "/" },
  authors: [{ name: "Panboy", url: "https://panboycommunity.my.id" }],
  creator: "Panboy",
  publisher: "Panboy",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    title: "Panboy | Event Esports & PUBG Mobile",
    description: "Website resmi Panboy untuk event esports, turnamen PUBG Mobile, top up UC, jual akun, dan kerja sama event.",
    url: "https://panboycommunity.my.id",
    siteName: "Panboy",
    locale: "id_ID",
    type: "website",
    images: [{ url: "/og.png", width: 1792, height: 1024, alt: "Panboy" }],
  },
  twitter: { card: "summary_large_image", title: "Panboy | Event Esports & PUBG Mobile", description: "Website resmi Panboy untuk event dan turnamen PUBG Mobile.", images: ["/og.png"] },
  icons: {
    icon: [{ url: "/panboy-only-favicon.png", type: "image/png", sizes: "96x96" }],
    shortcut: "/panboy-only-favicon.png",
    apple: "/panboy-logo.png",
  },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){const schema={"@context":"https://schema.org","@type":"Organization",name:"Panboy Community",url:"https://panboycommunity.my.id",logo:"https://panboycommunity.my.id/panboy-menu-logo.png",email:"heruseptian52@gmail.com",address:{"@type":"PostalAddress",streetAddress:"Jalan Pembangunan RT 18",addressLocality:"Makroman, Sambutan, Samarinda",addressRegion:"Kalimantan Timur",addressCountry:"ID"},sameAs:["https://www.instagram.com/panboycommunity/","https://www.youtube.com/@panboychannel10"],contactPoint:{"@type":"ContactPoint",telephone:"+62-815-4591-0291",email:"heruseptian52@gmail.com",contactType:"customer service",areaServed:"ID",availableLanguage:"Indonesian"}};return <html lang="id"><body><NavigationAccelerator/><UploadStatus/>{children}<AnalyticsTracker/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/></body></html>}
