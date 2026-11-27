"use client";

import { useEffect, useState } from "react";

/** Crop transparent padding for card display without changing the stored logo. */
export default function TrimmedLogo({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setDisplaySrc(src);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const ratio = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let left = width, top = height, right = -1, bottom = -1;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          if (pixels[(y * width + x) * 4 + 3] < 12) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (right < left || (left < width * .04 && top < height * .04 && right > width * .96 && bottom > height * .96)) return;
        const cropped = document.createElement("canvas");
        cropped.width = right - left + 1;
        cropped.height = bottom - top + 1;
        cropped.getContext("2d")?.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
        cropped.toBlob(blob => {
          if (!blob || cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setDisplaySrc(objectUrl);
        }, "image/png");
      } catch { /* External logos without CORS remain untouched. */ }
    };
    image.src = src;
    return () => { cancelled = true; image.onload = null; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);

  return <img src={displaySrc} alt={alt} loading="lazy" decoding="async" style={style} />;
}
