import { env } from "cloudflare:workers";
import { ipaymuConfig } from "../../lib/ipaymu";
import { getSettings } from "../../lib/settings";
export const dynamic = "force-dynamic";
export const metadata = { title: "Pembayaran Member | Panboy Community" };
export default async function PaymentInfo() {
  const settings = await getSettings();
  const qris = settings.memberQrisEnabled !== "false";
  const ipaymu = settings.memberIpaymuEnabled !== "false" && ipaymuConfig(env).enabled;
  return <main className="legal-page contact-page">
    <a href="/" className="legal-back">← Kembali ke Beranda</a>
    <small>PEMBAYARAN MEMBER</small><h1>Pembayaran Aman</h1>
    <section className="legal-card">
      <span className={`payment-status ${qris || ipaymu ? "active" : ""}`}>{qris ? "● QRIS PANBOY TERSEDIA" : ipaymu ? "● IPAYMU TERSEDIA" : "PEMBAYARAN SEDANG DITUTUP"}</span>
      <h2>PEMBAYARAN MEMBER</h2>
      <p>Pilih team dan paket membership terlebih dahulu agar pembayaran tercatat untuk team yang tepat.</p>
      {qris && <p>QRIS Panboy adalah pilihan utama: scan QRIS, unggah bukti, lalu admin memverifikasi pembayaran.</p>}
      {ipaymu && <p>iPaymu adalah pilihan kedua dengan status pembayaran yang diperbarui otomatis setelah berhasil.</p>}
    </section>
    {(qris || ipaymu) && <a className="legal-cta" href="/member/bayar">LANJUT KE PEMBAYARAN MEMBER →</a>}
    <p className="legal-note">Panboy Community tidak menyimpan data kartu atau kredensial pembayaran pengguna.</p>
  </main>;
}
