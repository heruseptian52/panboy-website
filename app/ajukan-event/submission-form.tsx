"use client";
import { FormEvent, useState } from "react";
import { uploadForm } from "../../lib/upload-form";

async function preparePoster(file: File): Promise<File> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Poster asli maksimal 10 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Pilih poster JPG, PNG, atau WebP.");
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    await photo.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1400 / Math.max(photo.naturalWidth, photo.naturalHeight));
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Perangkat tidak bisa memproses poster ini. Coba gambar lain.");
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .78));
    if (!blob || blob.type !== "image/webp" || blob.size > 2 * 1024 * 1024) throw new Error("Poster masih terlalu besar. Coba gambar dengan resolusi lebih kecil.");
    return new File([blob], "poster-event.webp", { type: "image/webp" });
  } finally { URL.revokeObjectURL(url); }
}

export default function EventSubmissionForm() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [success, setSuccess] = useState(false), [mode, setMode] = useState("Online");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, data = new FormData(form);
    const start = String(data.get("startDate")), end = String(data.get("endDate"));
    if (end < start) return setMessage("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    setBusy(true); setSuccess(false); setMessage("Menyiapkan poster...");
    try {
      const poster = data.get("poster");
      if (!(poster instanceof File) || !poster.size) throw new Error("Pilih poster event terlebih dahulu.");
      const prepared = await preparePoster(poster);
      const media = new FormData(); media.set("poster", prepared);
      const uploaded = await uploadForm("/api/event-submissions/upload", { method: "POST", body: media });
      const resultUpload = await uploaded.json();
      if (!uploaded.ok || !resultUpload.url) throw new Error(resultUpload.error || "Poster gagal diunggah.");
      data.delete("poster"); data.set("posterUrl", resultUpload.url);
      setMessage("Mengirim poster dan data event...");
      const response = await fetch("/api/event-submissions", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || (response.status === 413 ? "Poster melebihi batas unggahan server. Coba gambar yang lebih kecil." : "Server belum dapat menerima pengajuan. Coba lagi sebentar."));
      if (!result?.ok) throw new Error("Respons server tidak lengkap. Periksa daftar pengajuan sebelum mengirim ulang.");
      setSuccess(true); setMessage(result.message); form.reset(); setMode("Online");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Koneksi gagal. Coba lagi."); }
    finally { setBusy(false); }
  }
  return <form className="submission-form" onSubmit={submit}><h2>Informasi event</h2><p>Kolom bertanda * wajib diisi. Poster maksimal 10 MB.</p><label className="submission-honeypot">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
    <label>Nama event *<input name="title" required maxLength={120} placeholder="Contoh: Grand Opening Tournament"/></label><div className="submission-two"><label>Nama penyelenggara *<input name="organizer" required maxLength={100} placeholder="Nama komunitas atau organizer"/></label><label>WhatsApp pendaftaran *<input name="whatsapp" required inputMode="tel" placeholder="08xxxxxxxxxx"/></label></div>
    <div className="submission-two"><label>Mulai *<input name="startDate" type="date" required min={new Date(Date.now()+8*3600000).toISOString().slice(0,10)}/></label><label>Selesai *<input name="endDate" type="date" required min={new Date(Date.now()+8*3600000).toISOString().slice(0,10)}/></label></div>
    <div className="submission-two"><label>Prizepool<input name="prizepool" maxLength={60} placeholder="Contoh: Rp1.000.000"/></label><label>Biaya registrasi<input name="registrationFee" maxLength={60} placeholder="Contoh: Gratis atau Rp25.000"/></label></div><label>Mode event *<select name="eventMode" value={mode} onChange={e=>setMode(e.target.value)}><option>Online</option><option>Offline</option></select></label>
    {mode === "Offline" && <><div className="submission-two"><label>Kota *<input name="city" required maxLength={80}/></label><label>Provinsi *<input name="province" required maxLength={80}/></label></div><label>Alamat lokasi *<input name="address" required maxLength={200}/></label></>}
    <label>Poster event *<input name="poster" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>{const file=e.target.files?.[0]; if(file && file.size>10*1024*1024){setMessage("Poster maksimal 10 MB.");e.target.value=""}else setMessage("")}}/><small>JPG, PNG, atau WebP. Rekomendasi ukuran 4:5.</small></label><label>Catatan untuk admin<textarea name="notes" maxLength={500} rows={3} placeholder="Info tambahan yang perlu diketahui admin (opsional)"/></label>
    {message && <p role="status" className={`submission-message ${success ? "success" : ""}`}>{message}</p>}{success && <a className="submission-back" href="/#all-event">KEMBALI KE DAFTAR EVENT ↗</a>}<button type="submit" disabled={busy}>{busy ? "MENGIRIM..." : "AJUKAN EVENT UNTUK DITINJAU →"}</button><small className="submission-note">Pengajuan tidak langsung tampil. Admin dapat menyetujui atau menolaknya setelah pemeriksaan.</small>
  </form>;
}
