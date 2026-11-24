"use client";

import { useEffect } from "react";

type RecordStatus = { node: HTMLElement; file: string; pending: number; failed: boolean };

export default function UploadStatus() {
  useEffect(() => {
    const nativeFetch = window.fetch;
    const records = new WeakMap<HTMLInputElement, RecordStatus>();
    let active: HTMLInputElement | null = null;

    function show(input: HTMLInputElement, message: string, state: string, percent?: number) {
      const record = records.get(input);
      if (!record || !input.isConnected) return;
      record.node.dataset.state = state;
      record.node.replaceChildren();
      const label = document.createElement("span");
      label.textContent = message;
      record.node.append(label);
      if (state === "uploading") {
        const progress = document.createElement("progress");
        progress.max = 100;
        if (percent !== undefined) progress.value = percent;
        progress.setAttribute("aria-label", percent === undefined ? "Menyiapkan upload" : `Upload ${percent}%`);
        record.node.append(progress);
      }
    }

    function onFile(event: Event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
      const file = input.files?.[0];
      if (!file) return;
      records.get(input)?.node.remove();
      const node = document.createElement("div");
      node.className = "site-upload-status";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      input.insertAdjacentElement("afterend", node);
      records.set(input, { node, file: file.name, pending: 0, failed: false });
      active = input;
      show(input, `${file.name} dipilih · siap diunggah.`, "selected");
    }

    // Resize large JPEGs only. Keep transparent PNGs, cutouts and payment evidence intact.
    async function prepare(body: FormData, url: string) {
      if (!/\/api\/(?:admin\/upload|uploads\/team-logo)(?:\?|$)/.test(url)) return body;
      const entry = [...body.entries()].find(([, value]) => value instanceof File && value.type === "image/jpeg" && value.size > 1024 * 1024);
      if (!entry) return body;
      const [key, file] = entry as [string, File];
      try {
        const bitmap = await createImageBitmap(file);
        try {
          const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(bitmap.width * scale);
          canvas.height = Math.round(bitmap.height * scale);
          const context = canvas.getContext("2d");
          if (!context) return body;
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
          if (blob && blob.size < file.size) body.set(key, new File([blob], file.name, { type: "image/jpeg" }));
        } finally { bitmap.close(); }
      } catch { /* Fall back to the original image. */ }
      return body;
    }

    window.fetch = function trackedFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const body = init?.body;
      const fileBody = body instanceof FormData && [...body.values()].some(value => value instanceof File || value instanceof Blob);
      const chunkBody = body instanceof Blob && /\/api\/(?:admin\/upload(?:-(?:audio|video))?|blacklist\/upload|uploads\/team-logo|event-submissions\/upload|member-payments\/proof)\?action=chunk/.test(url);
      const complete = /\/api\/(?:admin\/upload(?:-(?:audio|video))?|blacklist\/upload|uploads\/team-logo|event-submissions\/upload|member-payments\/proof)\?action=complete/.test(url);
      if (complete && active && records.get(active)) {
        const target = active, record = records.get(target)!;
        show(target, `Menyimpan ${record.file}... 99%`, "uploading", 99);
        return nativeFetch.call(window, input, init).then(response => {
          show(target, response.ok ? `${record.file} berhasil diunggah: 100%.` : `${record.file} gagal diproses. Coba lagi.`, response.ok ? "success" : "error");
          return response;
        }, error => { show(target, `${record.file} gagal diproses. Coba lagi.`, "error"); throw error; });
      }
      if (!fileBody && !chunkBody) return nativeFetch.call(window, input, init);
      const target = active;
      const record = target && records.get(target);
      if (record) {
        record.pending++;
        show(target!, `Menyiapkan ${record.file}...`, "uploading");
      }
      let requestStarted = false;
      return (async () => {
        const payload = fileBody ? await prepare(body as FormData, url) : body!;
        if (init?.signal?.aborted) throw new DOMException("Upload dibatalkan", "AbortError");
        return new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          requestStarted = true;
          xhr.open(init?.method || "POST", url);
          xhr.timeout = chunkBody ? 120000 : 90000;
          if (init?.credentials === "include") xhr.withCredentials = true;
          new Headers(init?.headers).forEach((value, key) => xhr.setRequestHeader(key, value));
          const abort = () => xhr.abort();
          init?.signal?.addEventListener("abort", abort, { once: true });
          const cleanup = () => init?.signal?.removeEventListener("abort", abort);
          xhr.upload.onprogress = event => {
            if (record && event.lengthComputable) {
              const percent = Math.min(99, Math.round(event.loaded / event.total * 100));
              show(target!, percent >= 99 ? `Upload ${record.file} terkirim · menyimpan file... 99%` : `Mengunggah ${record.file}: ${percent}%`, "uploading", percent);
            }
          };
          xhr.onload = () => {
            cleanup();
            const response = new Response(xhr.responseText, { status: xhr.status, headers: { "Content-Type": xhr.getResponseHeader("Content-Type") || "application/json" } });
            if (record) {
              record.pending--;
              if (!response.ok) record.failed = true;
              if (record.failed) show(target!, `${record.file} gagal diunggah. Periksa pesan kesalahan lalu coba lagi.`, "error");
              else if (record.pending === 0) show(target!, chunkBody ? `Bagian ${record.file} terkirim. Melanjutkan upload...` : `${record.file} berhasil diunggah: 100%. Simpan formulir jika diperlukan.`, chunkBody ? "uploading" : "success", chunkBody ? 99 : undefined);
            }
            resolve(response);
          };
          const failed = () => {
            cleanup();
            if (record) { record.pending--; record.failed = true; show(target!, `${record.file} gagal diunggah. Periksa koneksi lalu coba lagi.`, "error"); }
            reject(new Error(init?.signal?.aborted ? "Upload dibatalkan." : "Koneksi upload terputus atau terlalu lama. Coba lagi."));
          };
          xhr.onerror = failed;
          xhr.ontimeout = failed;
          xhr.onabort = failed;
          xhr.send(payload);
        });
      })().catch(error => {
        if (!requestStarted && record) {
          record.pending--;
          record.failed = true;
          show(target!, `${record.file} gagal diunggah. Coba lagi.`, "error");
        }
        throw error;
      });
    };
    document.addEventListener("change", onFile, true);
    return () => { document.removeEventListener("change", onFile, true); window.fetch = nativeFetch; };
  }, []);
  return null;
}
