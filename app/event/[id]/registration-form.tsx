"use client";
import { uploadForm } from "../../../lib/upload-form";
import { ChangeEvent, FormEvent, useState } from "react";

type Player = { pubgId: string; nickname: string; fullName: string; phone: string };
const blank = (): Player => ({ pubgId: "", nickname: "", fullName: "", phone: "" });

export default function RegistrationForm({ eventId, eventTitle, whatsapp, allowForm, allowWhatsapp, allowLogoUpload }: { eventId: number; eventTitle: string; whatsapp: string; allowForm:boolean; allowWhatsapp:boolean; allowLogoUpload:boolean }) {
  const [players, setPlayers] = useState<Player[]>([blank(), blank(), blank(), blank()]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{code:string;paymentStatus:string;amount?:number;payment?:{token:string;redirectUrl:string;clientKey:string;snapUrl:string}|null}|null>(null);
  const [mode, setMode] = useState<"form"|"whatsapp">(allowForm?"form":"whatsapp");
  const [logoMode, setLogoMode] = useState<"upload"|"link">(allowLogoUpload?"upload":"link");
  const [teamLogo, setTeamLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  function update(index: number, field: keyof Player, value: string) { setPlayers((list) => list.map((p, i) => i === index ? { ...p, [field]: value } : p)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Menyimpan pendaftaran...");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, teamName: data.teamName, captainName: data.captainName, whatsapp: data.whatsapp, teamLogo, players }) });
    const output = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(output.error || "Pendaftaran gagal.");
    setResult(output); setMessage("");
  }
  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage("Mengunggah gambar...");
    try{
      const data = new FormData(); data.append("logo", file);
      const response = await uploadForm("/api/uploads/team-logo", { method: "POST", body: data });
      const output = await response.json();
      if (!response.ok) return setMessage(output.error || "Upload gagal. Anda tetap dapat mendaftar tanpa logo.");
      setTeamLogo(output.url); setMessage("Gambar berhasil diunggah dan siap digunakan.");
    }catch{setMessage("Koneksi upload terputus. Coba lagi atau lanjutkan tanpa logo.")}
    finally{setUploading(false);event.target.value=""}
  }
  const directText = `Halo Admin, saya ingin mendaftarkan team untuk event ${eventTitle}.\n\nNama Team:\nNama Kapten:\nWhatsApp:\nID PUBG + Nickname Player (4–6 player):\n1.\n2.\n3.\n4.`;
  if (result) {
    const completed = result;
    const text = `Halo Admin, tim saya sudah mendaftar event ${eventTitle}. Kode pendaftaran: ${completed.code}`;
    async function pay() {
      if (!completed.payment) return;
      const payment = completed.payment;
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${payment.snapUrl}"]`);
      const script = existing ?? document.createElement("script");
      if (!existing) { script.src = payment.snapUrl; script.dataset.clientKey = payment.clientKey; document.body.appendChild(script); }
      if (!existing) await new Promise<void>((resolve,reject)=>{script.onload=()=>resolve();script.onerror=()=>reject(new Error("Snap gagal dimuat"))});
      const snap = (window as unknown as {snap?:{pay:(token:string,options:Record<string,()=>void>)=>void}}).snap;
      if (!snap) return window.location.assign(payment.redirectUrl);
      snap.pay(payment.token,{onSuccess:()=>window.location.assign(`/cek-pendaftaran?code=${encodeURIComponent(completed.code)}`),onPending:()=>window.location.assign(`/cek-pendaftaran?code=${encodeURIComponent(completed.code)}`),onError:()=>setMessage("Pembayaran gagal. Silakan coba kembali.")});
    }
    return <div className="registration-success"><span>✓</span><h2>PENDAFTARAN TERSIMPAN</h2><p>Simpan kode ini untuk mengecek status pendaftaran.</p><strong>{completed.code}</strong><p>{completed.paymentStatus === "paid" ? "Pendaftaran gratis telah dikonfirmasi." : completed.payment ? `Lanjutkan pembayaran Rp${Number(completed.amount||0).toLocaleString("id-ID")} melalui Midtrans.` : "Status pembayaran masih menunggu verifikasi admin."}</p><div className="registration-actions">{completed.payment&&<button type="button" className="button gold" onClick={pay}>BAYAR SEKARANG →</button>}<a className={completed.payment?"button outline":"button gold"} href={`/cek-pendaftaran?code=${encodeURIComponent(completed.code)}`}>CEK PENDAFTARAN</a><a className="button outline" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`}>KIRIM KE ADMIN</a></div>{message&&<p className="form-message">{message}</p>}</div>;
  }
  return <div className="registration-flow">
    {allowForm&&allowWhatsapp&&<div className="registration-choice"><button type="button" className={mode==="form"?"active":""} onClick={()=>setMode("form")}><b>01</b><span><strong>ISI DATA DI WEBSITE</strong><small>Data team dan roster tersimpan serta bisa dicek kembali.</small></span></button><button type="button" className={mode==="whatsapp"?"active":""} onClick={()=>setMode("whatsapp")}><b>02</b><span><strong>LANGSUNG KE WHATSAPP</strong><small>Daftar cepat langsung melalui chat admin event.</small></span></button></div>}
    {mode === "whatsapp" ? <div className="direct-whatsapp"><span>WA</span><h2>DAFTAR LANGSUNG KE ADMIN</h2><p>Template data team sudah disiapkan. Lengkapi datanya di WhatsApp lalu kirim ke admin event.</p><a className="button gold" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(directText)}`}>BUKA WHATSAPP →</a>{allowForm&&<button type="button" onClick={()=>setMode("form")}>Atau isi formulir lengkap di website</button>}</div> : <form className="registration-form" onSubmit={submit}>
    <div className="form-grid"><label>NAMA TEAM<input name="teamName" required maxLength={80}/></label><label>NAMA KAPTEN<input name="captainName" required maxLength={80}/></label><label>WHATSAPP KAPTEN<input name="whatsapp" required inputMode="tel" placeholder="08xxxxxxxxxx"/></label><div className="logo-field"><span>LOGO TEAM <small>(opsional · boleh dilewati)</small></span>{allowLogoUpload&&<div className="logo-mode"><button type="button" className={logoMode==="upload"?"active":""} onClick={()=>setLogoMode("upload")}>UPLOAD</button><button type="button" className={logoMode==="link"?"active":""} onClick={()=>setLogoMode("link")}>PAKAI LINK</button></div>}{logoMode==="upload"&&allowLogoUpload?<label className="logo-upload">{teamLogo?<img src={teamLogo} alt="Preview logo team"/>:<b>＋</b>}<span>{uploading?"MENGUNGGAH...":teamLogo?"GANTI LOGO":"PILIH FILE GAMBAR"}</span><input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp" onChange={uploadLogo} disabled={uploading}/></label>:<input type="url" value={teamLogo} onChange={e=>setTeamLogo(e.target.value)} placeholder="Link gambar (opsional)"/>}</div></div>
    <div className="roster-heading"><div><small>LOCK ROSTER</small><h2>DATA 4–6 PLAYER</h2></div><button type="button" disabled={players.length >= 6} onClick={() => setPlayers((p) => [...p, blank()])}>+ PLAYER</button></div>
    <div className="roster-list">{players.map((player, index) => <div className="roster-row" key={index}><b>{String(index + 1).padStart(2,"0")}</b><label>ID PUBG<input required inputMode="numeric" value={player.pubgId} onChange={(e) => update(index,"pubgId",e.target.value)}/></label><label>NICKNAME<input required value={player.nickname} onChange={(e) => update(index,"nickname",e.target.value)}/></label><label>NAMA ASLI <small>(opsional)</small><input value={player.fullName} onChange={(e) => update(index,"fullName",e.target.value)}/></label><label>NO. HP <small>(opsional)</small><input inputMode="tel" value={player.phone} onChange={(e) => update(index,"phone",e.target.value)}/></label>{players.length > 4 && <button type="button" aria-label={`Hapus player ${index+1}`} onClick={() => setPlayers((p) => p.filter((_,i) => i !== index))}>×</button>}</div>)}</div>
    {message && <p className="form-message">{message}</p>}<button className="button gold submit-registration" disabled={busy||uploading}>{busy ? "MENYIMPAN..." : "DAFTARKAN TEAM →"}</button><p className="form-note">Pastikan ID PUBG dan nickname benar. Roster disimpan sebagai snapshot event dan perubahan berikutnya tidak mengubah data pendaftaran ini.</p>
  </form>}
  </div>;
}
