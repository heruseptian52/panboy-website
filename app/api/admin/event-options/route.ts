import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { ensureSettings } from "../../../../lib/settings";

const defaults = {
  category: [
    "Event Panboy",
    "Event Premium",
    "Event Official",
    "Community Event",
    "Event Partner",
  ],
  status: [
    "OPEN REGISTRATION",
    "FREE REGISTRATION",
    "REGISTRATION",
    "COMING SOON",
    "SLOT FULL",
    "SELESAI",
  ],
  mode: ["Online", "Offline"],
} as const;
type OptionType = keyof typeof defaults;
const key = (type: OptionType) => `event_${type}_options`;
function isType(value: string): value is OptionType {
  return value === "category" || value === "status" || value === "mode";
}
async function custom(type: OptionType) {
  const row = await env.DB.prepare(
    "SELECT value FROM site_settings WHERE key=?",
  )
    .bind(key(type))
    .first<{ value: string }>();
  try {
    return JSON.parse(row?.value || "[]") as string[];
  } catch {
    return [];
  }
}
async function options() {
  const [categories, statuses, modes] = await Promise.all([
    custom("category"),
    custom("status"),
    custom("mode"),
  ]);
  return {
    categories: [...new Set([...defaults.category, ...categories])],
    statuses: [...new Set([...defaults.status, ...statuses])],
    modes: [...new Set([...defaults.mode, ...modes])],
  };
}

export async function GET(r: Request) {
  const admin = await requestAdmin(r);
  if (!admin?.events)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  return Response.json({ ...(await options()), isOwner: admin.isOwner });
}
export async function POST(r: Request) {
  const admin = await requestAdmin(r);
  if (!admin?.isOwner)
    return Response.json({ error: "Hanya admin utama" }, { status: 403 });
  await ensureSettings();
  const body = (await r.json()) as Record<string, unknown>,
    type = String(body.type),
    raw = String(body.value || "").trim();
  if (!isType(type) || !raw || raw.length > 40)
    return Response.json(
      { error: "Nama pilihan tidak valid" },
      { status: 400 },
    );
  const value = type === "status" ? raw.toUpperCase() : raw,
    current = await custom(type);
  if (
    ![...defaults[type], ...current].some(
      (x) => x.toLowerCase() === value.toLowerCase(),
    )
  )
    current.push(value);
  await env.DB.prepare(
    "INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
  )
    .bind(key(type), JSON.stringify(current), new Date().toISOString())
    .run();
  return Response.json(await options());
}
export async function DELETE(r: Request) {
  const admin = await requestAdmin(r);
  if (!admin?.isOwner)
    return Response.json({ error: "Hanya admin utama" }, { status: 403 });
  await ensureSettings();
  const url = new URL(r.url),
    type = url.searchParams.get("type") || "",
    value = url.searchParams.get("value") || "";
  if (!isType(type) || !value || defaults[type].includes(value as never))
    return Response.json(
      { error: "Pilihan bawaan tidak dapat dihapus" },
      { status: 400 },
    );
  const next = (await custom(type)).filter((x) => x !== value);
  await env.DB.prepare(
    "INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
  )
    .bind(key(type), JSON.stringify(next), new Date().toISOString())
    .run();
  return Response.json(await options());
}
