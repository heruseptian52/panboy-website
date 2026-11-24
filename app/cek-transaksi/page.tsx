import { env } from "cloudflare:workers";
import { rupiah, type Order } from "../../lib/shop";
export const dynamic = "force-dynamic";
export default async function Cek({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const q = (await searchParams).invoice?.trim() || "";
  const o = q
    ? await env.DB.prepare(
        "SELECT code,product_name AS productName,total,status,created_at AS createdAt FROM orders WHERE code=?",
      )
        .bind(q)
        .first<
          Pick<Order, "code" | "productName" | "total" | "status" | "createdAt">
        >()
    : null;
  return (
    <main className="tracking-page">
      <div className="tracking-card">
        <img src="/panboy-logo.png" alt="Panboy" />
        <small>PANBOY DIGITAL STORE</small>
        <h1>CEK STATUS TRANSAKSI</h1>
        <form method="get">
          <input
            name="invoice"
            defaultValue={q}
            placeholder="PB-DIGI-XXXXXXXX"
            aria-label="Nomor invoice"
          />
          <button type="submit">CEK TRANSAKSI</button>
        </form>
        {q && !o && <p className="cancelled">Invoice tidak ditemukan.</p>}
        {o && (
          <div className="order-detail">
            <p>
              <span>Invoice</span>
              {o.code}
            </p>
            <p>
              <span>Produk</span>
              {o.productName}
            </p>
            <p>
              <span>Total</span>
              {rupiah(o.total)}
            </p>
            <p>
              <span>Status</span>
              {o.status}
            </p>
            <p>
              <span>Tanggal</span>
              {new Date(o.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
        )}
        <a className="tracking-home" href="/digital-store">
          KEMBALI KE DIGITAL STORE
        </a>
      </div>
    </main>
  );
}
