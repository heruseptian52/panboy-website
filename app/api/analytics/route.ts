import { env } from "cloudflare:workers";
import { ensureAnalytics } from "../../../lib/analytics";
import { requestAdmin } from "../../../lib/admin-auth";

export async function POST(r: Request) {
  try {
    const b = await r.json() as Record<string, unknown>, visitorId = String(b.visitorId || "").slice(0, 80), eventType = String(b.eventType || "").slice(0, 20), path = String(b.path || "").slice(0, 250), label = String(b.label || "").slice(0, 160), device = b.device === "mobile" ? "mobile" : "desktop";
    if (!visitorId || !path || !["pageview", "click"].includes(eventType)) return Response.json({ ok: false }, { status: 400 });
    await ensureAnalytics();
    await env.DB.prepare("INSERT INTO analytics_events(visitor_id,event_type,path,label,device,created_at) VALUES(?,?,?,?,?,?)").bind(visitorId, eventType, path, label, device, new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch { return Response.json({ ok: false }, { status: 400 }); }
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const iso = (date: Date) => date.toISOString().slice(0, 10);
export async function GET(r: Request) {
  const admin = await requestAdmin(r);
  if (!admin?.analytics) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  await ensureAnalytics();
  const url = new URL(r.url), today = iso(new Date()), fallback = new Date();
  fallback.setUTCDate(fallback.getUTCDate() - 6);
  let from = validDate(url.searchParams.get("from") || "") ? String(url.searchParams.get("from")) : iso(fallback), to = validDate(url.searchParams.get("to") || "") ? String(url.searchParams.get("to")) : today;
  if (from > to) [from, to] = [to, from];
  const query = async (sql: string) => (await env.DB.prepare(sql).bind(from, to).all()).results;
  const [summary, pages, clicks, devices, daily, total] = await Promise.all([
    query("SELECT COUNT(CASE WHEN event_type='pageview' THEN 1 END) views,COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END) visitors,COUNT(CASE WHEN event_type='click' THEN 1 END) clicks FROM analytics_events WHERE date(datetime(created_at,'+8 hours')) BETWEEN ? AND ?"),
    query("SELECT path,COUNT(*) count FROM analytics_events WHERE date(datetime(created_at,'+8 hours')) BETWEEN ? AND ? AND event_type='pageview' GROUP BY path ORDER BY count DESC LIMIT 8"),
    query("SELECT COALESCE(NULLIF(label,''),path) label,COUNT(*) count FROM analytics_events WHERE date(datetime(created_at,'+8 hours')) BETWEEN ? AND ? AND event_type='click' GROUP BY label ORDER BY count DESC LIMIT 10"),
    query("SELECT device,COUNT(*) count FROM analytics_events WHERE date(datetime(created_at,'+8 hours')) BETWEEN ? AND ? AND event_type='pageview' GROUP BY device"),
    query("SELECT substr(datetime(created_at,'+8 hours'),1,10) day,COUNT(*) count FROM analytics_events WHERE date(datetime(created_at,'+8 hours')) BETWEEN ? AND ? AND event_type='pageview' GROUP BY day ORDER BY day"),
    env.DB.prepare("SELECT COUNT(CASE WHEN event_type='pageview' THEN 1 END) views,COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END) visitors FROM analytics_events").first(),
  ]);
  return Response.json({ summary: summary[0] || {}, total: total || {}, pages, clicks, devices, daily, range: { from, to } });
}
