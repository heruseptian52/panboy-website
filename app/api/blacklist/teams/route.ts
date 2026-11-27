import {env} from "cloudflare:workers";
export async function GET(){
 const rows=await env.DB.prepare("SELECT team_name AS name FROM community_members WHERE active=1 AND (membership_end='' OR membership_end>=date('now')) ORDER BY team_name COLLATE NOCASE ASC LIMIT 2000").all<{name:string}>();
 return Response.json({teams:(rows.results||[]).map(row=>row.name)},{headers:{"Cache-Control":"public, max-age=60"}});
}
