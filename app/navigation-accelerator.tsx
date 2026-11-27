"use client";

import { useEffect, useState } from "react";

function internalUrl(anchor: HTMLAnchorElement) {
  if (anchor.target || anchor.hasAttribute("download") || anchor.dataset.noSpa !== undefined) return null;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin ? url : null;
}

export default function NavigationAccelerator() {
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let timer = 0;
    const reset = () => {
      window.clearTimeout(timer);
      setLoading(false);
      setSlow(false);
    };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const url = internalUrl(anchor);
      if (!url || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setLoading(true);
      setSlow(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSlow(true), 12000);
    };
    document.addEventListener("click", navigate, true);
    window.addEventListener("pageshow", reset);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("pageshow", reset);
    };
  }, []);

  if (!loading) return null;
  return <><div className="route-progress" role="progressbar" aria-label="Memuat halaman" />{slow&&<div className="route-timeout" role="alert"><b>HALAMAN BELUM MERESPONS</b><span>Periksa koneksi lalu coba lagi.</span><button type="button" onClick={()=>location.reload()}>COBA LAGI</button></div>}</>;
}
