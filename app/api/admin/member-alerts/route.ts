import { env } from "cloudflare:workers";
import {ensureMarket} from "../../../../lib/esports-market";
import {rosterIssueCount} from "../../../../lib/roster-check";
import {ensureRosterTables} from "../../../../lib/event-rosters";
import { requestAdmin } from "../../../../lib/admin-auth";

export async function GET(request: Request) {
  const admin = await requestAdmin(request);
  if (!admin?.isOwner && !admin?.members && !admin?.memberDues && !admin?.market && !admin?.events)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });

  const queries = [
    ...(admin.members ? [env.DB.prepare("SELECT COUNT(*) AS total FROM member_registrations WHERE status='PENDING' AND hidden=0")] : []),
    ...(admin.memberDues ? [env.DB.prepare("SELECT COUNT(*) AS total FROM member_payments WHERE status='WAITING_VERIFICATION'")] : []),
  ];
  const results = queries.length ? await env.DB.batch(queries) : [];
  let market=0,roster=0;
  if(admin.market){try{await ensureMarket();market=Number((await env.DB.prepare("SELECT COUNT(*) AS total FROM esports_market WHERE status='pending'").first<{total:number}>())?.total||0)}catch{}}
  if(admin.events){try{await ensureRosterTables();roster=await rosterIssueCount()}catch{}}
  return Response.json({
    market,roster,registrations: admin.members ? Number((results[0]?.results[0] as { total?: number } | undefined)?.total || 0) : 0,
    payments: admin.memberDues ? Number((results[admin.members ? 1 : 0]?.results[0] as { total?: number } | undefined)?.total || 0) : 0,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
