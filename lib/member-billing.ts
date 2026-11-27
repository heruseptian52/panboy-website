import { env } from "cloudflare:workers";

export async function ensureMemberBillingPreferences() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS member_billing_preferences (
    member_id INTEGER PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  )`).run();
}
