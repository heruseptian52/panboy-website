"use client";
import { useEffect, useRef, useState } from "react";
export default function SiteMusic({
  url,
  title,
  enabled,
  autoplay,
  loop,
  volume,
}: {
  url: string;
  title: string;
  enabled: boolean;
  autoplay: boolean;
  loop: boolean;
  volume: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const resumeAfterAd = useRef(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.volume = Math.max(0, Math.min(1, volume / 100));
    if (!autoplay) return;
    const start = () =>
      player
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    const startOnInteraction = () => {
      if (player.paused) start();
    };
    document.addEventListener("pointerdown", startOnInteraction, {
      once: true,
    });
    document.addEventListener("keydown", startOnInteraction, { once: true });
    return () => {
      document.removeEventListener("pointerdown", startOnInteraction);
      document.removeEventListener("keydown", startOnInteraction);
    };
  }, [url, autoplay, volume]);
  useEffect(() => {
    const pauseForAd = () => {
      const player = audio.current;
      if (!player) return;
      resumeAfterAd.current = !player.paused || autoplay;
      player.pause();
    };
    const resumeMusic = () => {
      const player = audio.current;
      if (!player || !resumeAfterAd.current) return;
      player
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
      resumeAfterAd.current = false;
    };
    document.addEventListener("panboy:ad-start", pauseForAd);
    document.addEventListener("panboy:ad-stop", resumeMusic);
    return () => {
      document.removeEventListener("panboy:ad-start", pauseForAd);
      document.removeEventListener("panboy:ad-stop", resumeMusic);
    };
  }, [autoplay]);
  if (!enabled || !url) return null;
  const toggle = () => {
    const player = audio.current;
    if (!player) return;
    if (player.paused)
      player
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    else {
      player.pause();
      setPlaying(false);
    }
  };
  return (
    <div className="site-music">
      <audio
        ref={audio}
        src={url}
        loop={loop}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        aria-pressed={playing}
      >
        <span className={`music-bars${playing ? " playing" : ""}`}>
          <i />
          <i />
          <i />
        </span>
        <b>{playing ? "PAUSE" : title || "MUSIK"}</b>
      </button>
    </div>
  );
}
