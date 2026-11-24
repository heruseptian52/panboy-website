"use client";

import { useState } from "react";

export default function RegistrationActions({ id, whatsapp, managementName, teamName, status, hidden }: { id: number; whatsapp: string; managementName: string; teamName: string; status: string; hidden: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function review(action: "approve" | "reject") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/member-registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Proses gagal.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proses gagal.");
      setBusy(false);
    }
  }

  async function toggleHidden() {
    setBusy(true);
    const response = await fetch("/api/admin/member-registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: hidden ? "show" : "hide" }) });
    if (response.ok) window.location.reload();
    else setBusy(false);
  }

  return <div>
    {status !== "APPROVED" && <button disabled={busy} onClick={() => review("approve")}>{busy ? "MEMPROSES..." : status === "REJECTED" ? "UBAH JADI DITERIMA" : "TERIMA & MASUKKAN KE MEMBER"}</button>}
    {status !== "REJECTED" && <button disabled={busy} className="danger" onClick={() => review("reject")}>{status === "APPROVED" ? "BATALKAN & TOLAK" : "TOLAK"}</button>}
    {status !== "PENDING" && <button disabled={busy} onClick={toggleHidden}>{hidden ? "TAMPILKAN LAGI" : "SEMBUNYIKAN"}</button>}
    <a className="button gold" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Halo${managementName ? ` ${managementName}` : ""}, kami dari Panboy Community ingin mengonfirmasi pendaftaran ${teamName}.`)}`}>WHATSAPP</a>
    {message && <p className="form-message">{message}</p>}
  </div>;
}
