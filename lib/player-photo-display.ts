"use client";

const prepared = new Map<string, Promise<string>>();

// Fill transparent gaps inside the front player's silhouette for display only.
// The uploaded image in storage is never changed.
export function prepareFrontPlayerPhoto(src: string): Promise<string> {
  const cached = prepared.get(src);
  if (cached) return cached;
  const task = (async () => {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Foto player tidak dapat dimuat");
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) { bitmap.close(); return src; }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    let changed = false;
    for (let y = 0; y < canvas.height; y++) {
      let left = canvas.width, right = -1;
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 24) continue;
        left = Math.min(left, x);
        right = x;
      }
      if (right < left) continue;
      for (let x = left; x <= right; x++) {
        const index = (y * canvas.width + x) * 4;
        if (pixels[index + 3] === 255) continue;
        if (pixels[index + 3] < 24) {
          pixels[index] = 8;
          pixels[index + 1] = 8;
          pixels[index + 2] = 9;
        }
        pixels[index + 3] = 255;
        changed = true;
      }
    }
    if (!changed) return src;
    context.putImageData(image, 0, 0);
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return result ? URL.createObjectURL(result) : src;
  })().catch(() => src);
  prepared.set(src, task);
  return task;
}
