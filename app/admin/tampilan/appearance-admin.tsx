"use client";
import { uploadForm } from "../../../lib/upload-form";
import { FormEvent, useEffect, useState } from "react";
import { removeLogoBackground } from "../../../lib/remove-logo-background";

const defaults = {
  premiumAdVideoUrl: "",
  premiumAdPhotoUrl: "",
  premiumAdPhotoEnabled: "false",
  premiumAdPhotoRatio: "4:5",
  premiumAdEnabled: "false",
  premiumAdSponsor: "PREMIUM PARTNER",
  premiumAdTitle: "PREMIUM VIDEO",
  premiumAdDescription:
    "Promosikan brand, tim esports, produk, atau event kamu di Panboy.",
  premiumAdLink: "",
  premiumAdButton: "LIHAT SELENGKAPNYA",
  premiumAdLabel: "PREMIUM ADVERTISEMENT",
  premiumAdBadge: "PREMIUM ADS",
  premiumAdAutoplay: "true",
  premiumAdLoop: "true",
  premiumAdPosition: "after_carousel",
  musicUrl: "",
  musicTitle: "MUSIK PANBOY",
  musicEnabled: "false",
  musicAutoplay: "false",
  musicLoop: "true",
  musicVolume: "35",
  logoUrl: "/panboy-menu-logo.png",
  heroBackground: "",
  siteBackground: "",
  premiumBackground: "",
  eventsBackground: "",
  collabBackground: "",
  partnersBackground: "",
  primaryColor: "#d7a640",
  backgroundColor: "#060607",
  brandName: "PANBOY",
  brandSubtitle: "",
  navEvent: "EVENT",
  navTopup: "TOP UP UC",
  navAccount: "JUAL AKUN",
  navCollab: "KERJA SAMA",
  heroEyebrow: "OFFICIAL ESPORTS EVENT PORTAL",
  heroTitle1: "YOUR NEXT",
  heroTitle2: "BATTLE",
  heroTitle3: "STARTS HERE.",
  heroDescription: "",
  heroButton: "LIHAT SEMUA EVENT",
  carouselEffect: "slide3d",
  tickerText:
    "PUBG MOBILE EVENT | GESER POSTER | DAFTAR VIA WHATSAPP | PUBG MOBILE EVENT",
  tickerSeparator: "◆",
  tickerSpeed: "17",
  tickerDirection: "right",
  tickerEffect: "glow",
  tickerFont: "esports",
  tickerSize: "13",
  tickerSpacing: "0.18",
  allEventTitle: "ALL EVENT",
  allEventDescription: "",
  panboyEventTitle: "EVENT PANBOY",
  panboyEventDescription: "",
  collabTitle: "KERJA SAMA EVENT ESPORTS.",
  collabDescription: "",
  collabButton: "AJUKAN KERJA SAMA",
  collabEyebrow: "LET'S COLLABORATE",
  collabPoint1: "Event Management",
  collabPoint2: "Live Production",
  collabPoint3: "Creative Design",
  collabWhatsapp: "6281545910291",
  partnerTitle: "PARTNERSHIP PANBOY",
  emptyEventText: "Belum ada event.",
  partnerEmptyText:
    "Logo partnership dapat ditambahkan melalui Dashboard Admin.",
  footerText: "© 2026 PANBOY",
  footerTagline: "ESPORTS • EVENT • PANBOY",
};
type Settings = typeof defaults;
const labels: Record<keyof Settings, string> = {
  premiumAdVideoUrl: "Video iklan",
  premiumAdPhotoUrl: "Foto banner",
  premiumAdPhotoEnabled: "Tampilkan foto",
  premiumAdPhotoRatio: "Rasio foto",
  premiumAdEnabled: "Status iklan",
  premiumAdSponsor: "Nama pengiklan",
  premiumAdTitle: "Judul iklan",
  premiumAdDescription: "Deskripsi iklan",
  premiumAdLink: "Link tujuan",
  premiumAdButton: "Tulisan tombol",
  premiumAdLabel: "Label video premium",
  premiumAdBadge: "Badge video premium",
  premiumAdAutoplay: "Putar otomatis",
  premiumAdLoop: "Ulangi video",
  premiumAdPosition: "Posisi video premium",
  musicUrl: "File lagu",
  musicTitle: "Nama musik",
  musicEnabled: "Status musik",
  musicAutoplay: "Putar otomatis",
  musicLoop: "Ulangi lagu",
  musicVolume: "Volume",
  logoUrl: "Logo utama",
  heroBackground: "Gambar background hero",
  siteBackground: "Background seluruh website",
  premiumBackground: "Background bagian video premium",
  eventsBackground: "Background bagian daftar event",
  collabBackground: "Background bagian kerja sama",
  partnersBackground: "Background bagian partnership",
  primaryColor: "Warna utama",
  backgroundColor: "Warna background",
  brandName: "Nama brand",
  brandSubtitle: "Subjudul brand",
  navEvent: "Menu Event",
  navTopup: "Menu Top Up",
  navAccount: "Menu Jual Akun",
  navCollab: "Menu Kerja Sama",
  heroEyebrow: "Teks kecil hero",
  heroTitle1: "Judul hero baris 1",
  heroTitle2: "Judul hero baris 2",
  heroTitle3: "Judul hero baris 3",
  heroDescription: "Deskripsi hero",
  heroButton: "Tombol hero",
  carouselEffect: "Efek perpindahan poster",
  tickerText: "Isi teks berjalan",
  tickerSeparator: "Simbol pemisah",
  tickerSpeed: "Kecepatan berjalan",
  tickerDirection: "Arah gerakan",
  tickerEffect: "Efek tulisan",
  tickerFont: "Gaya font",
  tickerSize: "Ukuran tulisan",
  tickerSpacing: "Jarak antarhuruf",
  allEventTitle: "Judul All Event",
  allEventDescription: "Deskripsi All Event",
  panboyEventTitle: "Judul Event Panboy",
  panboyEventDescription: "Deskripsi Event Panboy",
  collabTitle: "Judul Kerja Sama",
  collabDescription: "Deskripsi Kerja Sama",
  collabButton: "Tombol Kerja Sama",
  collabEyebrow: "Teks kecil Kerja Sama",
  collabPoint1: "Keunggulan Kerja Sama 1",
  collabPoint2: "Keunggulan Kerja Sama 2",
  collabPoint3: "Keunggulan Kerja Sama 3",
  collabWhatsapp: "WhatsApp Kerja Sama",
  partnerTitle: "Judul Partnership",
  emptyEventText: "Tulisan saat event kosong",
  partnerEmptyText: "Tulisan saat partnership kosong",
  footerText: "Tulisan footer",
  footerTagline: "Tagline footer",
};
const fontNames: Record<string, string> = {
  esports: "Esports Bold",
  modern: "Modern Sport",
  tech: "Tech / Digital",
  elegant: "Elegant Serif",
  clean: "Clean Sans",
};
export default function AppearanceAdmin({
  mediaOnly = false,
}: {
  mediaOnly?: boolean;
}) {
  const [form, setForm] = useState<Settings>(defaults),
    [msg, setMsg] = useState(""),
    [musicMsg, setMusicMsg] = useState(""),
    [musicUploading, setMusicUploading] = useState(false),
    [videoMsg, setVideoMsg] = useState(""),
    [photoMsg,setPhotoMsg] = useState(""),
    [photoUploading,setPhotoUploading] = useState(false),
    [videoUploading, setVideoUploading] = useState(false);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((x) => setForm({ ...defaults, ...x }));
  }, []);
  const change = (key: keyof Settings, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const mediaBusy = photoUploading || videoUploading || musicUploading;
  async function persistPhoto(patch: Partial<Pick<Settings,"premiumAdPhotoUrl"|"premiumAdPhotoEnabled"|"premiumAdPhotoRatio">>) {
    const response = await fetch("/api/admin/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
    if(!response.ok) throw new Error("Pengaturan foto gagal disimpan.");
    setForm(current=>({...current,...patch}));
  }
  async function updatePhoto(patch: Parameters<typeof persistPhoto>[0]) {
    setPhotoUploading(true);
    try { await persistPhoto(patch); setPhotoMsg("Pengaturan foto tersimpan."); }
    catch(error) { setPhotoMsg(error instanceof Error ? error.message : "Gagal menyimpan."); }
    finally { setPhotoUploading(false); }
  }
  async function upload(
    file: File,
    key:
      | "premiumAdPhotoUrl"
      | "logoUrl"
      | "heroBackground"
      | "siteBackground"
      | "premiumBackground"
      | "eventsBackground"
      | "collabBackground"
      | "partnersBackground",
  ) {
    setMsg(
      key === "logoUrl"
        ? "Menghapus background logo..."
        : "Mengunggah gambar...",
    );
    const prepared =
        key === "logoUrl" ? await removeLogoBackground(file) : file,
      f = new FormData();
    f.append("poster", prepared);
    const r = await uploadForm("/api/admin/upload", { method: "POST", body: f }),
      x = await r.json();
    if (r.ok) {
      change(key, x.url);
      setMsg(
        key === "logoUrl"
          ? "Logo transparan siap digunakan."
          : "Gambar berhasil diunggah.",
      );
    } else setMsg(x.error);
  }
  async function uploadMusic(file: File) {
    setMusicUploading(true);
    setMusicMsg("Menyiapkan upload lagu...");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Ukuran lagu maksimal 20 MB.");
      const chunkSize = 1024 * 1024,
        parts = Math.ceil(file.size / chunkSize);
      const init = await fetch("/api/admin/upload-audio?action=init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          type: file.type,
          parts,
        }),
      });
      const initText = await init.text();
      let initResult: { uploadId?: string; error?: string } = {};
      try {
        initResult = JSON.parse(initText);
      } catch {
        throw new Error(
          init.status === 413
            ? "File terlalu besar untuk diunggah."
            : "Server tidak dapat memulai upload.",
        );
      }
      if (!init.ok || !initResult.uploadId)
        throw new Error(initResult.error || "Gagal memulai upload lagu.");
      for (let index = 0; index < parts; index++) {
        setMusicMsg(`Mengunggah lagu ${Math.round((index / parts) * 100)}%...`);
        const chunk = file.slice(
          index * chunkSize,
          Math.min(file.size, (index + 1) * chunkSize),
        );
        const response = await fetch(
          `/api/admin/upload-audio?action=chunk&uploadId=${initResult.uploadId}&index=${index}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk,
          },
        );
        if (!response.ok) {
          const message = await response.text();
          let error = "Gagal mengunggah bagian lagu.";
          try {
            error = JSON.parse(message).error || error;
          } catch {}
          throw new Error(error);
        }
      }
      setMusicMsg("Menggabungkan dan menyimpan lagu...");
      const response = await fetch(
          `/api/admin/upload-audio?action=complete&uploadId=${initResult.uploadId}`,
          { method: "POST" },
        ),
        result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyelesaikan upload lagu.");
      const next = { musicUrl: result.url, musicEnabled: "true" };
      setForm(current=>({...current,...next}));
      const saved = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!saved.ok)
        throw new Error("Lagu terunggah, tetapi pengaturan gagal disimpan.");
      setMusicMsg("✓ LAGU BERHASIL DIUNGGAH DAN SUDAH AKTIF");
    } catch (error) {
      setMusicMsg(
        error instanceof Error ? error.message : "Gagal mengunggah lagu.",
      );
    } finally {
      setMusicUploading(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMsg(r.ok ? "Tampilan website berhasil diperbarui." : "Gagal menyimpan.");
  }
  async function uploadPremiumVideo(file: File) {
    setVideoUploading(true);
    setVideoMsg("Menyiapkan upload video...");
    try {
      if (file.size > 200 * 1024 * 1024)
        throw new Error("Ukuran video maksimal 200 MB.");
      const chunkSize = 1024 * 1024;
      const totalParts = Math.ceil(file.size / chunkSize);
      const init = await fetch("/api/admin/upload-video?action=init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          type: file.type,
          parts: totalParts,
        }),
      });
      const initText = await init.text();
      let initResult: { uploadId?: string; error?: string } = {};
      try {
        initResult = JSON.parse(initText);
      } catch {
        throw new Error(
          init.status === 413
            ? "Video terlalu besar untuk dikirim."
            : "Server tidak dapat memulai upload video.",
        );
      }
      if (!init.ok || !initResult.uploadId)
        throw new Error(initResult.error || "Gagal memulai upload video.");
      const uploadedParts: Array<{ partNumber: number; etag: string }> = [];
      for (let index = 0; index < totalParts; index++) {
        setVideoMsg(
          `Mengunggah video ${Math.round((index / totalParts) * 100)}%...`,
        );
        const response = await fetch(
          `/api/admin/upload-video?action=chunk&uploadId=${initResult.uploadId}&index=${index}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: file.slice(
              index * chunkSize,
              Math.min(file.size, (index + 1) * chunkSize),
            ),
          },
        );
        const text = await response.text();
        let part: { partNumber?: number; etag?: string; error?: string } = {};
        try {
          part = JSON.parse(text);
        } catch {}
        if (!response.ok || !part.partNumber || !part.etag)
          throw new Error(part.error || "Gagal mengunggah bagian video.");
        uploadedParts.push({ partNumber: part.partNumber, etag: part.etag });
      }
      setVideoMsg("Menyimpan video...");
      const response = await fetch(
        `/api/admin/upload-video?action=complete&uploadId=${initResult.uploadId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parts: uploadedParts }),
        },
      );
      const responseText = await response.text();
      let result: { url?: string; error?: string } = {};
      try {
        result = JSON.parse(responseText);
      } catch {}
      if (!response.ok || !result.url)
        throw new Error(result.error || "Gagal menyelesaikan upload video.");
      const next = {
        premiumAdVideoUrl: result.url,
        premiumAdEnabled: "true",
      };
      setForm(current=>({...current,...next}));
      const saved = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!saved.ok)
        throw new Error("Video terunggah, tetapi pengaturan gagal disimpan.");
      setVideoMsg("✓ VIDEO IKLAN BERHASIL DIUNGGAH DAN SUDAH AKTIF");
    } catch (error) {
      setVideoMsg(
        error instanceof Error ? error.message : "Gagal mengunggah video.",
      );
    } finally {
      setVideoUploading(false);
    }
  }
  const ordinary = (Object.keys(defaults) as (keyof Settings)[]).filter(
    (k) =>
      !k.startsWith("ticker") &&
      !k.startsWith("music") &&
      !k.startsWith("premiumAd"),
  );
  return (
    <form
      className={`appearance-form ${mediaOnly ? "media-only" : "appearance-main"}`}
      onSubmit={save}
    >
      <div>
        <p>{mediaOnly ? "PUSAT MEDIA WEBSITE" : "PENGATURAN WEBSITE"}</p>
        <h1>{mediaOnly ? "Video, Foto & Musik" : "EDIT TAMPILAN & TULISAN"}</h1>
        <span>
          {mediaOnly
            ? "Kelola video, foto banner, dan musik beranda."
            : "Perubahan akan tampil langsung di halaman utama."}
        </span>
      </div>
      <section className="ticker-admin">
        <div>
          <p>TEKS BERJALAN</p>
          <h2>ATUR TICKER WEBSITE</h2>
          <span>Gunakan tanda | untuk memisahkan setiap tulisan.</span>
        </div>
        <div className="ticker-preview">
          <div
            className={`preview-track font-${form.tickerFont} effect-${form.tickerEffect}`}
          >
            {form.tickerText.split("|").map((x, i) => (
              <span key={i}>
                {x.trim()} <i>{form.tickerSeparator}</i>
              </span>
            ))}
          </div>
        </div>
        <div className="ticker-controls">
          <label>
            Isi Tulisan
            <textarea
              value={form.tickerText}
              onChange={(e) => change("tickerText", e.target.value)}
              placeholder="PUBG MOBILE EVENT | DAFTAR SEKARANG"
            />
          </label>
          <label>
            Simbol Pemisah
            <input
              maxLength={4}
              value={form.tickerSeparator}
              onChange={(e) => change("tickerSeparator", e.target.value)}
            />
          </label>
          <label>
            Font
            <select
              value={form.tickerFont}
              onChange={(e) => change("tickerFont", e.target.value)}
            >
              {Object.entries(fontNames).map(([value, name]) => (
                <option value={value} key={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Efek
            <select
              value={form.tickerEffect}
              onChange={(e) => change("tickerEffect", e.target.value)}
            >
              <option value="glow">Glow Premium</option>
              <option value="shadow">Bayangan Tebal</option>
              <option value="outline">Outline</option>
              <option value="soft">Soft</option>
              <option value="none">Tanpa Efek</option>
            </select>
          </label>
          <label>
            Arah
            <select
              value={form.tickerDirection}
              onChange={(e) => change("tickerDirection", e.target.value)}
            >
              <option value="right">Berjalan ke Kanan</option>
              <option value="left">Berjalan ke Kiri</option>
              <option value="static">Diam di Tengah</option>
            </select>
          </label>
          <label>
            Kecepatan: {form.tickerSpeed} detik
            <input
              type="range"
              min="5"
              max="60"
              value={form.tickerSpeed}
              onChange={(e) => change("tickerSpeed", e.target.value)}
            />
            <small>Angka kecil lebih cepat.</small>
          </label>
          <label>
            Ukuran: {form.tickerSize}px
            <input
              type="range"
              min="9"
              max="24"
              value={form.tickerSize}
              onChange={(e) => change("tickerSize", e.target.value)}
            />
          </label>
          <label>
            Jarak Huruf: {form.tickerSpacing}em
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={form.tickerSpacing}
              onChange={(e) => change("tickerSpacing", e.target.value)}
            />
          </label>
        </div>
      </section>
      <section className="premium-ad-admin" id="media-video">
        <div>
          <h2>Video</h2>
          <span>
            Video tampil eksklusif di halaman utama. Gunakan MP4 atau WebM
            maksimal 200 MB.
          </span>
        </div>
        <div className="premium-ad-controls">
          <label>
            Upload Video
            <input
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              disabled={mediaBusy}
              onChange={(e) =>
                e.target.files?.[0] && uploadPremiumVideo(e.target.files[0])
              }
            />
            <small>
              {videoUploading
                ? "Sedang mengunggah, mohon tunggu..."
                : "Video langsung disimpan otomatis setelah dipilih."}
            </small>
          </label>
          <label>
            Tampilkan video
            <select
              value={form.premiumAdEnabled}
              onChange={(e) => change("premiumAdEnabled", e.target.value)}
            >
              <option value="true">AKTIF</option>
              <option value="false">NONAKTIF</option>
            </select>
          </label>
          <label>Judul di atas video
            <input value={form.premiumAdTitle} onChange={e=>change("premiumAdTitle",e.target.value)} placeholder="PREMIUM VIDEO"/>
          </label>
          <label>
            Putar Otomatis
            <select
              value={form.premiumAdAutoplay}
              onChange={(e) => change("premiumAdAutoplay", e.target.value)}
            >
              <option value="true">YA, UTAMAKAN SUARA AKTIF</option>
              <option value="false">TIDAK</option>
            </select>
          </label>
          <label>
            Ulangi Video
            <select
              value={form.premiumAdLoop}
              onChange={(e) => change("premiumAdLoop", e.target.value)}
            >
              <option value="true">YA</option>
              <option value="false">TIDAK</option>
            </select>
          </label>
          <label>
            Posisi di Beranda
            <select
              value={form.premiumAdPosition}
              onChange={(e) => change("premiumAdPosition", e.target.value)}
            >
              <option value="top">PALING ATAS</option>
              <option value="after_carousel">SETELAH SLIDER</option>
              <option value="after_events">SETELAH DAFTAR EVENT</option>
              <option value="bottom">PALING BAWAH</option>
            </select>
          </label>
        </div>
        {videoMsg && (
          <p
            className={`music-upload-message${videoMsg.startsWith("✓") ? " success" : ""}`}
          >
            {videoMsg}
          </p>
        )}
        {form.premiumAdVideoUrl && (
          <div className="premium-ad-preview">
            <video controls muted src={form.premiumAdVideoUrl} />
            <button
              type="button"
              onClick={() => change("premiumAdVideoUrl", "")}
            >
              HAPUS VIDEO
            </button>
          </div>
        )}
      </section>
      <section className="premium-ad-admin photo-admin" id="media-photo">
        <h2>Foto Banner</h2>
        <p>Satu foto di bawah video. Unggah untuk langsung menampilkannya di beranda.</p>
        <div className="premium-ad-controls">
          <label>Foto banner (maksimal 10 MB)
            <input type="file" accept="image/*" disabled={mediaBusy} onChange={async e=>{
              const file=e.target.files?.[0];
              if (!file) return;
              setPhotoUploading(true);
              setPhotoMsg("Mengunggah foto…");
              try {
                const payload = new FormData();
                payload.append("poster",file);
                const response = await uploadForm("/api/admin/upload",{method:"POST",body:payload});
                const result = await response.json();
                if(!response.ok || !result.url) throw new Error(result.error || "Unggah foto gagal.");
                await persistPhoto({premiumAdPhotoUrl:result.url,premiumAdPhotoEnabled:"true",premiumAdPhotoRatio:form.premiumAdPhotoRatio});
                setPhotoMsg("Foto tersimpan dan aktif di beranda.");
              } catch(error) { setPhotoMsg(error instanceof Error ? error.message : "Foto gagal disimpan."); }
              finally { setPhotoUploading(false); }
            }}/>
          </label>
          <label>Tampilkan foto
            <select disabled={mediaBusy} value={form.premiumAdPhotoEnabled} onChange={e=>updatePhoto({premiumAdPhotoEnabled:e.target.value})}>
              <option value="true">Aktif</option><option value="false">Nonaktif</option>
            </select>
          </label>
          <label>Ukuran foto
            <select disabled={mediaBusy} value={form.premiumAdPhotoRatio} onChange={e=>updatePhoto({premiumAdPhotoRatio:e.target.value})}>
              <option value="4:5">Poster · 4:5</option><option value="16:9">Thumbnail · 16:9</option>
            </select>
          </label>
          {form.premiumAdPhotoUrl && <div>
            <img src={form.premiumAdPhotoUrl} alt="Pratinjau foto banner" style={{width:"100%",maxWidth:240,aspectRatio:form.premiumAdPhotoRatio==="16:9"?"16/9":"4/5",objectFit:"contain",background:"#111"}}/>
            <button type="button" disabled={mediaBusy} onClick={()=>updatePhoto({premiumAdPhotoUrl:"",premiumAdPhotoEnabled:"false"})}>Hapus foto</button>
          </div>}
        </div>
        {photoMsg && <p role="status">{photoMsg}</p>}
      </section>
      <section className="music-admin" id="media-music">
        <div>
          <h2>Musik</h2>
          <span>Upload MP3, M4A, OGG, atau WAV maksimal 20 MB.</span>
        </div>
        <div className="music-controls">
          <label>
            Upload Lagu
            <input
              type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
              onChange={(e) =>
                e.target.files?.[0] && uploadMusic(e.target.files[0])
              }
              disabled={mediaBusy}
            />
            <small>
              {musicUploading
                ? "Sedang mengunggah, jangan klik Simpan dahulu..."
                : "Setelah dipilih, lagu akan disimpan otomatis."}
            </small>
          </label>
          <label>
            Nama Musik
            <input
              value={form.musicTitle}
              onChange={(e) => change("musicTitle", e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={form.musicEnabled}
              onChange={(e) => change("musicEnabled", e.target.value)}
            >
              <option value="true">AKTIF</option>
              <option value="false">NONAKTIF</option>
            </select>
          </label>
          <label>
            Putar Otomatis
            <select
              value={form.musicAutoplay}
              onChange={(e) => change("musicAutoplay", e.target.value)}
            >
              <option value="true">YA</option>
              <option value="false">TIDAK</option>
            </select>
            <small>
              Beberapa browser menunggu pengunjung menyentuh halaman.
            </small>
          </label>
          <label>
            Ulangi Lagu
            <select
              value={form.musicLoop}
              onChange={(e) => change("musicLoop", e.target.value)}
            >
              <option value="true">YA, ULANG TERUS</option>
              <option value="false">TIDAK</option>
            </select>
          </label>
          <label>
            Volume: {form.musicVolume}%
            <input
              type="range"
              min="0"
              max="100"
              value={form.musicVolume}
              onChange={(e) => change("musicVolume", e.target.value)}
            />
          </label>
        </div>
        {musicMsg && (
          <p
            className={`music-upload-message${musicMsg.startsWith("✓") ? " success" : ""}`}
          >
            {musicMsg}
          </p>
        )}
        {form.musicUrl && (
          <div className="music-preview">
            <audio controls src={form.musicUrl} />
            <button type="button" onClick={() => change("musicUrl", "")}>
              HAPUS LAGU
            </button>
          </div>
        )}
      </section>
      <div className="appearance-grid">
        {ordinary.map((k) =>
          k === "carouselEffect" ? (
            <label key={k}>
              {labels[k]}
              <select
                value={form[k]}
                onChange={(e) => change(k, e.target.value)}
              >
                <option value="slide3d">SLIDE 3D — Halus & Premium</option>
                <option value="fade">FADE — Memudar Lembut</option>
                <option value="zoom">ZOOM — Fokus ke Depan</option>
                <option value="flip">FLIP — Putar Kartu</option>
              </select>
              <small>Pilih efek saat poster digeser.</small>
            </label>
          ) : k === "logoUrl" ||
            (k.toLowerCase().includes("background") &&
              !k.toLowerCase().includes("color")) ? (
            <label key={k}>
              {labels[k]}
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  upload(
                    e.target.files[0],
                    k as
                      | "logoUrl"
                      | "heroBackground"
                      | "siteBackground"
                      | "premiumBackground"
                      | "eventsBackground"
                      | "collabBackground"
                      | "partnersBackground",
                  )
                }
              />
              {k === "logoUrl" && (
                <small>Background polos akan dihapus otomatis.</small>
              )}
              {form[k] && <img src={form[k]} alt="Preview" />}
            </label>
          ) : k.includes("Color") ? (
            <label key={k}>
              {labels[k]}
              <input
                type="color"
                value={form[k]}
                onChange={(e) => change(k, e.target.value)}
              />
            </label>
          ) : (
            <label key={k}>
              {labels[k]}
              {k.toLowerCase().includes("description") ? (
                <textarea
                  value={form[k]}
                  onChange={(e) => change(k, e.target.value)}
                />
              ) : (
                <input
                  value={form[k]}
                  onChange={(e) => change(k, e.target.value)}
                />
              )}
            </label>
          ),
        )}
      </div>
      {msg && <p className="form-message">{msg}</p>}
      <button disabled={mediaBusy}>SIMPAN SEMUA PERUBAHAN</button>
    </form>
  );
}
