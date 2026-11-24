type RuntimeEnv = Record<string, string | undefined>;

export type IPaymuConfig = {
  va: string;
  apiKey: string;
  mode: "live" | "sandbox";
  callbackUrl: string;
  returnUrl: string;
  cancelUrl: string;
  enabled: boolean;
};

export function ipaymuConfig(runtime: unknown): IPaymuConfig {
  const values = runtime as RuntimeEnv;
  const mode = String(values.IPAYMU_MODE ?? "live").trim().toLowerCase() === "sandbox" ? "sandbox" : "live";
  return {
    va: String(values.IPAYMU_VA ?? "").trim(),
    apiKey: String(values.IPAYMU_API_KEY ?? "").trim(),
    mode,
    callbackUrl: String(values.IPAYMU_CALLBACK_URL ?? "").trim(),
    returnUrl: String(values.IPAYMU_RETURN_URL ?? "").trim(),
    cancelUrl: String(values.IPAYMU_CANCEL_URL ?? "").trim(),
    enabled: Boolean(String(values.IPAYMU_VA ?? "").trim() && String(values.IPAYMU_API_KEY ?? "").trim()),
  };
}

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createIPaymuPayment(runtime: unknown, input: { referenceId: string; amount: number; productName: string; buyerName?: string; buyerPhone?: string; buyerEmail?: string }) {
  const config = ipaymuConfig(runtime);
  if (!config.enabled) return null;
  const origin = config.callbackUrl || "https://panboycommunity.my.id/api/payments/ipaymu";
  let callback: URL;
  try { callback = new URL(origin); } catch { throw new Error("URL callback iPaymu tidak valid. Hubungi admin."); }
  if(callback.protocol !== "https:" || callback.username || callback.password) throw new Error("Callback iPaymu harus memakai URL HTTPS yang valid.");
  const body = {
    product: [input.productName.slice(0, 100)],
    // iPaymu's redirect-payment examples send array entries as strings.
    qty: ["1"],
    price: [String(input.amount)],
    description: [`Pembayaran ${input.productName.slice(0, 100)}`],
    returnUrl: config.returnUrl || (origin ? origin.replace(/\/api\/payments\/ipaymu.*$/, "/member") : ""),
    cancelUrl: config.cancelUrl || (origin ? origin.replace(/\/api\/payments\/ipaymu.*$/, "/member") : ""),
    notifyUrl: callback.href,
    referenceId: input.referenceId,
    buyerName: input.buyerName || "Panboy Member",
    ...(input.buyerPhone ? { buyerPhone: input.buyerPhone } : {}),
    ...(input.buyerEmail ? { buyerEmail: input.buyerEmail } : {}),
  };
  // Sign the exact byte sequence sent to iPaymu. Their API recommends stable,
  // alphabetically ordered JSON keys for request signatures.
  const raw = JSON.stringify(Object.fromEntries(Object.entries(body).sort(([a], [b]) => a.localeCompare(b, "en"))));
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const timestamp = ["year", "month", "day", "hour", "minute", "second"].map((name) => parts.find((part) => part.type === name)?.value || "00").join("");
  const signature = await hmacSha256(`POST:${config.va}:${await sha256(raw)}:${config.apiKey}`, config.apiKey);
  let response: Response;
  try {
    response = await fetch(`${config.mode === "sandbox" ? "https://sandbox.ipaymu.com" : "https://my.ipaymu.com"}/api/v2/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", va: config.va, signature, timestamp },
      body: raw,
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error("Koneksi iPaymu gagal atau terlalu lama. Silakan coba lagi beberapa saat.");
  }
  const responseType = response.headers.get("content-type") || "unknown";
  const rawResponse = await response.text();
  let output: Record<string, any> | null = null;
  try { const parsed = JSON.parse(rawResponse); if(parsed && typeof parsed === "object" && !Array.isArray(parsed)) output = parsed; } catch {}
  const data = output?.Data ?? output?.data;
  const redirect = data?.Url ?? data?.PaymentUrl ?? data?.url;
  const providerStatus = String(output?.Status ?? output?.status ?? response.status).slice(0, 20);
  const message = output?.Message ?? output?.message ?? output?.ErrorMessage ?? output?.error;
  const providerMessage = typeof message === "string" ? message.replaceAll(config.apiKey, "[redacted]").replaceAll(config.va, "[redacted]").replace(/<[^>]*>/g, "").slice(0,180) : "";
  if (!response.ok || !redirect || (output?.Status !== undefined && Number(output.Status) !== 200)) {
    const reason = [525,526].includes(response.status) ? "upstream_tls" : /invalid ip|ip address|ip whitelist/i.test(providerMessage) ? "invalid_ip" : /invalid domain/i.test(providerMessage) ? "invalid_domain" : /signature|unauthorized|api key|credential/i.test(providerMessage) ? "credentials" : !output ? "non_json" : "provider_rejected";
    console.error("ipaymu_payment_failed", JSON.stringify({httpStatus:response.status,providerStatus,responseType,reason,providerMessage}));
    if (reason === "upstream_tls") throw new Error(`Koneksi HTTPS iPaymu gagal diverifikasi (HTTP ${response.status}). Hubungi dukungan iPaymu untuk memeriksa sertifikat server API Production. Pembayaran belum dibuat; gunakan QRIS PANBOY sementara.`);
    if (reason === "credentials") throw new Error("iPaymu menolak kredensial atau signature. Pastikan VA dan API Key berasal dari akun Production yang sama.");
    if (reason === "invalid_ip") throw new Error("iPaymu menolak IP server. Minta iPaymu mengaktifkan akses server hosting Panboy pada akun Production.");
    if (reason === "invalid_domain") throw new Error("iPaymu menolak domain. Daftarkan panboycommunity.my.id dan URL callback pada pengaturan Production iPaymu.");
    if (!output) throw new Error(`Server iPaymu tidak memberikan respons API yang valid (HTTP ${response.status}). Hubungi admin untuk memeriksa akses server dan aktivasi akun iPaymu.`);
    throw new Error(providerMessage || `iPaymu menolak pembuatan pembayaran (HTTP ${response.status}, kode ${providerStatus}). Hubungi admin.`);
  }
  let checkout: URL;
  try { checkout = new URL(String(redirect)); } catch { throw new Error("URL pembayaran dari iPaymu tidak valid."); }
  if(checkout.protocol !== "https:" || (checkout.hostname !== "ipaymu.com" && !checkout.hostname.endsWith(".ipaymu.com"))) throw new Error("Domain halaman pembayaran iPaymu tidak valid.");
  return { redirectUrl: checkout.href, paymentNo: String(data.PaymentNo || data.SessionID || "") };

}

export async function validIPaymuSignature(body: Record<string, unknown>, received: string, va: string) {
  if (!received || !va) return false;
  const normalized: Record<string, unknown> = { ...body };
  delete normalized.signature;
  for (const key of ["trx_id", "status_code", "transaction_status_code", "paid_off"]) {
    if (key in normalized) {
      const value = Number(normalized[key]);
      if (!Number.isInteger(value)) return false;
      normalized[key] = value;
    }
  }
  if ("is_escrow" in normalized) normalized.is_escrow = [true, 1, "1", "true"].includes(normalized.is_escrow as string);
  if (normalized.additional_info === "[]" || !("additional_info" in normalized)) normalized.additional_info = [];
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== null && !Array.isArray(value) && typeof value !== "boolean" && typeof value !== "number") normalized[key] = String(value);
  }
  const sorted = Object.fromEntries(Object.keys(normalized).sort((a, b) => a.localeCompare(b)).map(key => [key, normalized[key]]));
  const signedJson = JSON.stringify(sorted).replace(/\//g, "\\/");
  const expected = await hmacSha256(signedJson, va);
  const actual = received.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(actual)) return false;
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return difference === 0;
}
