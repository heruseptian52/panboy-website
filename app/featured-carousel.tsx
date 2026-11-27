"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { EventRecord } from "../lib/events";

function whatsapp(number: string, title: string) {
  const digits = number.replace(/\D/g, "").replace(/^0/, "62");
  const text = encodeURIComponent(
    `Halo Admin, saya ingin registrasi event ${title}.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

type TickerSettings = {
  text: string;
  separator: string;
  speed: string;
  direction: string;
  effect: string;
  font: string;
  size: string;
  spacing: string;
};
export default function FeaturedCarousel({
  events,
  ticker,
  effect = "slide3d",
}: {
  events: EventRecord[];
  ticker: TickerSettings;
  effect?: string;
}) {
  const [active, setActive] = useState(0),
    [currentTime, setCurrentTime] = useState(0),
    startX = useRef<number | null>(null);
  useEffect(() => { setCurrentTime(Date.now()); const timer = setInterval(() => setCurrentTime(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const visibleEvents = events.filter(event => { const deadline = new Date(`${event.startDate}T19:00:00+07:00`).getTime(); return !Number.isFinite(deadline) || currentTime < deadline; });
  if (!visibleEvents.length) return null;
  const current = visibleEvents[active % visibleEvents.length],
    move = (direction: number) =>
      setActive((index) => (index + direction + visibleEvents.length) % visibleEvents.length);
  const cards = [0, 1, 2]
    .filter((offset) => offset < visibleEvents.length)
    .map((offset) => ({
      event: visibleEvents[(active + offset) % visibleEvents.length],
      offset,
    }));
  const tickerItems = ticker.text
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean),
    tickerContent = tickerItems.length ? tickerItems : ["PUBG MOBILE EVENT"];
  const tickerStyle = {
    "--ticker-speed": `${Math.max(5, Math.min(90, Number(ticker.speed) || 17))}s`,
    "--ticker-size": `${Math.max(9, Math.min(28, Number(ticker.size) || 13))}px`,
    "--ticker-spacing": `${Math.max(0, Math.min(0.5, Number(ticker.spacing) || 0.18))}em`,
  } as CSSProperties;
  return (
    <section className="featured-float" id="home" aria-label="Event pilihan">
      <div className="featured-glow" />
      <div className="featured-stage container">
        <div className="featured-copy">
          <small>
            {current.category.toUpperCase() === "EVENT PREMIUM"
              ? "EVENT PREMIUM"
              : "EVENT PILIHAN PANBOY"}
          </small>
          <h2>
            Temukan Pertarungan
            <br />
            <em>Berikutnya.</em>
          </h2>
          <p>{current.title}</p>
          <span>
            {current.eventDate} · {current.eventMode}
          </span>
          <div className="featured-actions">
            <a
              href={current.registrationType === "INTERNAL" ? `/event/${current.id}` : whatsapp(current.whatsapp, current.title)}
              target="_blank"
              rel="noreferrer"
            >
              LIHAT EVENT <b>↗</b>
            </a>
            <div className="featured-controls">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Poster sebelumnya"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Poster berikutnya"
              >
                →
              </button>
            </div>
          </div>
          <div className="featured-dots">
            {visibleEvents.map((event, index) => (
              <button
                key={event.id}
                className={index === active % visibleEvents.length ? "active" : ""}
                onClick={() => setActive(index)}
                aria-label={`Tampilkan ${event.title}`}
              />
            ))}
          </div>
        </div>
        <div
          className={`featured-stack effect-${["slide3d", "fade", "zoom", "flip"].includes(effect) ? effect : "slide3d"}`}
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => {
            if (
              startX.current !== null &&
              Math.abs(e.clientX - startX.current) > 35
            )
              move(e.clientX < startX.current ? 1 : -1);
            startX.current = null;
          }}
        >
          {cards.reverse().map(({ event, offset }) => (
            <button
              className={`featured-poster card-${offset}`}
              type="button"
              onClick={() =>
                offset
                  ? move(offset)
                  : window.open(event.registrationType === "INTERNAL" ? `/event/${event.id}` : whatsapp(event.whatsapp, event.title), "_blank")
              }
              key={event.id}
              aria-label={
                offset ? `Tampilkan ${event.title}` : event.registrationType === "INTERNAL" ? `Lihat event internal ${event.title}` : `Daftar ${event.title}`
              }
            >
              <img src={event.imageUrl} alt={event.title} loading="lazy" decoding="async" />
              <span>{offset === 0 ? "EVENT UTAMA" : `NEXT 0${offset}`}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        className={`featured-ticker ticker-font-${ticker.font} ticker-effect-${ticker.effect}`}
        style={tickerStyle}
      >
        <div
          className={`featured-ticker-track ticker-direction-${ticker.direction}`}
        >
          {[...tickerContent, ...tickerContent].map((item, index) => (
            <span key={`${item}-${index}`}>
              {item}
              <i>{ticker.separator || "◆"}</i>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
