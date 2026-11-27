import { env } from "cloudflare:workers";
import { requestAdmin, requirePermission } from "../../../../lib/admin-auth";
import {
  MASTER_LAYOUT_KEY,
  masterDefaults,
  sanitizeMaster,
} from "../../../../lib/master-layout";
import { ensureSettings } from "../../../../lib/settings";
import { audit } from "../../../../lib/audit";
async function read() {
  await ensureSettings();
  const r = await env.DB.prepare("SELECT value FROM site_settings WHERE key=?")
    .bind(MASTER_LAYOUT_KEY)
    .first<{ value: string }>();
  if (!r) {
    await env.DB.prepare(
      "INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?)",
    )
      .bind(
        MASTER_LAYOUT_KEY,
        JSON.stringify(masterDefaults),
        new Date().toISOString(),
      )
      .run();
    return masterDefaults;
  }
  try {
    return sanitizeMaster(JSON.parse(r.value));
  } catch {
    return masterDefaults;
  }
}
export async function GET(r: Request) {
  if (!(await requirePermission(r, "leaderboardDesign")))
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  return Response.json(await read());
}
export async function PUT(r: Request) {
  const a = await requestAdmin(r);
  if (!a?.isOwner)
    return Response.json(
      { error: "Hanya Admin Utama yang dapat mengubah Master Layout" },
      { status: 403 },
    );
  const master = sanitizeMaster(await r.json()),
    now = new Date().toISOString();
  await ensureSettings();
  await env.DB.prepare(
    "INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
  )
    .bind(MASTER_LAYOUT_KEY, JSON.stringify(master), now)
    .run();
  await audit(
    a.email,
    "UPDATE",
    "leaderboard_master_layout",
    "master",
    JSON.stringify(master),
  );
  return Response.json(master);
}
