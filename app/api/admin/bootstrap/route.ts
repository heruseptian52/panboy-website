import { env } from "cloudflare:workers";
import { ensureEventsTable } from "../../../../lib/events";
import { requestAdmin } from "../../../../lib/admin-auth";

const categories = ["Event Panboy","Event Premium","Event Official","Community Event","Event Partner"];
const statuses = ["OPEN REGISTRATION","FREE REGISTRATION","REGISTRATION","COMING SOON","SLOT FULL","SELESAI"];
const modes = ["Online","Offline"];

export async function GET(request: Request) {
  const admin = await requestAdmin(request);
  if (!admin?.events) return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  await ensureEventsTable();
  const [eventRows, optionRows] = await env.DB.batch([
    env.DB.prepare("SELECT e.id,e.title,e.event_date AS eventDate,e.start_date AS startDate,e.end_date AS endDate,e.prizepool,e.registration_fee AS registrationFee,e.image_url AS imageUrl,e.category,e.status,e.whatsapp,e.event_mode AS eventMode,e.registration_type AS registrationType,e.city,e.province,e.address,e.max_slots AS maxSlots,(SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.payment_status='paid') AS paidSlots,e.sort_order AS sortOrder FROM events e WHERE e.deleted_at='' ORDER BY e.sort_order ASC,e.id DESC"),
    env.DB.prepare("SELECT key,value FROM site_settings WHERE key IN ('event_category_options','event_status_options','event_mode_options')"),
  ]);
  const custom: Record<string, string[]> = {};
  for (const row of optionRows.results as Array<{key:string;value:string}>) {
    try { custom[row.key] = JSON.parse(row.value); } catch { custom[row.key] = []; }
  }
  return Response.json({
    events: eventRows.results,
    options: {
      categories: [...new Set([...categories, ...(custom.event_category_options || [])])],
      statuses: [...new Set([...statuses, ...(custom.event_status_options || [])])],
      modes: [...new Set([...modes, ...(custom.event_mode_options || [])])],
    },
  });
}
