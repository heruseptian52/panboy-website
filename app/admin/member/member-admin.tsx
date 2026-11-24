"use client";
import { uploadForm } from "../../../lib/upload-form";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BenefitIcon, benefitIcons } from "../../member/benefit-icon";
import PlayerPhoto from "../../member/player-photo";
type Member = {
  id: number;
  teamName: string;
  ownerName: string;
  managementName: string;
  whatsapp: string;
  logoUrl: string;
  logoX: number;
  logoY: number;
  logoScale: number;
  instagramUsername: string;
  tiktokUsername: string;
  playerPhoto1Url: string;
  playerPhoto2Url: string;
  playerPhoto1X: number;
  playerPhoto1Y: number;
  playerPhoto1Scale: number;
  playerPhoto2X: number;
  playerPhoto2Y: number;
  playerPhoto2Scale: number;
  active: boolean;
  membershipEnd: string;
  sortOrder: number;
};
type Benefit = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  iconName: string;
  featured: boolean;
  ctaText: string;
  ctaUrl: string;
  active: boolean;
  sortOrder: number;
};
type Stats = {
  total: number;
  active: number;
  inactive: number;
  joinClicks: number;
  benefitClicks: number;
};
type ManagementItem = { photoUrl: string; name: string; role: string };
const emptyMember = {
    teamName: "",
    ownerName: "",
    managementName: "",
    whatsapp: "",
    logoUrl: "",
    logoX: 0,
    logoY: 0,
    logoScale: 100,
    instagram: "",
    tiktok: "",
    playerPhoto1Url: "",
    playerPhoto2Url: "",
    playerPhoto1X: 42,
    playerPhoto1Y: 0,
    playerPhoto1Scale: 100,
    playerPhoto2X: 58,
    playerPhoto2Y: 0,
    playerPhoto2Scale: 100,
    active: true,
    sortOrder: 0,
  },
  emptyBenefit = {
    title: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
    iconName: "sparkles",
    featured: false,
    ctaText: "",
    ctaUrl: "",
    active: true,
    sortOrder: 0,
  };
async function imageUpload(file: File, onProgress?: (percent: number) => void) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Ukuran gambar maksimal 10 MB");
  let uploadFile = file;
  try {
    const bitmap = await createImageBitmap(file),
      scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .84));
      if (blob && blob.size < file.size) uploadFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
    }
    bitmap.close();
  } catch {}
  const f = new FormData();
  f.append("poster", uploadFile);
  if (onProgress) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/upload");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
      };
      xhr.onerror = () => reject(new Error("Koneksi upload terputus. Coba lagi."));
      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText) as { url?: string; error?: string };
          if (xhr.status < 200 || xhr.status >= 300 || !result.url) throw new Error(result.error || "Upload gagal.");
          resolve(result.url);
        } catch (error) { reject(error); }
      };
      xhr.send(f);
    });
  }
  const r = await uploadForm("/api/admin/upload", { method: "POST", body: f }),
    x = await r.json();
  if (!r.ok) throw new Error(x.error || "Upload gagal");
  return x.url as string;
}
async function videoUpload(file: File, onProgress: (x: string) => void) {
  if (
    !["video/mp4", "video/webm"].includes(file.type) ||
    file.size > 200 * 1024 * 1024
  )
    throw new Error("Video harus MP4/WebM maksimal 200 MB");
  const size = 1024 * 1024,
    parts = Math.ceil(file.size / size),
    init = await fetch("/api/admin/upload-video?action=init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        parts,
      }),
    }),
    ix = await init.json();
  if (!init.ok) throw new Error(ix.error);
  const uploaded = [];
  for (let i = 0; i < parts; i++) {
    onProgress(`Upload video ${Math.round((i / parts) * 100)}%`);
    const r = await fetch(
        `/api/admin/upload-video?action=chunk&uploadId=${ix.uploadId}&index=${i}`,
        {
          method: "POST",
          body: file.slice(i * size, Math.min(file.size, (i + 1) * size)),
        },
      ),
      x = await r.json();
    if (!r.ok) throw new Error(x.error);
    uploaded.push(x);
  }
  const done = await fetch(
      `/api/admin/upload-video?action=complete&uploadId=${ix.uploadId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: uploaded }),
      },
    ),
    dx = await done.json();
  if (!done.ok) throw new Error(dx.error);
  return dx.url as string;
}
export default function MemberAdmin() {
  const [tab, setTab] = useState<"list" | "add" | "benefit" | "settings" | "management">(
      "list",
    ),
    [members, setMembers] = useState<Member[]>([]),
    [benefits, setBenefits] = useState<Benefit[]>([]),
    [settings, setSettings] = useState<Record<string, string>>({}),
    [stats, setStats] = useState<Stats>({
      total: 0,
      active: 0,
      inactive: 0,
      joinClicks: 0,
      benefitClicks: 0,
    }),
    [member, setMember] = useState(emptyMember),
    [benefit, setBenefit] = useState(emptyBenefit),
    [memberId, setMemberId] = useState<number | null>(null),
    [benefitId, setBenefitId] = useState<number | null>(null),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [statusBusy, setStatusBusy] = useState<number | null>(null),
    [msg, setMsg] = useState(""),
    [playerUpload, setPlayerUpload] = useState<{ target: "player1" | "player2"; text: string } | null>(null),
    [managementFiles, setManagementFiles] = useState<Record<number, File>>({});
  async function load() {
    const [a, b, c] = await Promise.all([
      fetch("/api/admin/members"),
      fetch("/api/admin/member-benefits"),
      fetch("/api/admin/member-settings"),
    ]);
    if (a.ok) setMembers(await a.json());
    if (b.ok) setBenefits(await b.json());
    if (c.ok) {
      const x = await c.json();
      setSettings(x.settings);
      setStats(x.stats);
    }
  }
  async function toggleStatus(team: Member) {
    if (statusBusy !== null) return;
    const next = !team.active;
    const expired = team.membershipEnd && team.membershipEnd < new Date().toISOString().slice(0, 10);
    const explanation = next && expired ? " Masa aktif lama sudah habis; pengaktifan manual akan membuka tampilannya tanpa menambah masa iuran." : "";
    if (!confirm(`${next ? "Aktifkan" : "Nonaktifkan"} ${team.teamName}?${explanation}`)) return;
    setStatusBusy(team.id);
    setMsg("");
    try {
      const response = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: team.id, field: "status", active: next }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengubah status team.");
      setMembers(previous => previous.map(item => item.id === team.id ? { ...item, active: next, membershipEnd: result.manualOverride ? "" : item.membershipEnd } : item));
      await load();
      setMsg(`${team.teamName} berhasil ${next ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Gagal mengubah status team.");
    } finally {
      setStatusBusy(null);
    }
  }
  useEffect(() => {
    void load();
    const openManagement = () => { if (location.hash === "#management") setTab("management"); };
    openManagement();
    window.addEventListener("hashchange", openManagement);
    return () => window.removeEventListener("hashchange", openManagement);
  }, []);
  const filtered = useMemo(
    () =>
      members.filter((x) =>
        x.teamName.toLowerCase().includes(query.toLowerCase()),
      ),
    [members, query],
  );
  async function saveMember(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/admin/members", {
        method: memberId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberId ? { ...member, id: memberId } : member),
      }),
      x = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(x.error);
    setMsg("Data member berhasil disimpan.");
    setMember(emptyMember);
    setMemberId(null);
    setTab("list");
    load();
  }
  async function saveBenefit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/admin/member-benefits", {
        method: benefitId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          benefitId ? { ...benefit, id: benefitId } : benefit,
        ),
      }),
      x = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(x.error);
    setMsg("Benefit berhasil disimpan.");
    setBenefit(emptyBenefit);
    setBenefitId(null);
    load();
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const next: Record<string,string> = {...settings};
      delete next.communityProfileTextJson;
      delete next.memberDuesJson;
      delete next.memberManagementJson;
      const r = await fetch("/api/admin/member-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const result = r.ok ? null : ((await r.json().catch(() => ({}))) as { error?: string });
      if (!r.ok) throw new Error(result?.error || "Gagal menyimpan pengaturan.");
      setMsg("Pengaturan member berhasil disimpan.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Gagal menyimpan pengaturan.");
    } finally { setBusy(false); }
  }
  async function remove(path: string, id: number, label: string) {
    if (!confirm(`Hapus ${label}?`)) return;
    const r = await fetch(`${path}?id=${id}`, { method: "DELETE" });
    if (r.ok) {
      setMsg("Data berhasil dihapus.");
      load();
    }
  }
  async function uploadImage(
    file: File,
    target: "member" | "player1" | "player2" | "benefit" | "banner",
  ) {
    if (busy) return;
    const isPlayer = target === "player1" || target === "player2";
    try {
      setBusy(true);
      setMsg(isPlayer ? "" : "Mengunggah gambar...");
      if (isPlayer) setPlayerUpload({ target, text: `Mengunggah ${file.name}: 0%` });
      const url = await imageUpload(file, isPlayer
        ? (percent) => setPlayerUpload({ target, text: percent >= 99 ? "Memproses upload..." : `Mengunggah ${file.name}: ${percent}%` })
        : undefined);
      if (isPlayer && memberId) {
        setPlayerUpload({ target, text: "Menyimpan foto baru..." });
        const response = await fetch("/api/admin/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: memberId, field: target, url }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Foto belum tersimpan.");
      }
      if (target === "member") setMember((x) => ({ ...x, logoUrl: url }));
      else if (target === "player1")
        setMember((x) => ({ ...x, playerPhoto1Url: url }));
      else if (target === "player2")
        setMember((x) => ({ ...x, playerPhoto2Url: url }));
      else if (target === "benefit")
        setBenefit((x) => ({ ...x, imageUrl: url }));
      else setSettings((x) => ({ ...x, memberBenefitBanner: url }));
      if (isPlayer) setPlayerUpload({ target, text: memberId ? "Foto baru berhasil disimpan." : "Foto siap. Klik SIMPAN MEMBER." });
      else setMsg("Gambar berhasil diunggah. Klik SIMPAN MEMBER untuk menerapkan.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload gagal. Silakan coba kembali.";
      if (isPlayer) setPlayerUpload({ target, text: message });
      else setMsg(message);
    } finally {
      setBusy(false);
    }
  }
  async function uploadVideoFile(file: File, target: "benefit" | "main") {
    try {
      setBusy(true);
      const url = await videoUpload(file, setMsg);
      if (target === "benefit") setBenefit((x) => ({ ...x, videoUrl: url }));
      else setSettings((x) => ({ ...x, memberBenefitVideo: url }));
      setMsg("Video berhasil diunggah.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  }
  function managementItems() {
    let items: ManagementItem[] = [];
    try {
      items = JSON.parse(settings.memberManagementJson || "[]");
    } catch {}
    return items;
  }
  function addManagement() {
    const items = [...managementItems(), {photoUrl:"",name:"",role:""}];
    setSettings(current=>({...current,memberManagementJson:JSON.stringify(items)}));
  }
  async function saveManagement(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const items = managementItems();
      for (const [slot,file] of Object.entries(managementFiles)) {
        items[Number(slot)].photoUrl = await imageUpload(file);
      }
      const memberManagementJson = JSON.stringify(items);
      const response = await fetch("/api/admin/member-settings", {
        method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({memberManagementJson})
      });
      if (!response.ok) throw new Error((await response.json()).error || "Management gagal disimpan.");
      setSettings(current=>({...current,memberManagementJson}));
      setManagementFiles({});
      setMsg("Management berhasil disimpan.");
    } catch(error) {
      setMsg(error instanceof Error ? error.message : "Management gagal disimpan.");
    } finally { setBusy(false); }
  }
  function changeManagement(
    index: number,
    key: keyof ManagementItem,
    value: string,
  ) {
    const items = managementItems();
    items[index] = { ...items[index], [key]: value };
    setSettings((current) => ({
      ...current,
      memberManagementJson: JSON.stringify(items),
    }));
  }
  async function uploadManagement(file: File, index: number) {
    setManagementFiles((current) => ({ ...current, [index]: file }));
    setMsg(`Foto management ${index + 1} siap diunggah. Klik Simpan management.`);
  }
  function field(k: string, label: string, textarea = false) {
    return (
      <label>
        {label}
        {textarea ? (
          <textarea
            value={settings[k] || ""}
            onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
          />
        ) : (
          <input
            value={settings[k] || ""}
            onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
          />
        )}
      </label>
    );
  }
  function playerControls(index: 1 | 2) {
    const x = index === 1 ? member.playerPhoto1X : member.playerPhoto2X,
      y = index === 1 ? member.playerPhoto1Y : member.playerPhoto2Y,
      scale = index === 1 ? member.playerPhoto1Scale : member.playerPhoto2Scale,
      change = (key: "x" | "y" | "scale", value: number) =>
        setMember((current) => ({
          ...current,
          [`playerPhoto${index}${key === "x" ? "X" : key === "y" ? "Y" : "Scale"}`]:
            value,
        }));
    return (
      <div className="player-position-controls">
        <strong>ATUR FOTO PLAYER {index}</strong>
        <label>
          KIRI / KANAN <b>{x}%</b>
          <input
            type="range"
            min="20"
            max="80"
            value={x}
            onChange={(e) => change("x", Number(e.target.value))}
          />
        </label>
        <label>
          ATAS / BAWAH <b>{y}</b>
          <input
            type="range"
            min="-30"
            max="30"
            value={y}
            onChange={(e) => change("y", Number(e.target.value))}
          />
        </label>
        <label>
          UKURAN <b>{scale}%</b>
          <input
            type="range"
            min="60"
            max="150"
            value={scale}
            onChange={(e) => change("scale", Number(e.target.value))}
          />
        </label>
      </div>
    );
  }
  function logoControls() {
    return (
      <div className="player-position-controls logo-position-controls">
        <strong>ATUR LOGO TEAM</strong>
        <label>
          KIRI / KANAN <b>{member.logoX}</b>
          <input
            type="range"
            min="-50"
            max="50"
            value={member.logoX}
            onChange={(e) =>
              setMember((current) => ({
                ...current,
                logoX: Number(e.target.value),
              }))
            }
          />
        </label>
        <label>
          ATAS / BAWAH <b>{member.logoY}</b>
          <input
            type="range"
            min="-50"
            max="50"
            value={member.logoY}
            onChange={(e) =>
              setMember((current) => ({
                ...current,
                logoY: Number(e.target.value),
              }))
            }
          />
        </label>
        <label>
          UKURAN <b>{member.logoScale}%</b>
          <input
            type="range"
            min="50"
            max="160"
            value={member.logoScale}
            onChange={(e) =>
              setMember((current) => ({
                ...current,
                logoScale: Number(e.target.value),
              }))
            }
          />
        </label>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            setMember((current) => ({
              ...current,
              logoX: 0,
              logoY: 0,
              logoScale: 100,
            }))
          }
        >
          RESET POSISI LOGO
        </button>
      </div>
    );
  }
  return (
    <section className="member-manager">
      <nav className="member-admin-tabs">
        <button
          onClick={() => setTab("list")}
          className={tab === "list" ? "active" : ""}
        >
          DAFTAR MEMBER
        </button>
        <button
          onClick={() => {
            setMember(emptyMember);
            setMemberId(null);
            setTab("add");
          }}
          className={tab === "add" ? "active" : ""}
        >
          TAMBAH MEMBER
        </button>
        <button
          onClick={() => setTab("benefit")}
          className={tab === "benefit" ? "active" : ""}
        >
          BENEFIT MEMBER
        </button>
        <button
          onClick={() => setTab("settings")}
          className={tab === "settings" ? "active" : ""}
        >
          PENGATURAN MEMBER
        </button>
        <button onClick={()=>setTab("management")} className={tab==="management"?"active":""}>Management</button>
        <a href="/admin/member-dues">IURAN MEMBER</a>
      </nav>
      <div className="member-stats">
        {[
          ["TOTAL MEMBER", stats.total],
          ["MEMBER AKTIF", stats.active],
          ["MEMBER NONAKTIF", stats.inactive],
          ["KLIK GABUNG", stats.joinClicks],
          ["KLIK BENEFIT", stats.benefitClicks],
        ].map(([a, b]) => (
          <article key={a}>
            <small>{a}</small>
            <b>{Number(b || 0)}</b>
          </article>
        ))}
      </div>
      {msg && <p className="form-message">{msg}</p>}
      {tab === "list" && (
        <section className="member-admin-list">
          <div className="manager-head">
            <h2>DAFTAR MEMBER</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari member..."
            />
          </div>
          {filtered.map((x) => (
            <article key={x.id}>
              {x.logoUrl ? (
                <img src={x.logoUrl} alt={x.teamName} />
              ) : (
                <b className="member-logo-fallback">
                  {x.teamName.slice(0, 3).toUpperCase()}
                </b>
              )}
              <div>
                <small>{x.active ? "AKTIF" : "NONAKTIF"}</small>
                <h3>{x.teamName}</h3>
                <p>
                  Instagram: {x.instagramUsername || "—"} · TikTok:{" "}
                  {x.tiktokUsername || "—"} · Foto player:{" "}
                  {
                    [x.playerPhoto1Url, x.playerPhoto2Url].filter(Boolean)
                      .length
                  }
                  /2
                </p>
              </div>
              <div>
                <button
                  onClick={() => {
                    setMemberId(x.id);
                    setMember({
                      teamName: x.teamName,
                      ownerName: x.ownerName || "",
                      managementName: x.managementName || "",
                      whatsapp: x.whatsapp || "",
                      logoUrl: x.logoUrl,
                      logoX: x.logoX ?? 0,
                      logoY: x.logoY ?? 0,
                      logoScale: x.logoScale ?? 100,
                      instagram: x.instagramUsername,
                      tiktok: x.tiktokUsername,
                      playerPhoto1Url: x.playerPhoto1Url || "",
                      playerPhoto2Url: x.playerPhoto2Url || "",
                      playerPhoto1X: x.playerPhoto1X ?? 42,
                      playerPhoto1Y: x.playerPhoto1Y ?? 0,
                      playerPhoto1Scale: x.playerPhoto1Scale ?? 100,
                      playerPhoto2X: x.playerPhoto2X ?? 58,
                      playerPhoto2Y: x.playerPhoto2Y ?? 0,
                      playerPhoto2Scale: x.playerPhoto2Scale ?? 100,
                      active: x.active,
                      sortOrder: x.sortOrder,
                    });
                    setPlayerUpload(null);
                    setTab("add");
                  }}
                >
                  EDIT
                </button>
                <button type="button" disabled={statusBusy !== null} onClick={() => void toggleStatus(x)}>
                  {statusBusy === x.id ? "MENYIMPAN..." : x.active ? "NONAKTIFKAN" : "AKTIFKAN"}
                </button>
                <button
                  className="danger"
                  onClick={() => remove("/api/admin/members", x.id, x.teamName)}
                >
                  HAPUS
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {tab === "add" && (
        <form className="member-editor" onSubmit={saveMember}>
          <h2>{memberId ? "EDIT MEMBER" : "TAMBAH MEMBER"}</h2>
          <label>
            NAMA TEAM *
            <input
              required
              value={member.teamName}
              onChange={(e) =>
                setMember({ ...member, teamName: e.target.value })
              }
            />
          </label>
          <label>
            LOGO TEAM (OPSIONAL)
            <input
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
              onChange={(e) =>
                e.target.files?.[0] && uploadImage(e.target.files[0], "member")
              }
            />
          </label>
          {member.logoUrl && (
            <div className="logo-adjust-preview">
              <img
                className="admin-media-preview contain"
                src={member.logoUrl}
                alt="Preview logo"
                style={{
                  transform: `translate(${member.logoX}%,${member.logoY}%) scale(${member.logoScale / 100})`,
                }}
              />
            </div>
          )}
          {logoControls()}
          <fieldset className="member-player-editor">
            <legend>FOTO PLAYER — HALAMAN MEMBER &amp; BERANDA</legend>
            <p>
              Foto diunggah sesuai file asli tanpa penghapusan background otomatis.
              Jika ingin background transparan, unggah PNG transparan. Atur posisi
              dan ukuran setiap player di sini. Hasil pengaturan yang disimpan
              otomatis dipakai pada halaman Member dan showcase beranda.
            </p>
            <div>
              <label>
                FOTO PLAYER 1
                <input
                  type="file"
                  disabled={busy}
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    uploadImage(e.target.files[0], "player1")
                  }
                />
                {playerUpload?.target === "player1" && <span className="player-upload-status" role="status" aria-live="polite">{playerUpload.text}</span>}
                {member.playerPhoto1Url && (
                  <>
                    <img
                      className="admin-media-preview contain checkerboard"
                      src={member.playerPhoto1Url}
                      alt="Preview player 1"
                    />
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setMember({ ...member, playerPhoto1Url: "" })
                      }
                    >
                      HAPUS FOTO 1
                    </button>
                  </>
                )}
              </label>
              <label>
                FOTO PLAYER 2
                <input
                  type="file"
                  disabled={busy}
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    uploadImage(e.target.files[0], "player2")
                  }
                />
                {playerUpload?.target === "player2" && <span className="player-upload-status" role="status" aria-live="polite">{playerUpload.text}</span>}
                {member.playerPhoto2Url && (
                  <>
                    <img
                      className="admin-media-preview contain checkerboard"
                      src={member.playerPhoto2Url}
                      alt="Preview player 2"
                    />
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setMember({ ...member, playerPhoto2Url: "" })
                      }
                    >
                      HAPUS FOTO 2
                    </button>
                  </>
                )}
              </label>
            </div>
            <div className="player-controls-grid">
              {playerControls(1)}
              {playerControls(2)}
            </div>
            {(member.playerPhoto1Url || member.playerPhoto2Url) && (
              <div className="member-artwork-preview member-card has-player-photos">
                <div
                  className={`member-player-photos count-${[member.playerPhoto1Url, member.playerPhoto2Url].filter(Boolean).length}`}
                >
                  {member.playerPhoto1Url && (
                    <PlayerPhoto
                      src={member.playerPhoto1Url}
                      alt="Preview Player 1"
                      x={
                        !member.playerPhoto2Url
                          ? 50 + (member.playerPhoto1X - 42)
                          : member.playerPhoto1X
                      }
                      y={member.playerPhoto1Y}
                      scale={member.playerPhoto1Scale}
                    />
                  )}{" "}
                  {member.playerPhoto2Url && (
                    <PlayerPhoto
                      src={member.playerPhoto2Url}
                      alt="Preview Player 2"
                      x={
                        !member.playerPhoto1Url
                          ? 50 + (member.playerPhoto2X - 58)
                          : member.playerPhoto2X
                      }
                      y={member.playerPhoto2Y}
                      scale={member.playerPhoto2Scale}
                      front={Boolean(member.playerPhoto1Url)}
                    />
                  )}
                </div>
                <div className="member-logo">
                  {member.logoUrl && (
                    <img
                      src={member.logoUrl}
                      alt="Preview logo team"
                      style={{
                        transform: `translate(${member.logoX}%,${member.logoY}%) scale(${member.logoScale / 100})`,
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </fieldset>
          <label>
            NOMOR WHATSAPP MEMBER
            <input value={member.whatsapp} onChange={(e) => setMember({ ...member, whatsapp: e.target.value })} placeholder="08xxxxxxxxxx" />
          </label>
          <label>
            NAMA OWNER (OPSIONAL)
            <input value={member.ownerName} onChange={(e) => setMember({ ...member, ownerName: e.target.value })} />
          </label>
          <label>
            NAMA MANAGER (OPSIONAL)
            <input value={member.managementName} onChange={(e) => setMember({ ...member, managementName: e.target.value })} />
          </label>
          <label>
            INSTAGRAM / LINK INSTAGRAM
            <input
              value={member.instagram}
              onChange={(e) =>
                setMember({ ...member, instagram: e.target.value })
              }
              placeholder="@username atau link Instagram"
            />
          </label>
          <label>
            TIKTOK / LINK TIKTOK
            <input
              value={member.tiktok}
              onChange={(e) => setMember({ ...member, tiktok: e.target.value })}
              placeholder="@username atau link TikTok"
            />
          </label>
          <label>
            URUTAN
            <input
              type="number"
              min="0"
              value={member.sortOrder}
              onChange={(e) =>
                setMember({ ...member, sortOrder: Number(e.target.value) })
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={member.active}
              onChange={(e) =>
                setMember({ ...member, active: e.target.checked })
              }
            />{" "}
            AKTIF
          </label>
          <button disabled={busy}>SIMPAN MEMBER</button>
        </form>
      )}
      {tab === "benefit" && (
        <div className="benefit-admin-grid">
          <form className="member-editor" onSubmit={saveBenefit}>
            <h2>{benefitId ? "EDIT BENEFIT" : "TAMBAH BENEFIT"}</h2>
            <label>
              JUDUL *
              <input
                required
                value={benefit.title}
                onChange={(e) =>
                  setBenefit({ ...benefit, title: e.target.value })
                }
              />
            </label>
            <label>
              DESKRIPSI *
              <textarea
                required
                value={benefit.description}
                onChange={(e) =>
                  setBenefit({ ...benefit, description: e.target.value })
                }
              />
            </label>
            <fieldset className="icon-picker">
              <legend>PILIH ICON</legend>
              {benefitIcons.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  className={benefit.iconName === icon ? "active" : ""}
                  onClick={() => setBenefit({ ...benefit, iconName: icon })}
                  title={icon}
                >
                  <BenefitIcon name={icon} />
                  <span>{icon}</span>
                </button>
              ))}
            </fieldset>
            <label>
              GAMBAR PENDUKUNG (OPSIONAL)
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  uploadImage(e.target.files[0], "benefit")
                }
              />
            </label>
            {benefit.imageUrl && (
              <img
                className="admin-media-preview"
                src={benefit.imageUrl}
                alt="Preview benefit"
              />
            )}
            <label>
              VIDEO LINK / YOUTUBE (OPSIONAL)
              <input
                value={benefit.videoUrl}
                onChange={(e) =>
                  setBenefit({ ...benefit, videoUrl: e.target.value })
                }
              />
            </label>
            <label>
              ATAU UPLOAD VIDEO
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  uploadVideoFile(e.target.files[0], "benefit")
                }
              />
            </label>
            {benefit.videoUrl && (
              <video
                className="admin-media-preview"
                src={benefit.videoUrl}
                controls
              />
            )}
            <label>
              TEKS CTA (OPSIONAL)
              <input
                value={benefit.ctaText}
                onChange={(e) =>
                  setBenefit({ ...benefit, ctaText: e.target.value })
                }
              />
            </label>
            <label>
              LINK CTA HTTPS (OPSIONAL)
              <input
                value={benefit.ctaUrl}
                onChange={(e) =>
                  setBenefit({ ...benefit, ctaUrl: e.target.value })
                }
              />
            </label>
            <label>
              URUTAN
              <input
                type="number"
                min="0"
                value={benefit.sortOrder}
                onChange={(e) =>
                  setBenefit({ ...benefit, sortOrder: Number(e.target.value) })
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={benefit.featured}
                onChange={(e) =>
                  setBenefit({ ...benefit, featured: e.target.checked })
                }
              />{" "}
              FEATURED BENEFIT
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={benefit.active}
                onChange={(e) =>
                  setBenefit({ ...benefit, active: e.target.checked })
                }
              />{" "}
              AKTIF
            </label>
            <button disabled={busy}>SIMPAN BENEFIT</button>
          </form>
          <section className="benefit-admin-list">
            {benefits.map((x) => (
              <article key={x.id}>
                <BenefitIcon name={x.iconName} />
                <div>
                  <small>
                    {x.active ? "AKTIF" : "NONAKTIF"} ·{" "}
                    {x.featured ? "FEATURED · " : ""}URUTAN {x.sortOrder}
                  </small>
                  <h3>{x.title}</h3>
                  <p>{x.description}</p>
                </div>
                <button
                  onClick={() => {
                    setBenefitId(x.id);
                    setBenefit(x);
                  }}
                >
                  EDIT
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    remove("/api/admin/member-benefits", x.id, x.title)
                  }
                >
                  HAPUS
                </button>
              </article>
            ))}
          </section>
        </div>
      )}
      {tab === "management" && <form className="member-settings-form" onSubmit={saveManagement}>
        <fieldset disabled={busy || !settings.memberManagementJson} style={{border:0,padding:0,minWidth:0}}>
          <section className="management-admin">
            <header>
              <a href="/management" target="_blank" rel="noreferrer">Lihat halaman publik ↗</a>
              <h3>MANAGEMENT PANBOY COMMUNITY</h3>
              <p>Foto yang kosong tidak akan tampil di website.</p>
            </header>
            <div>
              {managementItems().map((item, index) => (
                <article key={index}>
                  <b>SLOT {index + 1}</b>
                  <label>
                    FOTO
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadManagement(e.target.files[0], index)
                      }
                    />
                  </label>
                  {item.photoUrl && (
                    <>
                      <img
                        src={item.photoUrl}
                        alt={`Preview management ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="danger"
                        onClick={() => changeManagement(index, "photoUrl", "")}
                      >
                        HAPUS FOTO
                      </button>
                    </>
                  )}
                  <label>
                    NAMA
                    <input
                      value={item.name}
                      onChange={(e) =>
                        changeManagement(index, "name", e.target.value)
                      }
                      placeholder="Nama management"
                    />
                  </label>
                  <label>
                    JABATAN
                    <input
                      value={item.role}
                      onChange={(e) =>
                        changeManagement(index, "role", e.target.value)
                      }
                      placeholder="Founder, Admin, Observer..."
                    />
                  </label>
                </article>
              ))}
            </div>
            <button type="button" onClick={addManagement}>+ Tambah pengurus</button>
          </section>
          <button type="submit">Simpan management</button>
        </fieldset>
      </form>}
      {tab === "settings" && (
        <form className="member-settings-form" onSubmit={saveSettings}>
          <h2>PENGATURAN MEMBER</h2>
          <div className="settings-grid">
            <label>
              PEMBAYARAN QRIS PANBOY
              <select value={settings.memberQrisEnabled ?? "true"} onChange={(e) => setSettings({ ...settings, memberQrisEnabled: e.target.value })}>
                <option value="true">AKTIF · PILIHAN UTAMA</option>
                <option value="false">SEMBUNYIKAN</option>
              </select>
            </label>
            <label>
              PEMBAYARAN IPAYMU
              <select value={settings.memberIpaymuEnabled ?? "true"} onChange={(e) => setSettings({ ...settings, memberIpaymuEnabled: e.target.value })}>
                <option value="true">AKTIF · PILIHAN KEDUA</option>
                <option value="false">SEMBUNYIKAN</option>
              </select>
            </label>
            <p>Metode iPaymu hanya muncul bila kunci API Production juga tersedia. Jika keduanya disembunyikan, pembuatan pembayaran baru ditutup.</p>
            {field("memberWhatsapp", "NOMOR WHATSAPP PENDAFTARAN")}
            {field("memberJoinText", "TEKS TOMBOL GABUNG")}
            {field("memberWhatsappMessage", "PESAN WHATSAPP OTOMATIS", true)}
            <label>
              STATUS PENDAFTARAN
              <select
                value={settings.memberRegistrationStatus || "OPEN"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    memberRegistrationStatus: e.target.value,
                  })
                }
              >
                <option>OPEN</option>
                <option>CLOSE</option>
              </select>
            </label>
            <label>
              STATUS BENEFIT
              <select
                value={settings.memberBenefitVisible || "true"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    memberBenefitVisible: e.target.value,
                  })
                }
              >
                <option value="true">TAMPIL</option>
                <option value="false">SEMBUNYIKAN</option>
              </select>
            </label>
            {field("memberBenefitTitle", "JUDUL BENEFIT")}
            {field("memberBenefitSubtitle", "SUBJUDUL BENEFIT")}
            {field("memberBenefitIntro", "DESKRIPSI PEMBUKA", true)}
            <label>
              BANNER BENEFIT
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  uploadImage(e.target.files[0], "banner")
                }
              />
            </label>
            {settings.memberBenefitBanner && (
              <img
                className="admin-media-preview"
                src={settings.memberBenefitBanner}
                alt="Banner benefit"
              />
            )}
            <label>
              VIDEO UTAMA (LINK)
              <input
                value={settings.memberBenefitVideo || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    memberBenefitVideo: e.target.value,
                  })
                }
              />
            </label>
            <label>
              ATAU UPLOAD VIDEO
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  uploadVideoFile(e.target.files[0], "main")
                }
              />
            </label>
            <label>
              CARA BERGABUNG
              <select
                value={settings.memberHowToVisible || "true"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    memberHowToVisible: e.target.value,
                  })
                }
              >
                <option value="true">TAMPIL</option>
                <option value="false">SEMBUNYIKAN</option>
              </select>
            </label>
            {field("memberHowToTitle", "JUDUL CARA BERGABUNG")}
            {field(
              "memberHowToSteps",
              "LANGKAH (SATU BARIS SATU LANGKAH)",
              true,
            )}
          </div>

          <button disabled={busy}>SIMPAN PENGATURAN</button>
        </form>
      )}
    </section>
  );
}
