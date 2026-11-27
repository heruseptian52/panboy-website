import { useId } from "react";

export type IconName =
  | "home" | "profile" | "management" | "member" | "design" | "handle" | "live"
  | "event" | "topup" | "account" | "collab" | "allEvents" | "panboy"
  | "premium" | "official" | "partnership" | "leaderboard" | "finance"
  | "balance" | "payment" | "settings" | "admin" | "logout" | "shop"
  | "analytics" | "trash" | "registration" | "database" | "tournament"
  | "scoring" | "media" | "audit" | "template" | "sync" | "digital";

const designs: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
  profile: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/></>,
  management: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c0-4 2-6 5.5-6s5.5 2 5.5 6M14 15c3.5-1 7 1 7 5"/></>,
  member: <><circle cx="12" cy="7" r="3"/><circle cx="4.5" cy="10" r="2"/><circle cx="19.5" cy="10" r="2"/><path d="M6 20c0-4 2.4-6 6-6s6 2 6 6M1.5 19c0-2.5 1.3-4 3.5-4M22.5 19c0-2.5-1.3-4-3.5-4"/></>,
  design: <><path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11zM15 6l3 3"/><path d="M3 21h18"/></>,
  handle: <><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5h6M8.5 10l1.5 1.5 2.5-3M14 10h2M8.5 16l1.5 1.5 2.5-3M14 16h2"/></>,
  live: <><rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 10 4-3v10l-4-3M7 12h5"/><circle cx="7" cy="12" r=".5" fill="currentColor" stroke="none"/></>,
  event: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-12 5 2 2 4-4"/></>,
  topup: <><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5h-4a3.5 3.5 0 0 0 0 7h4M12 6v12"/></>,
  account: <><circle cx="10" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 7-6 2 0 3.5.4 4.5 1.5M16 9h5M18.5 6.5v5M16 18h5m-2.5-2.5L21 18l-2.5 2.5"/></>,
  collab: <><path d="m3 12 4-4 4 2 2-2 4-1 4 5-6 6-3-2-2 1-2-2zM8 12l3 2 3-3M17 7l2-2"/></>,
  allEvents: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  panboy: <><path d="m12 2 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 16.3l-5.6 2.9 1.1-6.2L3 8.6l6.2-.9z"/></>,
  premium: <><path d="m3 8 4.5 4 4.5-6 4.5 6L21 8l-2 11H5zM4 21h16"/><circle cx="12" cy="5" r="1"/></>,
  official: <><path d="m12 2 2.4 2 3.2-.3.8 3.1 2.8 1.6-1 3.1 1 3.1-2.8 1.6-.8 3.1-3.2-.3L12 22l-2.4-2-3.2.3-.8-3.1-2.8-1.6 1-3.1-1-3.1 2.8-1.6.8-3.1 3.2.3z"/><path d="m8.5 12 2.4 2.4 4.8-5"/></>,
  partnership: <><path d="m3 12 4-4 4 2 2-2 4-1 4 5-6 6-3-2-2 1-2-2zM8 12l3 2 3-3"/></>,
  leaderboard: <><path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4M12 15v4m-4 2h8"/></>,
  finance: <><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6"/><path d="M17 7h3v3"/></>,
  balance: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 10V6a2 2 0 0 1 2-2h13M16 12h5v4h-5a2 2 0 0 1 0-4z"/></>,
  payment: <><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m10 2-.5 2.2-2 1L5.3 4 3 6.3l1.2 2.2-1 2L1 11v3l2.2.5 1 2L3 18.7 5.3 21l2.2-1.2 2 1L10 23h4l.5-2.2 2-1 2.2 1.2 2.3-2.3-1.2-2.2 1-2L23 14v-3l-2.2-.5-1-2L21 6.3 18.7 4l-2.2 1.2-2-1L14 2z"/></>,
  admin: <><path d="m12 2 8 3v6c0 5-3 8.5-8 11-5-2.5-8-6-8-11V5z"/><circle cx="12" cy="10" r="2"/><path d="M8.5 16c.5-2 1.7-3 3.5-3s3 1 3.5 3"/></>,
  logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 7l5 5-5 5M8 12h11"/></>,
  shop: <><path d="M3 9h18l-1 12H4zM5 9l1-5h12l1 5M9 13v3a3 3 0 0 0 6 0v-3"/></>,
  analytics: <><path d="M3 21V4m0 17h18M7 17v-5m5 5V7m5 10V4"/></>,
  trash: <><path d="M4 6h16M9 6V4h6v2M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>,
  registration: <><path d="M5 3h14v18H5zM8 8h8M8 12h5m-5 4 2 2 4-4"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
  tournament: <><path d="M4 4h16M6 4v5l6 3 6-3V4M12 12v4m-5 5h10M9 16h6v5"/></>,
  scoring: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  media: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></>,
  audit: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/><circle cx="17" cy="17" r="3"/></>,
  template: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  sync: <><path d="M20 7a8 8 0 0 0-14-2L4 7m0 0V3m0 4h4M4 17a8 8 0 0 0 14 2l2-2m0 0v4m0-4h-4"/></>,
  digital: <><rect x="3" y="4" width="18" height="15" rx="2"/><path d="M8 22h8M12 19v3m-4-11h8m-4-4v8"/></>,
};

export default function PanboyIcon({ name, className = "" }: { name: IconName; className?: string }) {
  const gradientId = useId().replace(/:/g, "");
  return <span className={`panboy-icon ${className}`} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <defs><linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#fff1ba"/><stop offset=".47" stopColor="#e3b95f"/><stop offset="1" stopColor="#a26c2c"/></linearGradient></defs>
      {designs[name]}
    </svg>
  </span>;
}
