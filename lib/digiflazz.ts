/** Backend-only Digiflazz API configuration and request helpers. */
export type DigiflazzConfig = { username: string; apiKey: string; mode: "production" | "development" };

export function getDigiflazzConfig(env: Record<string, string | undefined>): DigiflazzConfig | null {
  const username = env.DIGIFLAZZ_USERNAME?.trim();
  const apiKey = env.DIGIFLAZZ_API_KEY?.trim();
  if (!username || !apiKey) return null;
  return { username, apiKey, mode: env.DIGIFLAZZ_MODE === "development" ? "development" : "production" };
}

export async function digiflazzRequest<T>(env: Record<string, string | undefined>, body: Record<string, unknown>): Promise<T> {
  const config = getDigiflazzConfig(env);
  if (!config) throw new Error("Digiflazz belum dikonfigurasi");
  const payload = { username: config.username, ...body };
  const response = await fetch("https://api.digiflazz.com/v1/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Digiflazz HTTP ${response.status}`);
  return await response.json() as T;
}
