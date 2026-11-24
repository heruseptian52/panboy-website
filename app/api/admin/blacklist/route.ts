import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../lib/admin-auth";
export async function GET(request:Request) {
 if(!await requirePermission(request,"blacklist"))return Response.json({error:"Tidak diizinkan"},{status:403});
 const rows=await env.DB.prepare("SELECT b.id,b.player_id AS playerId,b.player_name AS playerName,b.phone AS playerWhatsapp,b.nickname,b.reason,b.evidence_link AS evidenceLink,b.evidence_key AS evidenceKey,b.status,b.created_at AS createdAt,b.approved_at AS approvedAt,m.team_name AS teamName FROM blacklist_players b JOIN community_members m ON m.id=b.member_id ORDER BY CASE WHEN b.status='pending' THEN 0 ELSE 1 END,b.created_at DESC LIMIT 200").all();
 return Response.json({items:rows.results||[]},{headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(request:Request) {
 const admin=await requirePermission(request,"blacklist");if(!admin)return Response.json({error:"Tidak diizinkan"},{status:403});
 const {id,status}=await request.json() as {id:number;status:string};
 if(!Number.isSafeInteger(id)||!['approved','rejected','removed'].includes(status))return Response.json({error:"Data tidak valid"},{status:400});
 const now=new Date().toISOString();
 const result=await env.DB.prepare("UPDATE blacklist_players SET status=?,approved_at=CASE WHEN ?='approved' THEN ? ELSE approved_at END,reviewed_by=? WHERE id=? AND status<>?").bind(status,status,now,admin.email,id,status).run();
 return Response.json({ok:true,changed:result.meta.changes>0});
}
