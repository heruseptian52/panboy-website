"use client";
import { useEffect, useMemo, useState } from "react";
type Row = { path?: string; label?: string; device?: string; day?: string; count: number };
type Data = { summary: { views?: number; visitors?: number; clicks?: number }; total: { views?: number; visitors?: number }; pages: Row[]; clicks: Row[]; devices: Row[]; daily: Row[]; range: { from: string; to: string } };
const date = (d: Date) => d.toISOString().slice(0, 10);
export default function AnalyticsAdmin() {
  const today = date(new Date()), initial = new Date(); initial.setDate(initial.getDate() - 6);
  const [from, setFrom] = useState(date(initial)), [to, setTo] = useState(today), [data, setData] = useState<Data | null>(null), [loading, setLoading] = useState(false);
  async function load(start = from, finish = to) { setLoading(true); const r = await fetch(`/api/analytics?from=${start}&to=${finish}`); const x = await r.json(); if (r.ok) setData(x); setLoading(false); }
  useEffect(() => { void load(); }, []);
  function preset(days: number) { const d = new Date(); d.setDate(d.getDate() - days + 1); const start = date(d); setFrom(start); setTo(today); void load(start, today); }
  const max = useMemo(() => Math.max(1, ...(data?.daily || []).map(x => Number(x.count))), [data]);
  if (!data) return <div className="analytics-loading">Memuat analitik...</div>;
  const s = data.summary;
  return <div className="analytics-page">
    <div className="analytics-title"><p>KHUSUS ADMIN UTAMA</p><h1>ANALITIK WEBSITE</h1><span>Pilih tanggal untuk melihat kunjungan pada periode tertentu.</span></div>
    <section className="analytics-filter"><div><label>DARI TANGGAL<input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label><label>SAMPAI TANGGAL<input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} /></label><button onClick={() => void load()} disabled={loading}>{loading ? "MEMUAT..." : "TAMPILKAN"}</button></div><nav><button onClick={() => preset(7)}>7 HARI</button><button onClick={() => preset(30)}>30 HARI</button><button onClick={() => { const start = today.slice(0, 8) + "01"; setFrom(start); setTo(today); void load(start, today); }}>BULAN INI</button></nav></section>
    <p className="analytics-range">PERIODE: <b>{new Date(`${data.range.from}T12:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</b> — <b>{new Date(`${data.range.to}T12:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</b></p>
    <div className="analytics-cards"><article><small>KUNJUNGAN PERIODE</small><b>{Number(s.views || 0).toLocaleString("id-ID")}</b></article><article><small>PENGUNJUNG UNIK PERIODE</small><b>{Number(s.visitors || 0).toLocaleString("id-ID")}</b></article><article><small>KLIK PERIODE</small><b>{Number(s.clicks || 0).toLocaleString("id-ID")}</b></article><article><small>TOTAL KUNJUNGAN</small><b>{Number(data.total.views || 0).toLocaleString("id-ID")}</b></article><article><small>TOTAL PENGUNJUNG UNIK</small><b>{Number(data.total.visitors || 0).toLocaleString("id-ID")}</b></article></div>
    <section className="analytics-panel"><div className="panel-head"><div><small>TREN KUNJUNGAN</small><h2>BERDASARKAN TANGGAL</h2></div></div><div className="daily-bars">{data.daily.length ? data.daily.map(x => <div key={x.day}><b>{x.count}</b><i style={{ height: `${Math.max(8, Number(x.count) / max * 100)}%` }} /><span>{new Date(`${x.day}T12:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span></div>) : <p>Belum ada data pada periode ini.</p>}</div></section>
    <div className="analytics-grid"><section className="analytics-panel"><div className="panel-head"><div><small>HALAMAN POPULER</small><h2>PALING SERING DIBUKA</h2></div></div><div className="rank-list">{data.pages.map((x, i) => <p key={x.path}><b>{i + 1}</b><span>{x.path}</span><strong>{x.count}</strong></p>)}</div></section><section className="analytics-panel"><div className="panel-head"><div><small>AKSI PENGUNJUNG</small><h2>TOMBOL PALING SERING DIKLIK</h2></div></div><div className="rank-list">{data.clicks.map((x, i) => <p key={`${x.label}-${i}`}><b>{i + 1}</b><span>{x.label}</span><strong>{x.count}</strong></p>)}</div></section></div>
    <section className="analytics-panel device-panel"><div><small>PERANGKAT</small><h2>HP VS KOMPUTER</h2></div><div>{data.devices.map(x => <p key={x.device}><span>{x.device === "mobile" ? "HP" : "KOMPUTER"}</span><b>{x.count}</b></p>)}</div></section>
  </div>;
}
