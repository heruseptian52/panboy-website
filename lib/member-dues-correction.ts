import { MEMBERSHIP_PACKAGES } from "./member-payments";

export function paidMonths(amount: unknown, tier: unknown): number {
  const price = String(tier).toUpperCase() === "S" ? 100000 : 10000;
  const value = Number(amount);
  return Number.isSafeInteger(value) && value > 0 && value % price === 0 && value / price <= 120
    ? value / price : 0;
}

export function correctedEnd(currentEnd: string, deltaMonths: number, fallbackDate: string, preferredDay?: number): string {
  if (!deltaMonths) return currentEnd || "";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(currentEnd) ? currentEnd : fallbackDate;
  const [year, month, day] = anchor.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(preferredDay || day, last));
  return target.toISOString().slice(0, 10);
}

export function manualPeriodEnd(baseEnd: string, paidAt: string, months: number, preferredDay?: number): string {
  const continuing = /^\d{4}-\d{2}-\d{2}$/.test(baseEnd) && baseEnd >= paidAt;
  return correctedEnd(continuing ? baseEnd : paidAt, months, paidAt, continuing ? preferredDay : undefined);
}

export function packageAmount(tier: string, months: number): number | undefined {
  return MEMBERSHIP_PACKAGES[tier]?.[months];
}
