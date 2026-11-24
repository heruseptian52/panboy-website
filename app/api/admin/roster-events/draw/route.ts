import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../../lib/admin-auth";
import {ensureRosterTables} from "../../../../../lib/event-rosters";
import {drawRoster} from "../../../../../lib/roster-draw";

async function guard(request:Request){return await requirePermission(request,"events")}
async function roster(id:number){return env.DB.prepare("SELECT id,title FROM roster_events WHERE id=?").bind(id).first<{id:number;title:string}>()}
async function teams(id:number){const rows=await env.DB.prepare("SELECT id,team_name AS teamName FROM roster_entries WHERE event_id=? ORDER BY id").bind(id).all<{id:number;teamName:string}>();return rows.results}
async function result(id:number){
  const [saved,current]=await Promise.all([env.DB.prepare("SELECT group_count AS groupCount,assignments_json AS assignmentsJson,updated_at AS updatedAt FROM roster_draws WHERE event_id=?").bind(id).first<{groupCount:number;assignmentsJson:string;updatedAt:string}>(),teams(id)]);
  const assigned=saved?JSON.parse(saved.assignmentsJson) as {id:number;teamName:string;group:number;slot:number}[]:[];
  const live=new Map(current.map((team:{id:number;teamName:string})=>[team.id,team.teamName]));
  const included=new Set(assigned.map(team=>team.id));
  return {groupCount:saved?.groupCount||0,updatedAt:saved?.updatedAt||null,assignments:assigned.map(team=>({...team,teamName:live.get(team.id)||team.teamName,removed:!live.has(team.id)})),pending:current.filter((team:{id:number})=>!included.has(team.id)),teamCount:current.length};
}
export async function GET(request:Request){
  if(!await guard(request))return Response.json({error:"Tidak diizinkan"},{status:403});
  await ensureRosterTables();const id=Number(new URL(request.url).searchParams.get("eventId"));
  if(!Number.isSafeInteger(id)||id<1||!await roster(id))return Response.json({error:"Event tidak ditemukan"},{status:404});
  return Response.json(await result(id),{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request){
  if(!await guard(request))return Response.json({error:"Tidak diizinkan"},{status:403});
  await ensureRosterTables();const body=await request.json() as {eventId?:number;groupCount?:number};const id=Number(body.eventId);
  if(!Number.isSafeInteger(id)||id<1||!await roster(id))return Response.json({error:"Event tidak ditemukan"},{status:404});
  const current=await teams(id);if(!current.length)return Response.json({error:"Belum ada team yang mengisi data."},{status:400});
  const count=Number(body.groupCount)||Math.ceil(current.length/20);
  if(!Number.isSafeInteger(count)||count<1||count>50)return Response.json({error:"Jumlah grup harus 1–50."},{status:400});
  const assignments=drawRoster(current,count);
  await env.DB.prepare("INSERT INTO roster_draws(event_id,group_count,assignments_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET group_count=excluded.group_count,assignments_json=excluded.assignments_json,updated_at=excluded.updated_at").bind(id,Math.min(count,current.length),JSON.stringify(assignments),new Date().toISOString()).run();
  return Response.json(await result(id),{headers:{"Cache-Control":"private, no-store"}});
}
