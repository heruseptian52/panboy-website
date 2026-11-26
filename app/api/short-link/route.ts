import {env} from "cloudflare:workers";
import {normalizeShortDestination,shortCode} from "../../../lib/short-link";
import {hashRosterToken,resolveRosterHash} from "../../../lib/event-rosters";
const res=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
let ready=false;
async function ensure(){if(ready)return;await env.DB.prepare("CREATE TABLE IF NOT EXISTS short_links (code TEXT PRIMARY KEY,destination TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL)").run();ready=true}
export async function POST(request:Request){
 try{
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return res({error:"Tidak diizinkan"},403);
 const raw=await request.text();if(raw.length>1000)return res({error:"Link tidak valid"},400);
 const path=normalizeShortDestination(JSON.parse(raw).path);if(!path)return res({error:"Link tidak valid"},400);
 const url=new URL(path,"https://panboy.invalid");let valid:unknown;
 if(url.pathname==="/data-event"){const event=Number(url.searchParams.get("event")),token=url.searchParams.get("token"),invite=url.searchParams.get("invite");
  valid=token?await env.DB.prepare("SELECT id FROM roster_entries WHERE event_id=? AND edit_token_hash=?").bind(event,await resolveRosterHash(event,token)).first():await env.DB.prepare("SELECT id FROM roster_invitations WHERE roster_event_id=? AND token_hash=? AND revoked=0").bind(event,await hashRosterToken(invite!)).first();
 }else if(url.pathname.startsWith("/overlay/live-leaderboard/"))valid=await env.DB.prepare("SELECT scoreboard_id FROM live_leaderboard_configs WHERE overlay_token=?").bind(url.pathname.split("/").pop()).first();
 else if(url.pathname.startsWith("/overlay/leaderboard/"))valid=await env.DB.prepare("SELECT id FROM scoreboards WHERE overlay_token=?").bind(url.pathname.split("/").pop()).first();
 else if(url.pathname.startsWith("/showcase/"))valid=await env.DB.prepare("SELECT id FROM showcase_ads WHERE id=?").bind(url.pathname.split("/").pop()).first();
 if(!valid)return res({error:"Link tidak ditemukan atau tidak aktif"},404);
 await ensure();const known=await env.DB.prepare("SELECT code FROM short_links WHERE destination=?").bind(path).first<{code:string}>();if(known)return res({path:"/s/"+known.code});
 await env.DB.prepare("INSERT INTO short_links(code,destination,created_at) VALUES(?,?,?) ON CONFLICT(destination) DO NOTHING").bind(shortCode(),path,new Date().toISOString()).run();
 const row=await env.DB.prepare("SELECT code FROM short_links WHERE destination=?").bind(path).first<{code:string}>();return row?res({path:"/s/"+row.code}):res({error:"Gagal membuat link"},500);
 }catch{return res({error:"Gagal membuat link singkat"},400)}
}
