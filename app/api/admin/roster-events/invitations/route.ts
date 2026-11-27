import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../../lib/admin-auth";
import {ensureRosterTables,hashRosterToken} from "../../../../../lib/event-rosters";

const error=(message:string,status=400)=>Response.json({error:message},{status});
function newToken(){return [...crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function POST(request:Request){
 if(!await requirePermission(request,"events"))return error("Tidak diizinkan",403);
 await ensureRosterTables();const body=await request.json() as {eventId?:number;teamName?:string;action?:string;id?:number};
 const eventId=Number(body.eventId),event=await env.DB.prepare("SELECT id,site_event_id AS siteEventId FROM roster_events WHERE id=?").bind(eventId).first<{id:number;siteEventId:number|null}>();
 if(!event?.siteEventId)return error("Hubungkan pendataan ke event website terlebih dahulu.");
 if(body.action==="revoke"||body.action==="regenerate"){
  const invite=await env.DB.prepare("SELECT id,entry_id AS entryId,revoked FROM roster_invitations WHERE id=? AND roster_event_id=?").bind(Number(body.id),eventId).first<{id:number;entryId:number|null;revoked:number}>();
  if(!invite)return error("Undangan tidak ditemukan.",404);
  if(invite.entryId)return error("Team sudah terdaftar. Gunakan Salin Link Edit Team, atau hapus data team untuk membatalkan pendaftaran.",409);
  if(body.action==="revoke"){
   await env.DB.prepare("UPDATE roster_invitations SET revoked=1 WHERE id=?").bind(invite.id).run();return Response.json({ok:true});
  }
  if(invite.revoked)return error("Undangan sudah dibatalkan. Buat undangan baru.",409);
  const token=newToken();await env.DB.prepare("UPDATE roster_invitations SET token_hash=? WHERE id=?").bind(await hashRosterToken(token),invite.id).run();
  return Response.json({ok:true,path:`/data-event?event=${eventId}&invite=${token}`},{headers:{"Cache-Control":"private, no-store"}});
 }
 const teamName=String(body.teamName||"").trim().replace(/\s+/g," ");
 if(teamName.length<2||teamName.length>80)return error("Nama team harus 2 sampai 80 karakter.");
 const existing=await env.DB.prepare("SELECT id FROM roster_entries WHERE event_id=? AND team_name=? COLLATE NOCASE LIMIT 1").bind(eventId,teamName).first();
 if(existing)return error("Team ini sudah mengirim data. Gunakan link edit team.",409);
 const duplicate=await env.DB.prepare("SELECT id FROM roster_invitations WHERE roster_event_id=? AND team_name=? COLLATE NOCASE AND revoked=0 LIMIT 1").bind(eventId,teamName).first();
 if(duplicate)return error("Undangan aktif untuk team ini sudah ada. Pilih Kirim ulang link.",409);
 const token=newToken();await env.DB.prepare("INSERT INTO roster_invitations(roster_event_id,team_name,token_hash,created_at) VALUES(?,?,?,?)").bind(eventId,teamName,await hashRosterToken(token),new Date().toISOString()).run();
 return Response.json({ok:true,path:`/data-event?event=${eventId}&invite=${token}`},{headers:{"Cache-Control":"private, no-store"}});
}
