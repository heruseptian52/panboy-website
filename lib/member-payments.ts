import { env } from "cloudflare:workers";
export const MEMBERSHIP_PACKAGES: Record<string, Record<number, number>> = {
  C: {
    1: 10000,
    2: 20000,
    3: 30000,
    4: 40000,
    5: 50000,
    6: 60000,
    7: 70000,
    8: 80000,
    9: 90000,
    10: 100000,
    11: 110000,
    12: 120000,
    36: 360000,
    120: 1200000,
  },
  S: {
    1: 100000,
    2: 200000,
    3: 300000,
    4: 400000,
    5: 500000,
    6: 600000,
    7: 700000,
    8: 800000,
    9: 900000,
    10: 1000000,
    11: 1100000,
    12: 1200000,
    36: 3600000,
    120: 12000000,
  },
};
export async function ensureMemberPayments() {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS member_registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, team_name TEXT NOT NULL, owner_name TEXT NOT NULL, management_name TEXT NOT NULL, logo_url TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL, instagram TEXT NOT NULL DEFAULT '', tiktok TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'PENDING', reviewed_by TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL DEFAULT '', hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  ).run();
  const registrationColumns = await env.DB.prepare("PRAGMA table_info(member_registrations)").all<{ name: string }>();
  if (!registrationColumns.results.some((x) => x.name === "hidden"))
    await env.DB.prepare("ALTER TABLE member_registrations ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0").run();
  const memberColumns = await env.DB.prepare(
    "PRAGMA table_info(community_members)",
  ).all<{ name: string }>();
  const memberNames = new Set(memberColumns.results.map((x) => x.name));
  for (const [name, type] of [
    ["owner_name", "TEXT NOT NULL DEFAULT ''"],
    ["management_name", "TEXT NOT NULL DEFAULT ''"],
    ["whatsapp", "TEXT NOT NULL DEFAULT ''"],
  ] as const)
    if (!memberNames.has(name))
      await env.DB.prepare(
        `ALTER TABLE community_members ADD COLUMN ${name} ${type}`,
      ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS member_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice TEXT NOT NULL UNIQUE, member_id INTEGER, team_name TEXT NOT NULL, buyer_name TEXT NOT NULL, whatsapp TEXT NOT NULL, months INTEGER NOT NULL, amount INTEGER NOT NULL, proof_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'WAITING_PAYMENT', paid_at TEXT NOT NULL DEFAULT '', verified_by TEXT NOT NULL DEFAULT '', verified_at TEXT NOT NULL DEFAULT '', membership_start TEXT NOT NULL DEFAULT '', membership_end TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  ).run();
  const paymentColumns = await env.DB.prepare(
    "PRAGMA table_info(member_payments)",
  ).all<{ name: string }>();
  if (!paymentColumns.results.some((x) => x.name === "tier"))
    await env.DB.prepare(
      "ALTER TABLE member_payments ADD COLUMN tier TEXT NOT NULL DEFAULT 'C'",
    ).run();
  if (!paymentColumns.results.some((x) => x.name === "payment_method"))
    await env.DB.prepare(
      "ALTER TABLE member_payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'QRIS'",
    ).run();
  if (!paymentColumns.results.some((x) => x.name === "provider_transaction_id"))
    await env.DB.prepare(
      "ALTER TABLE member_payments ADD COLUMN provider_transaction_id TEXT NOT NULL DEFAULT ''",
    ).run();
  if (!paymentColumns.results.some((x) => x.name === "provider_status"))
    await env.DB.prepare(
      "ALTER TABLE member_payments ADD COLUMN provider_status TEXT NOT NULL DEFAULT ''",
    ).run();
  if (!paymentColumns.results.some((x) => x.name === "callback_received_at"))
    await env.DB.prepare(
      "ALTER TABLE member_payments ADD COLUMN callback_received_at TEXT NOT NULL DEFAULT ''",
    ).run();
  await env.DB.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_member_payments_provider_transaction ON member_payments(provider_transaction_id) WHERE provider_transaction_id!=''",
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_member_payments_status ON member_payments(status)",
  ).run();
  const columns = await env.DB.prepare(
    "PRAGMA table_info(community_members)",
  ).all<{ name: string }>();
  const names = new Set(columns.results.map((x) => x.name));
  if (!names.has("membership_start"))
    await env.DB.prepare(
      "ALTER TABLE community_members ADD COLUMN membership_start TEXT NOT NULL DEFAULT ''",
    ).run();
  if (!names.has("membership_end"))
    await env.DB.prepare(
      "ALTER TABLE community_members ADD COLUMN membership_end TEXT NOT NULL DEFAULT ''",
    ).run();
  if (!names.has("membership_tier"))
    await env.DB.prepare(
      "ALTER TABLE community_members ADD COLUMN membership_tier TEXT NOT NULL DEFAULT ''",
    ).run();
  const repairKey = "repair_vexen_forced_inactive_v1";
  const repaired = await env.DB.prepare(
    "SELECT value FROM site_settings WHERE key=?",
  )
    .bind(repairKey)
    .first();
  if (!repaired) {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE community_members SET active=1,updated_at=? WHERE team_name='VEXEN ESPORT' AND active=0 AND membership_start='' AND membership_end='' AND membership_tier=''",
      ).bind(now),
      env.DB.prepare(
        "INSERT OR IGNORE INTO site_settings(key,value,updated_at) VALUES(?,?,?)",
      ).bind(repairKey, "done", now),
    ]);
  }
  const duplicateRepairKey = "repair_cyber_claws_duplicate_v1";
  const duplicateRepaired = await env.DB.prepare(
    "SELECT value FROM site_settings WHERE key=?",
  )
    .bind(duplicateRepairKey)
    .first();
  if (!duplicateRepaired) {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM community_members WHERE team_name='CYBER CLAWS ESPORT' AND whatsapp='082213398426' AND created_at='2026-09-12T17:04:09.889Z'",
      ),
      env.DB.prepare(
        "UPDATE member_registrations SET status='REJECTED',reviewed_by='heruseptian52@gmail.com',reviewed_at=?,updated_at=? WHERE id=1 AND team_name='CYBER CLAWS ESPORT'",
      ).bind(now, now),
      env.DB.prepare(
        "INSERT OR IGNORE INTO site_settings(key,value,updated_at) VALUES(?,?,?)",
      ).bind(duplicateRepairKey, "done", now),
    ]);
  }
}
export function invoice() {
  return `PB-MEMBER-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}
export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
