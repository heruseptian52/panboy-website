import { env } from "cloudflare:workers";

export async function ensureOtherExpenses(){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS finance_other_expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, item_name TEXT NOT NULL, amount INTEGER NOT NULL, expense_date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', proof_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ACTIVE', cancel_reason TEXT NOT NULL DEFAULT '', source_expense_id INTEGER UNIQUE, created_by TEXT NOT NULL, created_at TEXT NOT NULL)").run();
  // The existing website-development payment was entered under the November event.
  // Move that exact record once, preserving its amount, source and audit trail.
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO finance_other_expenses(category,item_name,amount,expense_date,notes,proof_url,source_expense_id,created_by,created_at) SELECT 'PENGEMBANGAN WEBSITE',item_name,amount,expense_date,notes,proof_url,id,created_by,created_at FROM finance_expenses WHERE id=12 AND period_id=3 AND amount=350000 AND funding_source='OPERATING' AND item_name='PENGEMBANGAN WEBSITE DAN DESIGN' AND status='ACTIVE'"),
    env.DB.prepare("UPDATE finance_expenses SET status='CANCELLED',cancel_reason='Dipindahkan ke pengeluaran operasional khusus',updated_at=? WHERE id=12 AND period_id=3 AND amount=350000 AND funding_source='OPERATING' AND status='ACTIVE' AND EXISTS(SELECT 1 FROM finance_other_expenses WHERE source_expense_id=12)").bind(new Date().toISOString()),
  ]);
}
