import { env } from "cloudflare:workers";

type Period = { id: number; startDate: string; nextStartDate?: string; asOfDate?: string };
type Team = { memberId: number; teamName: string };
type Payment = { memberId: number | null; teamName: string; date: string; amount: number };
type Deduction = { memberId: number; periodId: number; startDate: string; amount: number };
type ManualDue = { amount?: string; status?: string; paidAt?: string };

const amount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));

// Reuse the same monthly de-duplication rule as the live member balance:
// a manual correction and a verified payment in the same month count once.
export function calculateEventBalances(period: Period, teams: Team[], payments: Payment[], deductions: Deduction[], manualDues: Record<string, ManualDue>) {
  // An event's accounting window stays open for new dues until the next active
  // period begins. For the newest event, use verified dues through today.
  const today = period.asOfDate || new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const inWindow = (date: string) => date.slice(0, 10) <= today && (!period.nextStartDate || date.slice(0, 10) < period.nextStartDate);
  const results = teams.map(team => {
    const monthly = new Map<string, { auto: number; manual: number }>();
    const key = team.teamName.trim().toLowerCase();
    for (const payment of payments) {
      if (!inWindow(payment.date) || !(Number(payment.memberId) === team.memberId || (!payment.memberId && payment.teamName.trim().toLowerCase() === key))) continue;
      const month = payment.date.slice(0, 7), row = monthly.get(month) || { auto: 0, manual: 0 };
      row.auto += amount(payment.amount); monthly.set(month, row);
    }
    for (const [dueKey, due] of Object.entries(manualDues)) {
      const [month, id] = dueKey.split(":");
      if (Number(id) !== team.memberId || due.status !== "SUDAH BAYAR" || !inWindow(String(due.paidAt || `${month}-01`))) continue;
      const row = monthly.get(month) || { auto: 0, manual: 0 };
      row.manual = amount(due.amount); monthly.set(month, row);
    }
    const income = [...monthly.values()].reduce((sum, row) => sum + Math.max(row.auto, row.manual), 0);
    let earlier = 0, current = 0;
    for (const cut of deductions) {
      if (Number(cut.memberId) !== team.memberId) continue;
      if (Number(cut.periodId) === Number(period.id)) current += amount(cut.amount);
      else if (cut.startDate < period.startDate || (cut.startDate === period.startDate && Number(cut.periodId) < Number(period.id))) earlier += amount(cut.amount);
    }
    const opening = income - earlier;
    return { ...team, opening, current, closing: opening - current };
  });
  return results;
}

export async function eventBalances(period: Period, teams: Team[]) {
  const [payments, deductions, setting, nextPeriod] = await Promise.all([
    env.DB.prepare("SELECT member_id AS memberId,team_name AS teamName,COALESCE(NULLIF(paid_at,''),created_at) AS date,amount FROM member_payments WHERE status='LUNAS'").all<Payment>(),
    env.DB.prepare("SELECT d.member_id AS memberId,d.period_id AS periodId,p.start_date AS startDate,d.amount FROM finance_member_deductions d JOIN finance_periods p ON p.id=d.period_id WHERE d.status='ACTIVE' AND p.status='ACTIVE'").all<Deduction>(),
    env.DB.prepare("SELECT value FROM site_settings WHERE key='memberDuesJson'").first<{ value: string }>(),
    env.DB.prepare("SELECT start_date AS startDate FROM finance_periods WHERE status='ACTIVE' AND (start_date>? OR (start_date=? AND id>?)) ORDER BY start_date,id LIMIT 1").bind(period.startDate, period.startDate, period.id).first<{ startDate: string }>()
  ]);
  let dues: Record<string, ManualDue> = {};
  try { dues = JSON.parse(setting?.value || "{}"); } catch { /* malformed legacy setting has no manual entries */ }
  return calculateEventBalances({ ...period, nextStartDate: nextPeriod?.startDate }, teams, payments.results, deductions.results, dues);
}
