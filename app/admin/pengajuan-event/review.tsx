"use client";
import { useEffect, useState } from "react";
import type { EventSubmission } from "../../../lib/event-submissions";

export default function EventSubmissionReview() {
  const [items, setItems] = useState<EventSubmission[]>([]), [busy, setBusy] = useState(0), [message, setMessage] = useState("");
  async function load() {
    try { const response = await fetch("/api/admin/event-submissions", { cache: "no-store" }), result = await response.json(); if (!response.ok) throw new Error(result.error || "Data gagal dimuat."); setItems(result.submissions); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Data gagal dimuat."); }
  }
  useEffect(() => { void load(); }, []);
  async function review(item: EventSubmission, action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") { reason = prompt(`Alasan menolak ${item.title}:`)?.trim() || ""; if (!reason) return; }
    else if (!confirm(`Terbitkan ${item.title} dari ${item.organizer} di website? Periksa poster, tanggal, dan kontak terlebih dahulu.`)) return;
    setBusy(item.id); setMessage("");
    try {
      const response = await fetch("/api/admin/event-submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, action, reason }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal memproses pengajuan.");
      setMessage(action === "approve" ? "Event telah diterbitkan." : "Pengajuan ditolak."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal memproses pengajuan."); }
    finally { setBusy(0); }
  }
  return <section className="submission-admin"><div className="submission-admin-heading"><div><small>VERIFIKASI ADMIN</small><h1>Pengajuan event</h1><p>Periksa informasi dan poster sebelum event muncul di halaman utama.</p></div><a href="/admin">← KEMBALI KE EVENT</a></div>{message && <p className="submission-message" role="status">{message}</p>}
    <div className="submission-admin-list">{items.map(item => <article key={item.id} className="submission-admin-card"><img src={item.imageUrl} alt={`Poster ${item.title}`}/><div><small>{item.status === "PENDING" ? "MENUNGGU PERSETUJUAN" : item.status === "APPROVED" ? "DISETUJUI" : "DITOLAK"} · {new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })}</small><h2>{item.title}</h2><p><b>Penyelenggara:</b> {item.organizer} · <b>WhatsApp:</b> {item.whatsapp}</p><p><b>Tanggal:</b> {item.startDate} – {item.endDate} · <b>Mode:</b> {item.eventMode}</p><p><b>Prizepool:</b> {item.prizepool || "Belum ditentukan"} · <b>Biaya:</b> {item.registrationFee || "Belum ditentukan"}</p>{item.eventMode === "Offline" && <p><b>Lokasi:</b> {item.address}, {item.city}, {item.province}</p>}{item.notes && <p><b>Catatan pengaju:</b> {item.notes}</p>}{item.rejectionReason && <p><b>Alasan penolakan:</b> {item.rejectionReason}</p>}{item.status === "PENDING" && <div className="submission-admin-actions"><button type="button" disabled={!!busy} onClick={() => review(item, "approve")}>SETUJUI & TERBITKAN</button><button type="button" disabled={!!busy} onClick={() => review(item, "reject")}>TOLAK</button></div>}{item.eventId > 0 && <a href={`/event/${item.eventId}`} target="_blank" rel="noreferrer">LIHAT EVENT ↗</a>}</div></article>)}{!items.length && <p>Belum ada pengajuan event.</p>}</div></section>;
}
