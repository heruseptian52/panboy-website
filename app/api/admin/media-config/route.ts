import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { getSettings } from "../../../../lib/settings";
import { ensureEventsTable } from "../../../../lib/events";
export async function GET(request:Request){
  const admin=await requestAdmin(request);
  if(!admin?.appearance)return Response.json({error:"Tidak diizinkan"},{status:403});
  await ensureEventsTable();
  const [settings,members,events]=await Promise.all([
    getSettings(),
    env.DB.prepare("SELECT id,team_name AS teamName FROM community_members WHERE active=1 AND (membership_end='' OR membership_end>=date('now')) ORDER BY sort_order,team_name").all(),
    env.DB.prepare("SELECT id,title FROM events WHERE deleted_at='' ORDER BY start_date DESC,id DESC").all(),
  ]);
  return Response.json({settings,members:members.results,events:events.results});
}
