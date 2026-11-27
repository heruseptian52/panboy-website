type RuntimeEnv = Record<string, string | undefined>;

export type MidtransNotification = {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
};

export function midtransConfig(runtime: unknown) {
  const values = runtime as RuntimeEnv;
  const serverKey = String(values.MIDTRANS_SERVER_KEY ?? "").trim();
  const clientKey = String(values.MIDTRANS_CLIENT_KEY ?? "").trim();
  const notificationUrl = String(values.MIDTRANS_NOTIFICATION_URL ?? "").trim();
  const production = String(values.MIDTRANS_IS_PRODUCTION ?? "false").toLowerCase() === "true";
  return {
    serverKey,
    clientKey,
    notificationUrl,
    production,
    enabled: Boolean(serverKey && clientKey),
    apiBase: production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com",
    snapUrl: production ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js",
  };
}

export function parseRupiah(value: string) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
}

export function paymentStatus(transactionStatus: string, fraudStatus = "") {
  const status = transactionStatus.toLowerCase();
  const fraud = fraudStatus.toLowerCase();
  if (status === "capture") return fraud === "challenge" ? "pending" : "paid";
  if (status === "settlement") return "paid";
  if (["refund", "partial_refund"].includes(status)) return "refunded";
  if (["deny", "cancel", "expire", "failure"].includes(status)) return "failed";
  return "pending";
}

async function sha512(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validMidtransSignature(notification: MidtransNotification, serverKey: string) {
  const orderId = String(notification.order_id ?? "");
  const statusCode = String(notification.status_code ?? "");
  const grossAmount = String(notification.gross_amount ?? "");
  const signature = String(notification.signature_key ?? "").toLowerCase();
  if (!orderId || !statusCode || !grossAmount || !signature || !serverKey) return false;
  return (await sha512(`${orderId}${statusCode}${grossAmount}${serverKey}`)) === signature;
}

export async function createSnapTransaction(runtime: unknown, input: {
  orderId: string;
  amount: number;
  eventTitle: string;
  teamName: string;
  captainName: string;
  whatsapp: string;
  finishUrl: string;
}) {
  const config = midtransConfig(runtime);
  if (!config.enabled) return null;
  const response = await fetch(`${config.apiBase}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${config.serverKey}:`)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(config.notificationUrl ? { "X-Override-Notification": config.notificationUrl } : {}),
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      item_details: [{ id: `event-${input.orderId}`, price: input.amount, quantity: 1, name: input.eventTitle.slice(0, 50) }],
      customer_details: { first_name: input.captainName, phone: input.whatsapp },
      callbacks: { finish: input.finishUrl },
      custom_field1: input.teamName.slice(0, 100),
    }),
  });
  const output = await response.json() as { token?: string; redirect_url?: string; error_messages?: string[] };
  if (!response.ok || !output.token) throw new Error(output.error_messages?.join(", ") || "Midtrans tidak dapat membuat transaksi");
  return { token: output.token, redirectUrl: output.redirect_url ?? "", clientKey: config.clientKey, snapUrl: config.snapUrl };
}
