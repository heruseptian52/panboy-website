"use client";
import { useEffect, useState } from "react";

const key = "panboy-member-payment-invoices";
export function rememberPayment(invoice: string) {
  try {
    const previous = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify([invoice, ...previous.filter(x => x !== invoice)].slice(0, 30)));
  } catch { /* Private browsing may disable storage. */ }
}
type Payment = { invoice: string; teamName: string; months: number; amount: number; status: string; createdAt: string; membershipEnd: string };
export default function PaymentHistory() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [lookup, setLookup] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    let invoices: string[] = [];
    try { invoices = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
    void Promise.all(invoices.slice(0, 30).map(async invoice => {
      try { const r = await fetch(`/api/member-payments?invoice=${encodeURIComponent(invoice)}`, { cache: "no-store" }); return r.ok ? await r.json() as Payment : null; } catch { return null; }
    })).then(items => { if (active) setRows(items.filter((item): item is Payment => !!item)); });
    return () => { active = false; };
  }, []);
  async function find(e: React.FormEvent) {
    e.preventDefault();
    const invoice = lookup.trim();
    if (!invoice) return;
    try {
      const r = await fetch(`/api/member-payments?invoice=${encodeURIComponent(invoice)}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Nomor invoice tidak ditemukan.");
      const item = await r.json() as Payment;
      rememberPayment(invoice);
      setRows(current => [item, ...current.filter(x => x.invoice !== invoice)]);
      setMessage(""); setLookup("");
    } catch { setMessage("Nomor invoice tidak ditemukan. Periksa lagi nomor yang Anda terima."); }
  }
  return <section className="member-payment-history"><h2>Riwayat Iuran Saya</h2><p>Riwayat di perangkat ini. Masukkan nomor invoice untuk melihat pembayaran dari perangkat lain.</p><form onSubmit={find}><input value={lookup} onChange={e => setLookup(e.target.value)} placeholder="Nomor invoice" aria-label="Nomor invoice" /><button>CARI</button></form>{message && <p role="alert">{message}</p>}<div>{rows.map(row => <article key={row.invoice}><div><b>{row.teamName}</b><small>{row.invoice} · {new Date(row.createdAt).toLocaleDateString("id-ID")}</small></div><div><b>Rp{Number(row.amount).toLocaleString("id-ID")}</b><small>{row.months} bulan · {row.status === "LUNAS" ? `Lunas, aktif sampai ${row.membershipEnd || "-"}` : row.status === "REJECTED" ? "Ditolak" : row.status === "CANCELLED" ? "Dibatalkan admin" : "Menunggu konfirmasi"}</small></div></article>)}</div>{!rows.length && <p>Belum ada riwayat pembayaran di perangkat ini.</p>}</section>;
}
