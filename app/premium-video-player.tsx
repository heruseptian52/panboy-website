"use client";
import { useEffect, useRef } from "react";

export default function PremiumVideoPlayer({
  src, autoplay, loop,
}: {
  src: string;
  autoplay: boolean;
  loop: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const audible = useRef(false);

  function syncMusic() {
    const player = video.current;
    const playingSound = !!player && !player.paused && !player.ended &&
      !player.muted && player.volume > 0;
    if (playingSound === audible.current) return;
    audible.current = playingSound;
    document.dispatchEvent(new Event(playingSound ? "panboy:ad-start" : "panboy:ad-stop"));
  }

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    let visible = false;
    let attempt = 0;
    let waitingForGesture = false;
    let observer: IntersectionObserver | undefined;

    async function playInView() {
      if (!player || !visible || player.ended) return;
      const current = ++attempt;
      try {
        await player.play();
      } catch (error) {
        if (current !== attempt || !visible || player.muted ||
            !(error instanceof DOMException && error.name === "NotAllowedError")) return;
        waitingForGesture = true;
        player.muted = true;
        await player.play().catch(() => {});
      }
    }

    function enableSound(event: Event) {
      if (!player || !waitingForGesture || !event.isTrusted) return;
      if (!player.muted) { waitingForGesture = false; return; }
      if (event.target === player || (visible && player.paused)) return;
      waitingForGesture = false;
      player.muted = false;
      if (visible) void playInView();
    }

    if (autoplay) {
      document.addEventListener("click", enableSound, true);
      document.addEventListener("keydown", enableSound, true);
      if (typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && player.paused) void playInView();
          if (!visible) { ++attempt; player.pause(); }
        });
        observer.observe(player);
      } else {
        visible = true;
        void playInView();
      }
    }
    return () => {
      ++attempt;
      visible = false;
      observer?.disconnect();
      document.removeEventListener("click", enableSound, true);
      document.removeEventListener("keydown", enableSound, true);
      if (audible.current) {
        audible.current = false;
        document.dispatchEvent(new Event("panboy:ad-stop"));
      }
    };
  }, [autoplay, src]);

  return (
    <div className="premium-video-player">
      <video key={src} ref={video} src={src}
        playsInline controls loop={loop} preload={autoplay ? "auto" : "metadata"}
        onPlaying={syncMusic} onVolumeChange={syncMusic}
        onPause={syncMusic} onEnded={syncMusic} />
    </div>
  );
}
