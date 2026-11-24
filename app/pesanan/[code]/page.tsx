import { env } from "cloudflare:workers";
import { rupiah, type Order } from "../../../lib/shop";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const o = await env.DB.prepare(
    "SELECT id,code,product_id AS productId,product_name AS productName,product_type AS productType,customer_name AS customerName,customer_whatsapp AS customerWhatsapp,game_id AS gameId,notes,total,status,created_at AS createdAt,updated_at AS updatedAt FROM orders WHERE code=?",
  )
    .bind(code)
    .first<Order>();
  if (!o)
    return (
      <main className="tracking-page">
        <div className="tracking-card">
          <h1>Pesanan tidak ditemukan</h1>
          <a href="/">Kembali</a>
        </div>
      </main>
    );
  const steps = ["Pesanan Masuk", "Diproses", "Selesai"],
    active = steps.indexOf(o.status);
  return (
    <main className="tracking-page">
      <div className="tracking-card">
        <img src="/panboy-logo.png" alt="Panboy" />
        <small>STATUS PESANAN • {o.code}</small>
        <h1>{o.productName}</h1>
        <strong>{rupiah(o.total)}</strong>
        <div className="status-steps">
          {steps.map((s, i) => (
            <div className={i <= active ? "active" : ""} key={s}>
              <span>{i < active ? "✓" : i + 1}</span>
              <p>{s}</p>
            </div>
          ))}
        </div>
        {o.status === "Dibatalkan" && (
          <p className="cancelled">Pesanan dibatalkan</p>
        )}
        <div className="order-detail">
          <p>
            <span>Nama</span>
            {o.customerName}
          </p>
          {o.gameId && (
            <p>
              <span>ID NICK</span>
              {o.gameId}
            </p>
          )}
          <p>
            <span>Terakhir diperbarui</span>
            {new Date(o.updatedAt).toLocaleString("id-ID")}
          </p>
        </div>
        <p className="tracking-note">
          Simpan link halaman ini untuk memantau status pesanan.
        </p>
        <a className="tracking-home" href="/">
          KEMBALI KE WEBSITE
        </a>
      </div>
    </main>
  );
}
