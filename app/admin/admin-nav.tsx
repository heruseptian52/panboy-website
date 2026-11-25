"use client";
import { Children, Fragment, ReactNode, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PanboyIcon, { type IconName } from "../panboy-icon";

function iconFor(href: string): IconName {
  const path = href.replace(/\?.*$/, "");
  if (path.includes("logout")) return "logout";
  if (path === "/admin/menu") return "home";
  if (path.startsWith("/admin/menu/")) return ({event:"event",team:"database",member:"member",tools:"scoring",layanan:"media",keuangan:"finance",toko:"shop",pengaturan:"settings"} as Record<string,IconName>)[path.split("/")[3]] || "home";
  if (path === "/admin") return "event";
  if (path.includes("registrasi")) return "registration";
  if (path.includes("jasa-design")) return "media";
  if (path.includes("database")) return "database";
  if (path.includes("turnamen")) return "tournament";
  if (path.includes("kompetisi") || path.includes("kalkulator-poin")) return "scoring";
  if (path.includes("desain-leaderboard")) return "template";
  if (path.includes("leaderboard")) return "leaderboard";
  if (path.includes("keuangan")) return "finance";
  if (path.includes("member-dues")) return "payment";
  if (path.includes("member")) return "member";
  if (path.includes("community-profile")) return "profile";
  if (path.includes("sampah")) return "trash";
  if (path.includes("topup/sync")) return "sync";
  if (path.includes("topup/requirements")) return "digital";
  if (path.includes("topup")) return "topup";
  if (path.includes("toko")) return "shop";
  if (path.includes("fitur") || path.includes("tampilan")) return "settings";
  if (path.includes("media") || path.includes("showcase")) return "media";
  if (path.includes("analitik")) return "analytics";
  if (path.includes("audit")) return "audit";
  if (path.includes("akses")) return "admin";
  if (path.includes("desain")) return "template";
  return "event";
}

export type MemberAlerts = { registrations: number; payments: number };

export function useMemberAlerts() {
  const [alerts, setAlerts] = useState<MemberAlerts>({ registrations: 0, payments: 0 });
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/admin/member-alerts", { cache: "no-store" });
        if (response.ok && mounted) {
          const data = await response.json() as MemberAlerts;
          if (mounted) setAlerts({ registrations: Number(data.registrations) || 0, payments: Number(data.payments) || 0 });
        }
      } catch { /* Keep the last count until the next refresh. */ }
    }
    void refresh();
    const timer = window.setInterval(refresh, 45000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("panboy-admin-alerts-refresh", refresh);
    return () => { mounted = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("panboy-admin-alerts-refresh", refresh); };
  }, []);
  return alerts;
}

function renderLinks(nodes: ReactNode, pathname: string, alerts: MemberAlerts): ReactNode {
    return Children.map(nodes, child => {
      if (!isValidElement(child)) return child;
      if (child.type === Fragment) return <Fragment>{renderLinks((child.props as { children?: ReactNode }).children, pathname, alerts)}</Fragment>;
      if (child.type !== "a") return child;
      const props = child.props as { href: string; children: ReactNode; title?: string };
      const title = String(props.children);
      const active = props.href === pathname || (props.href !== "/admin" && pathname.startsWith(`${props.href}/`));
      const count = props.href === "/admin/menu/member" || props.href === "/admin/member" ? alerts.registrations + alerts.payments
        : props.href === "/admin/member/pendaftaran" ? alerts.registrations
        : props.href === "/admin/member-dues" || props.href === "/admin/member-dues/pembayaran" ? alerts.payments : 0;
      const detail = props.href === "/admin/member" ? `${alerts.registrations} pendaftaran, ${alerts.payments} pembayaran iuran menunggu` : `${count} menunggu tindakan`;
      return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        title: count ? `${props.title || title} · ${detail}` : props.title || title,
        "aria-label": count ? `${title}, ${detail}` : undefined,
        "aria-current": active ? "page" : undefined,
        children: <><span className="admin-icon-with-badge"><PanboyIcon name={iconFor(props.href)} />{count > 0 && <span className="admin-member-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span>}</span><span className="admin-nav-label">{props.children}</span></>,
      });
    });
}

export function AdminHeaderLinks({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const alerts = useMemberAlerts();
  return <div className="admin-header-links">{renderLinks(<><a href="/admin/menu">MENU ADMIN</a>{children}</>, pathname, alerts)}</div>;
}

export default function AdminNav({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const alerts = useMemberAlerts();
  const move = (amount: number) => ref.current?.scrollBy({ left: amount, behavior: "smooth" });
  return <div className="admin-nav-wrap"><button type="button" className="admin-nav-arrow" onClick={() => move(-280)} aria-label="Geser menu ke kiri">‹</button><div className="admin-nav-scroll" ref={ref}>{renderLinks(children, pathname, alerts)}</div><button type="button" className="admin-nav-arrow" onClick={() => move(280)} aria-label="Geser menu ke kanan">›</button></div>;
}
