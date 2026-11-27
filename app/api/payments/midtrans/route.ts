import { env } from "cloudflare:workers";
import { midtransConfig, paymentStatus, type MidtransNotification, validMidtransSignature } from "../../../../lib/midtrans";
import { getSettings } from "../../../../lib/settings";

export async function POST(request: Request) {
  const config = midtransConfig(env);
  if (!config.serverKey) return Response.json({ error: "Midtrans belum dikonfigurasi." }, { status: 503 });
  let notification: MidtransNotification;
  try { notification = await request.json() as MidtransNotification; }
  catch { return Response.json({ error: "Payload tidak valid." }, { status: 400 }); }
  if (!await validMidtransSignature(notification, config.serverKey))
    return Response.json({ error: "Signature tidak valid." }, { status: 401 });

  const orderId = String(notification.order_id ?? "").slice(0, 80);
  const nextStatus = paymentStatus(String(notification.transaction_status ?? ""), String(notification.fraud_status ?? ""));
  if (orderId.startsWith("MEMBER-")) {
    const parts = orderId.split("-");
    const memberId = Number(parts[1]);
    const months = Math.min(24, Math.max(1, Number(parts[2]) || 1));
    if (memberId && nextStatus === "paid") {
      const settings = await getSettings();
      let dues: Record<string, {amount:string;status:string;paidAt:string;tier?:string}> = {};
      try { dues = JSON.parse(settings.memberDuesJson || "{}"); } catch {}
      const now = new Date().toISOString().slice(0, 10);
      const start = new Date();
      for (let i = 0; i < months; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = `${d.toISOString().slice(0, 7)}:${memberId}`;
        const old = dues[key] || { amount: "", status: "BELUM BAYAR", paidAt: "" };
        dues[key] = { ...old, status: "SUDAH BAYAR", paidAt: old.paidAt || now };
      }
      await env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES('memberDuesJson',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(dues), new Date().toISOString()).run();
    }
    return Response.json({ ok: true });
  }
  const registration = await env.DB.prepare("SELECT id,payment_status FROM event_registrations WHERE payment_order_id=? OR code=? LIMIT 1").bind(orderId, orderId).first<{id:number;payment_status:string}>();
  if (!registration) return Response.json({ ok: true });

  const now = new Date().toISOString();
  if (nextStatus === "paid") {
    await env.DB.prepare("UPDATE event_registrations SET payment_status='paid',registration_status='confirmed',paid_at=CASE WHEN paid_at='' THEN ? ELSE paid_at END WHERE id=?").bind(now, registration.id).run();
  } else if (registration.payment_status !== "paid") {
    await env.DB.prepare("UPDATE event_registrations SET payment_status=? WHERE id=?").bind(nextStatus, registration.id).run();
  }
  return Response.json({ ok: true });
}
