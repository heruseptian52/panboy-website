"use client";

import { useEffect, useRef, useState } from "react";
import PlayerPhoto from "./member/player-photo";
import { prepareFrontPlayerPhoto } from "../lib/player-photo-display";

export type HeroMember = {
  id: number;
  teamName: string;
  logoUrl: string;
  photos: { url: string; x: number; y: number; scale: number }[];
};

export default function MemberHeroCarousel({ members }: { members: HeroMember[] }) {
  const [active, setActive] = useState(0);
  const imageCache = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    if (members.length < 2) return;
    let cancelled = false;
    const next = (active + 1) % members.length;
    const preload = (url: string) => {
      if (!url) return Promise.resolve();
      let pending = imageCache.current.get(url);
      if (!pending) {
        pending = new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => { image.decode().catch(() => {}).finally(resolve); };
          image.onerror = () => resolve();
          image.src = url;
          if (image.complete) image.decode().catch(() => {}).finally(resolve);
        });
        imageCache.current.set(url, pending);
      }
      return pending;
    };
    const member = members[next];
    const ready = Promise.all([
      ...member.photos.map((photo, index) => index === 1 ? prepareFrontPlayerPhoto(photo.url) : preload(photo.url)),
      preload(member.logoUrl),
    ]);
    const timer = window.setTimeout(async () => {
      await ready;
      if (!cancelled) setActive(next);
    }, 2400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [active, members]);

  if (!members.length) return null;

  return (
    <div className="member-hero-carousel" aria-label="Member aktif Panboy Community">
      {members.map((member, index) => index === active && (
        <article
          className={index === active ? "is-active" : ""}
          key={member.id}
          aria-hidden={index !== active}
        >
          <div className={`member-hero-photo-frame count-${member.photos.length}`}>
            {member.photos.length ? (
              <div className={`member-hero-photos count-${member.photos.length}`}>
                {member.photos.map((photo, photoIndex) => (
                  <PlayerPhoto
                    src={photo.url}
                    alt={`Player ${photoIndex + 1} ${member.teamName}`}
                    x={member.photos.length === 1 ? 50 + (photo.x - 42) : photo.x}
                    y={photo.y}
                    scale={photo.scale}
                    eager
                    front={photoIndex === 1}
                    key={`${member.id}-${photoIndex}`}
                  />
                ))}
              </div>
            ) : member.logoUrl ? (
              <div className="member-hero-logo-feature">
                <img src={member.logoUrl} alt={`Logo besar ${member.teamName}`} loading="eager" decoding="async" />
              </div>
            ) : (
              <div className="member-hero-photo-placeholder" />
            )}
            <div className="member-hero-identity">
              {member.logoUrl && (
                <img className="member-hero-logo" src={member.logoUrl} alt={`Logo ${member.teamName}`} loading="eager" decoding="async" />
              )}
              <div>
                <small>MEMBER PANBOY COMMUNITY</small>
                <strong>{member.teamName}</strong>
              </div>
            </div>
          </div>
        </article>
      ))}
      {members.length > 1 && (
        <div className="member-hero-dots" aria-hidden="true">
          {members.map((member, index) => (
            <i className={index === active ? "is-active" : ""} key={member.id} />
          ))}
        </div>
      )}
    </div>
  );
}
