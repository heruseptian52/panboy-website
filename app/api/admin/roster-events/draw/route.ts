import {zipSync,strToU8} from "fflate";
import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../../lib/admin-auth";
import {ensureRosterTables} from "../../../../../lib/event-rosters";
import {drawRoster,groupLabel} from "../../../../../lib/roster-draw";

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
  const saved=await result(id);if(new URL(request.url).searchParams.get("format")==="xlsx"){
 const esc=(s:unknown)=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 const rows=[["GRUP","SLOT","TEAM"],...saved.assignments.filter(x=>!x.removed).sort((a,b)=>a.group-b.group||a.slot-b.slot).map(x=>[groupLabel(x.group),String(x.slot+3),x.teamName])];
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>'<c r="'+String.fromCharCode(65+j)+(i+1)+'" t="inlineStr"><is><t>'+esc(v)+'</t></is></c>').join("")+'</row>').join("")+'</sheetData><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="1"/></worksheet>';
 const xml=(x:string)=>strToU8('<?xml version="1.0" encoding="UTF-8"?>'+x);
 const zip=zipSync({"[Content_Types].xml":xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),"_rels/.rels":xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),"xl/workbook.xml":xml('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Pembagian Grup" sheetId="1" r:id="rId1"/></sheets></workbook>'),"xl/_rels/workbook.xml.rels":xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),"xl/worksheets/sheet1.xml":xml(sheet)});
 return new Response(zip,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":"attachment; filename=grup-event-"+id+".xlsx","Cache-Control":"private,no-store"}});
 }return Response.json(saved,{headers:{"Cache-Control":"private,no-store"}});
}
export async function POST(request:Request){
  if(!await guard(request))return Response.json({error:"Tidak diizinkan"},{status:403});
  await ensureRosterTables();const body=await request.json() as {eventId?:number;groupCount?:number;moveId?:number;targetGroup?:number};const id=Number(body.eventId);
  if(!Number.isSafeInteger(id)||id<1||!await roster(id))return Response.json({error:"Event tidak ditemukan"},{status:404});
  const current=await teams(id);if(!current.length)return Response.json({error:"Belum ada team yang mengisi data."},{status:400});
  if(body.moveId){const saved=await result(id),group=Number(body.targetGroup),row=saved.assignments.find(x=>x.id===body.moveId&&!x.removed);if(!row||!Number.isInteger(group)||group<0||group>=saved.groupCount)return Response.json({error:"Pilih grup dan team yang valid."},{status:400});const assignments=saved.assignments.map(x=>x.id===row.id?{...x,group,slot:10000}:x).sort((a,b)=>a.group-b.group||a.slot-b.slot);const slots=new Map<number,number>();for(const x of assignments){x.slot=slots.get(x.group)||0;slots.set(x.group,x.slot+1)}await env.DB.prepare("UPDATE roster_draws SET assignments_json=?,updated_at=? WHERE event_id=? AND updated_at=?").bind(JSON.stringify(assignments),new Date().toISOString(),id,saved.updatedAt).run();return Response.json(await result(id),{headers:{"Cache-Control":"private,no-store"}})}
  const count=Number(body.groupCount)||Math.ceil(current.length/20);
  if(!Number.isSafeInteger(count)||count<1||count>50)return Response.json({error:"Jumlah grup harus 1–50."},{status:400});
  const assignments=drawRoster(current,count);
  await env.DB.prepare("INSERT INTO roster_draws(event_id,group_count,assignments_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET group_count=excluded.group_count,assignments_json=excluded.assignments_json,updated_at=excluded.updated_at").bind(id,Math.min(count,current.length),JSON.stringify(assignments),new Date().toISOString()).run();
  return Response.json(await result(id),{headers:{"Cache-Control":"private, no-store"}});
}
