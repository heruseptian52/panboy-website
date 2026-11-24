"use client";
import { uploadForm } from "../../../lib/upload-form";
import { useState } from "react";
import PaymentHistory, { rememberPayment } from "./payment-history";
type M = { id: number; teamName: string; logoUrl: string };
const packages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 36, 120];
const price = (n: number, tier: string) => n * (tier === "S" ? 100000 : 10000);
export default function MemberPayment({
  members,
  qrisUrl,
  qrisEnabled,
  ipaymuEnabled,
}: {
  members: M[];
  qrisUrl: string;
  qrisEnabled: boolean;
  ipaymuEnabled: boolean;
}) {
  const [team, setTeam] = useState(0),
    [tier, setTier] = useState(""),
    [months, setMonths] = useState(0),
    [method, setMethod] = useState<"qris" | "ipaymu">(qrisEnabled ? "qris" : "ipaymu"),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [invoice, setInvoice] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !tier || !months || (method === "qris" ? !qrisEnabled : !ipaymuEnabled)) return setMsg("Pilih team, tier, paket, dan metode pembayaran yang tersedia.");
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(method === "ipaymu" ? "/api/payments/member" : "/api/member-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          memberId: team,
          tier,
          months,
          paymentMethod: method,
        }),
      });
      const x = await r.json();
      if (!r.ok) throw new Error(x.error || "Gagal membuat pembayaran");
      if (x.invoice) rememberPayment(String(x.invoice));
      if (method === "ipaymu" && x.payment?.redirectUrl) {
        window.location.href = x.payment.redirectUrl;
        return;
      }
      if (method === "ipaymu") throw new Error("iPaymu belum mengirim halaman pembayaran. Silakan coba lagi.");
      setInvoice(x.invoice);
    } catch (e) {
      setMsg(e instanceof Error && e.name === "TimeoutError" ? "Koneksi pembayaran terlalu lama. Silakan coba lagi." : e instanceof Error ? e.message : "Gagal membuat pembayaran.");
    } finally {
      setBusy(false);
    }
  }
  if (invoice)
    return (
      <PaymentInstructions
        invoice={invoice}
        amount={price(months, tier)}
        qrisUrl={qrisUrl}
        onBack={() => setInvoice("")}
      />
    );
  return (
    <><form className="member-payment-card" onSubmit={submit}>
      <small>PEMBAYARAN MEMBER PANBOY</small>
      <h1>Bayar Iuran Member</h1>
      <p>
        Pilih team dan paket terlebih dahulu. QRIS PANBOY diverifikasi oleh admin; iPaymu memperbarui status otomatis setelah pembayaran berhasil.
      </p>
      <label>
        TEAM
        <select required value={team} onChange={(e) => setTeam(Number(e.target.value))}>
          <option value={0} disabled>PILIH TEAM ANDA</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.teamName}</option>)}
        </select>
      </label>
      <label>
        TIER MEMBERSHIP
        <select required value={tier} onChange={(e) => { setTier(e.target.value); setMonths(0); }}>
          <option value="" disabled>PILIH TIER MEMBER</option>
          <option value="C">TIER C — Rp10.000/BULAN</option>
          <option value="S">TIER S — Rp100.000/BULAN · TEAM PROFESIONAL</option>
        </select>
      </label>
      {tier && <p className="payment-tier-note">{tier === "S" ? "Benefit: event sistem liga, prize pool Rp3–5 juta, tools leaderboard dan hitung poin." : "Benefit: event komunitas 1–2 bulan sekali, prize pool mulai Rp1 juta, tools leaderboard dan hitung poin."}</p>}
      <label>
        PAKET MEMBERSHIP
        <select required value={months} disabled={!tier} onChange={(e) => setMonths(Number(e.target.value))}>
          <option value={0} disabled>PILIH LAMA MEMBERSHIP</option>
          {packages.map((n) => <option key={n} value={n}>{n} BULAN — Rp{price(n, tier).toLocaleString("id-ID")}</option>)}
        </select>
      </label>
      {(qrisEnabled || ipaymuEnabled) && <fieldset className="payment-methods">
        <legend>METODE PEMBAYARAN</legend>
        {qrisEnabled && <label className={method === "qris" ? "selected" : ""}>
          <input type="radio" name="paymentMethod" checked={method === "qris"} onChange={() => setMethod("qris")} />
          <span><b>QRIS PANBOY</b><small>Scan QRIS, unggah bukti, lalu diverifikasi admin.</small></span>
        </label>}
        {ipaymuEnabled && <label className={method === "ipaymu" ? "selected" : ""}>
          <input type="radio" name="paymentMethod" checked={method === "ipaymu"} onChange={() => setMethod("ipaymu")} />
          <span><b>iPaymu</b><small>Pembayaran otomatis dan status langsung diperbarui.</small></span>
        </label>}
      </fieldset>}
      <div className="payment-total">
        TOTAL BAYAR <strong>{tier && months ? `Rp${price(months, tier).toLocaleString("id-ID")}` : "Pilih paket"}</strong>
      </div>
      <button disabled={busy || !team || !tier || !months || (!qrisEnabled && !ipaymuEnabled)}>
        {busy ? "MEMPROSES..." : method === "ipaymu" ? "LANJUT KE IPAYMU →" : "BAYAR DENGAN QRIS →"}
      </button>
      {!qrisEnabled && !ipaymuEnabled && <p role="status" className="form-message">Pembayaran member sedang ditutup oleh admin.</p>}
      {msg && <div role="alert"><p className="form-message">{msg}</p>{method === "ipaymu" && qrisEnabled && <button type="button" className="button outline" onClick={() => { setMethod("qris"); setMsg(""); }}>GUNAKAN QRIS PANBOY</button>}</div>}
    </form><PaymentHistory /></>
  );
}
function PaymentInstructions({
  invoice,
  amount,
  qrisUrl,
  onBack,
}: {
  invoice: string;
  amount: number;
  qrisUrl: string;
  onBack: () => void;
}) {
  const [proof, setProof] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [sent, setSent] = useState(false),
    [wa, setWa] = useState("");
  async function upload() {
    if (!proof) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("invoice", invoice);
      const media = new FormData(); media.append("poster", proof);
      const staged = await uploadForm("/api/member-payments/proof", { method: "POST", body: media });
      const image = await staged.json();
      if (!staged.ok || !image.url) throw new Error(image.error || "Bukti gagal diunggah.");
      fd.append("proofUrl", image.url);
      const r = await fetch("/api/member-payments/proof", {
        method: "POST",
        body: fd,
      });
      const x = await r.json();
      if (!r.ok) throw new Error(x.error || "Upload gagal");
      setSent(true);
      setWa(x.whatsappUrl || "");
      if (x.whatsappUrl)
        window.open(x.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="member-payment-card">
      <small>MENUNGGU PEMBAYARAN</small>
      <h1>Bayar via QRIS DANA</h1>
      <img
        src={qrisUrl}
        alt="QRIS DANA Bisnis PANBOY DESIGN"
        style={{
          width: 220,
          maxWidth: "100%",
          display: "block",
          margin: "18px auto",
        }}
      />
      <p>
        <b>Invoice:</b> {invoice}
        <br />
        <b>Nominal:</b> Rp{amount.toLocaleString("id-ID")}
      </p>
      <p>
        Scan QRIS di atas melalui aplikasi DANA. Masukkan nominal tepat sesuai
        tagihan. Setelah berhasil, unggah bukti pembayaran.
      </p>
      {sent ? (
        <>
          <p className="form-message">
            Bukti berhasil dikirim. Status: MENUNGGU VERIFIKASI.
          </p>
          {wa && (
            <a
              className="button gold"
              href={wa}
              target="_blank"
              rel="noreferrer"
            >
              KIRIM KE WHATSAPP ADMIN →
            </a>
          )}
        </>
      ) : (
        <>
          <label>
            BUKTI PEMBAYARAN
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProof(e.target.files?.[0] || null)}
            />
          </label>
          <button type="button" onClick={upload} disabled={busy || !proof}>
            {busy ? "MENGUNGGAH..." : "UPLOAD BUKTI PEMBAYARAN"}
          </button>
        </>
      )}
      {msg && <p className="form-message">{msg}</p>}
      <button type="button" className="button outline" onClick={onBack}>
        KEMBALI
      </button>
    </section>
  );
}
