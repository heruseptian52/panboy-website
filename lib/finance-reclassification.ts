import { env } from "cloudflare:workers";

// Keep original receipts and an auditable reversal when an old team name is
// linked to a current member by its stable member ID.
export async function ensureHistoricalCashTransfer() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS finance_member_cash_transfers (source_payment_id INTEGER PRIMARY KEY, amount INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE')").run();
  const columns=await env.DB.prepare("PRAGMA table_info(finance_member_cash_transfers)").all<{name:string}>();
  if(!columns.results.some(x=>x.name==="status"))try{await env.DB.prepare("ALTER TABLE finance_member_cash_transfers ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'").run()}catch(error){if(!String(error).includes("duplicate column name"))throw error}
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO finance_member_cash_transfers(source_payment_id,amount,reason,created_at) SELECT p.id,10000,'Saldo nama lama tanpa tim saat ini → kas operasional',datetime('now') FROM member_payments p WHERE p.id=17 AND p.team_name='ELIPSE ALPHA ESPORT' AND p.amount=10000 AND p.status='LUNAS' AND NOT EXISTS(SELECT 1 FROM community_members m WHERE m.id=p.member_id)"),
    env.DB.prepare("INSERT OR IGNORE INTO finance_member_cash_transfers(source_payment_id,amount,reason,created_at) SELECT p.id,10000,'Saldo nama lama tanpa tim saat ini → kas operasional',datetime('now') FROM member_payments p WHERE p.id=52 AND p.team_name='VARD MAN' AND p.amount=10000 AND p.status='LUNAS' AND NOT EXISTS(SELECT 1 FROM community_members m WHERE m.id=p.member_id)"),
  ]);
  await env.DB.prepare("UPDATE finance_member_cash_transfers SET status='REVERSED',reason='Koreksi: iuran terhubung ke member_id, tidak dialihkan ke kas operasional' WHERE status='ACTIVE' AND EXISTS(SELECT 1 FROM member_payments p JOIN community_members m ON m.id=p.member_id WHERE p.id=finance_member_cash_transfers.source_payment_id)").run();
}

export async function historicalCashTransferred() {
  await ensureHistoricalCashTransfer();
  const row=await env.DB.prepare("SELECT COALESCE(SUM(t.amount),0) AS total FROM finance_member_cash_transfers t JOIN member_payments p ON p.id=t.source_payment_id AND p.status='LUNAS' AND p.amount=t.amount WHERE t.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM community_members m WHERE m.id=p.member_id) AND ((p.id=17 AND p.team_name='ELIPSE ALPHA ESPORT') OR (p.id=52 AND p.team_name='VARD MAN'))").first<{total:number}>();
  return Number(row?.total||0);
}
