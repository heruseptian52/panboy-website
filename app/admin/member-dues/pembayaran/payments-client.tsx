"use client";
import { useEffect, useRef, useState } from "react";
function csv(rows: any[], label: string) {
  const h = [
    "No",
    "Invoice",
    "Nama Team",
    "Metode",
    "Paket",
    "Nominal",
    "Status",
    "Mulai",
    "Berakhir",
  ];
  const v = rows.map((r, i) => [
    i + 1,
    r.invoice,
    r.team_name,
    r.payment_method || "QRIS",
    r.months,
    r.amount,
    r.status,
    r.membership_start || "",
    r.membership_end || "",
  ]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(
      [
        "\ufeff" +
          [h, ...v]
            .map((x) =>
              x
                .map((y) => `"${String(y ?? "").replaceAll('"', '""')}"`)
                .join(","),
            )
            .join("\n"),
      ],
      { type: "text/csv" },
    ),
  );
  a.download = `pembayaran-${label}.csv`;
  a.click();
}
export default function PaymentsClient({
  initial,
  members = [],
  isOwner = false,
}: {
  initial: any[];
  members?: any[];
  isOwner?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10),
    expired = members
      .filter((m) => m.membershipEnd && m.membershipEnd < today)
      .map((m) => ({
        invoice: `MEMBER-${m.id}`,
        team_name: m.teamName,
        buyer_name: "-",
        whatsapp: "-",
        months: "-",
        amount: 0,
        status: "LUNAS",
        membership_start: m.membershipStart,
        membership_end: m.membershipEnd,
        payment_method: "-",
        proof_url: "",
        expiredMember: true,
      }));
  const [rows, setRows] = useState([...initial, ...expired]),
    [filter, setFilter] = useState("SEMUA"),
    [msg, setMsg] = useState(""),
    [showRejected, setShowRejected] = useState(false),
    [busyInvoice, setBusyInvoice] = useState(""),
    [visibleLimit, setVisibleLimit] = useState(25),
    [editing, setEditing] = useState<any | null>(null),
    [editTier, setEditTier] = useState("C"),
    [editMonths, setEditMonths] = useState(1);
  const inFlight = useRef(new Set<string>());
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const logoFor = (team: string) => members.find((m) => m.teamName === team)?.logoUrl || "";
  async function refreshRows() {
    try {
      const response = await fetch("/api/admin/member-payments", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return false;
      const data = await response.json();
      setRows([...(data.rows || []), ...expired]);
      return true;
    } catch {
      return false;
    }
  }
  useEffect(() => {
    let hiddenAt = 0;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 30000) void refreshRows();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, []);
  async function act(invoice: string, action: string) {
    if (inFlight.current.has(invoice)) return;
    if (
      !confirm(
        action === "verify"
          ? "Pembayaran sudah masuk ke DANA Bisnis?"
          : "Tolak pembayaran ini?",
      )
    )
      return;
    inFlight.current.add(invoice);
    setBusyInvoice(invoice);
    setMsg(action === "verify" ? "Memproses pembayaran..." : "Memproses penolakan...");
    try {
      const r = await fetch("/api/admin/member-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice, action }),
        signal: AbortSignal.timeout(20000),
      });
      const x = await r.json();
      if (!r.ok) {
        setMsg(x.error || "Gagal memproses.");
        await refreshRows();
        return;
      }
      setRows((v) =>
        v.map((row) =>
          row.invoice === invoice
            ? {
                ...row,
                status: action === "verify" ? "LUNAS" : "REJECTED",
                membership_start: x.start || row.membership_start,
                membership_end: x.end || row.membership_end,
              }
            : row,
        ),
      );
      setMsg("Perubahan berhasil disimpan.");
      await refreshRows();
      window.dispatchEvent(new Event("panboy-admin-alerts-refresh"));
    } catch {
      setMsg("Koneksi terputus. Status terbaru akan dimuat ulang.");
      await refreshRows();
    } finally {
      inFlight.current.delete(invoice);
      setBusyInvoice("");
    }
  }
  function openCorrection(row: any) {
    setEditing(row);
    setEditTier(row.tier === "S" ? "S" : "C");
    setEditMonths(Number(row.months) || 1);
    setMsg("");
  }
  async function correction(action: "correct" | "cancel") {
    if (!editing || !isOwner || inFlight.current.has(editing.invoice)) return;
    const invoice = editing.invoice;
    const question = action === "cancel"
      ? `Batalkan iuran ${editing.team_name} (${invoice})? Masa aktif akan berkurang.`
      : `Koreksi iuran ${editing.team_name} menjadi Tier ${editTier}, ${editMonths} bulan? Masa aktif akan disesuaikan.`;
    if (!confirm(question)) return;
    inFlight.current.add(invoice); setBusyInvoice(invoice); setMsg("Memproses koreksi...");
    try {
      const response = await fetch("/api/admin/member-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice, action, tier: editTier, months: editMonths }), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Koreksi gagal.");
      setEditing(null); setMsg("Iuran dan masa aktif berhasil diperbarui.");
      await refreshRows();
    } catch (error) { setMsg(error instanceof Error ? error.message : "Koreksi gagal. Periksa kembali status pembayaran."); await refreshRows(); }
    finally { inFlight.current.delete(invoice); setBusyInvoice(""); }
  }
  const visible = rows.filter((r) => {
    if (!showRejected && ["REJECTED", "CANCELLED"].includes(r.status)) return false;
    if (filter === "SEMUA") return true;
    if (filter === "MENUNGGU VERIFIKASI") return !["LUNAS", "REJECTED", "CANCELLED"].includes(r.status);
    if (filter === "AKTIF") return r.status === "LUNAS" && r.membership_end >= today;
    if (filter === "NONAKTIF") return Boolean(r.membership_end && r.membership_end < today);
    return filter === "AKAN BERAKHIR" && r.status === "LUNAS" && r.membership_end >= today && r.membership_end <= soon;
  });
  return (
    <section className="dues-admin">
      <h1>PEMBAYARAN MEMBER</h1>
      <p>Pantau pembayaran QRIS manual dan iPaymu otomatis dalam satu halaman.</p>
      <div className="payment-summary">
        <article><small>MENUNGGU</small><b>{rows.filter(r => !["LUNAS", "REJECTED", "CANCELLED"].includes(r.status)).length}</b></article>
        <article><small>AKTIF</small><b>{rows.filter(r => r.status === "LUNAS" && r.membership_end >= today).length}</b></article>
        <article><small>AKAN BERAKHIR</small><b>{rows.filter(r => r.status === "LUNAS" && r.membership_end >= today && r.membership_end <= soon).length}</b></article>
        <article><small>NONAKTIF</small><b>{expired.length}</b></article>
      </div>
      <div className="member-admin-tabs">
        {[
          "SEMUA",
          "MENUNGGU VERIFIKASI",
          "AKTIF",
          "AKAN BERAKHIR",
          "NONAKTIF",
        ].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="payment-export-bar">
        <b>DOWNLOAD DATA</b>
        <button onClick={() => setShowRejected(!showRejected)}>{showRejected ? "SEMBUNYIKAN DITOLAK / DIBATALKAN" : "TAMPILKAN DITOLAK / DIBATALKAN"}</button>
        <button onClick={() => csv(visible, filter.toLowerCase())}>
          DOWNLOAD {filter}
        </button>
        <button onClick={() => csv(rows, "semua-data")}>
          DOWNLOAD SEMUA DATA
        </button>
      </div>
      {msg && <p className="form-message">{msg}</p>}
      <div className="dues-table payment-table">
        <div className="dues-head">
          <b>TEAM</b>
          <b>PAKET</b>
          <b>METODE</b>
          <b>NOMINAL</b>
          <b>WAKTU REQUEST</b>
          <b>STATUS / MEMBERSHIP</b>
          <b>AKSI</b>
        </div>
        {visible.slice(0,visibleLimit).map((row) => (
          <div className="dues-row" key={row.invoice}>
            <div className="payment-team"><span className="payment-team-logo">{logoFor(row.team_name) ? <img src={logoFor(row.team_name)} alt={`Logo ${row.team_name}`} /> : row.team_name.slice(0,2)}</span><span>{row.team_name}</span></div>
            <span>TIER {row.tier || "C"} · {row.months} bulan</span>
            <span className={`payment-method ${String(row.payment_method || "QRIS").toLowerCase()}`}>{row.payment_method || "QRIS"}</span>
            <span>Rp{Number(row.amount).toLocaleString("id-ID")}</span>
            <span className="payment-request-time">{row.created_at ? new Date(row.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}</span>
            <span className={`payment-status ${row.expiredMember ? "nonaktif" : String(row.status).toLowerCase()}`}>
              {row.expiredMember
                ? "NONAKTIF"
                : row.status === "WAITING_PAYMENT"
                  ? "MENUNGGU PEMBAYARAN"
                  : row.status === "WAITING_VERIFICATION"
                    ? "MENUNGGU VERIFIKASI"
                    : row.status === "WAITING_IPAYMU"
                      ? "MENUNGGU IPAYMU"
                    : row.status}
              <small>
                {" "}
                · {row.membership_start} s/d {row.membership_end}
              </small>
            </span>
            <div className="payment-actions">
              {row.proof_url && (
                <a className="proof-link" href={row.proof_url} target="_blank">
                  LIHAT BUKTI
                </a>
              )}
              {!row.expiredMember &&
                row.status !== "LUNAS" &&
                row.status !== "REJECTED" &&
                row.status !== "CANCELLED" &&
                String(row.payment_method || "QRIS").toUpperCase() !== "IPAYMU" && (
                  <>
                    <button disabled={busyInvoice === row.invoice} onClick={() => act(row.invoice, "verify")}>
                      {busyInvoice === row.invoice ? "MEMPROSES..." : "SUDAH BAYAR / SETUJUI"}
                    </button>
                    <button disabled={busyInvoice === row.invoice} onClick={() => act(row.invoice, "reject")}>
                      TOLAK
                    </button>
                  </>
                )}
              {!row.expiredMember && row.status === "WAITING_IPAYMU" && <small>OTOMATIS VIA CALLBACK IPAYMU</small>}
              {isOwner && !row.expiredMember && row.status === "LUNAS" && String(row.payment_method || "QRIS").toUpperCase() === "QRIS" && <button type="button" onClick={() => openCorrection(row)}>EDIT / BATALKAN IURAN</button>}
            </div>
          </div>
        ))}
        {visible.length>visibleLimit&&<button className="payment-load-more" type="button" onClick={()=>setVisibleLimit(x=>x+25)}>TAMPILKAN 25 DATA LAGI</button>}
      </div>
      {editing && <div className="payment-edit-overlay" onClick={() => setEditing(null)}><section className="payment-edit-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Koreksi pembayaran member"><button className="payment-edit-close" type="button" onClick={() => setEditing(null)}>×</button><h2>Koreksi Iuran</h2><p><b>{editing.team_name}</b> · {editing.invoice}</p><p>Transaksi QRIS manual. Nominal dan masa aktif dihitung dari tier dan jumlah bulan.</p><div className="payment-edit-fields"><label>TIER<select value={editTier} onChange={e => setEditTier(e.target.value)}><option value="C">TIER C</option><option value="S">TIER S</option></select></label><label>MASA AKTIF<select value={editMonths} onChange={e => setEditMonths(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12,36,120].map(n => <option value={n} key={n}>{n} BULAN</option>)}</select></label></div><p>Nominal baru: <strong>Rp{(editMonths * (editTier === "S" ? 100000 : 10000)).toLocaleString("id-ID")}</strong></p><div className="payment-edit-actions"><button type="button" onClick={() => correction("correct")} disabled={!!busyInvoice}>SIMPAN KOREKSI</button><button type="button" className="cancel" onClick={() => correction("cancel")} disabled={!!busyInvoice}>BATALKAN IURAN</button></div></section></div>}
    </section>
  );
}
