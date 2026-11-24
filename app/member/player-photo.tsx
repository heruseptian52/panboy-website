"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { prepareFrontPlayerPhoto } from "../../lib/player-photo-display";

export default function PlayerPhoto({ src, alt, x, y, scale, eager = false, front = false }: { src: string; alt: string; x: number; y: number; scale: number; eager?: boolean; front?: boolean }) {
  const [display, setDisplay] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!front) return;
    let active = true;
    prepareFrontPlayerPhoto(src).then((url) => { if (active) setDisplay({ source: src, url }); });
    return () => { active = false; };
  }, [front, src]);
  const style = { left: `${x}%`, bottom: `${y}%`, transform: `translateX(-50%) scale(${scale / 100})`, transformOrigin: "center bottom" } as CSSProperties;
  const readySrc = front ? (display?.source === src ? display.url : "") : src;
  return <img src={readySrc || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" style={style} />;
}
