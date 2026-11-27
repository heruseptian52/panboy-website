import {env} from "cloudflare:workers";
import {marketDefaults,normalizeSettings,validateData,mediaKey,fields,type MarketKind,type MarketSettings} from "./market-model";
import {verifyMember} from "./blacklist";
import {hashRosterToken} from "./event-rosters";
let ready:Promise<void>|undefined;
export function ensureMarket(){return ready??=(async()=>{
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS esports_market_settings(id INTEGER PRIMARY KEY CHECK(id=1),settings TEXT NOT NULL DEFAULT '{}')").run();
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS esports_market(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL CHECK(kind IN ('player','team')),draft TEXT NOT NULL,published TEXT,token_hash TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'pending',reason TEXT NOT NULL DEFAULT '',visible INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,start_at TEXT NOT NULL DEFAULT '',end_at TEXT NOT NULL DEFAULT '',member_id INTEGER,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
 await env.DB.prepare("CREATE INDEX IF NOT EXISTS esports_market_status_idx ON esports_market(status,visible,sort_order)").run();
})().catch(e=>{ready=undefined;throw e})}
export async function settings(){await ensureMarket();const row=await env.DB.prepare("SELECT settings FROM esports_market_settings WHERE id=1").first<{settings:string}>();return row?normalizeSettings(JSON.parse(row.settings)):marketDefaults}
export const liveWhere="published IS NOT NULL AND visible=1 AND (start_at='' OR start_at<=?) AND (end_at='' OR end_at>?)";
export async function publicMarket(s:MarketSettings){const now=new Date().toISOString();const rows=await env.DB.prepare("SELECT id,kind,published,start_at,end_at FROM esports_market WHERE "+liveWhere+" ORDER BY sort_order,id DESC LIMIT 300").bind(now,now).all<any>();return rows.results.filter((r:any)=>s[r.kind as MarketKind]).map((r:any)=>({id:r.id,kind:r.kind,data:Object.fromEntries(Object.entries(JSON.parse(r.published)).filter(([key])=>fields(r.kind,s).some(f=>f.key===key)))})).filter((r:any)=>!r.data.deadline||r.data.deadline>=now.slice(0,10))}
export async function isMarketMediaPublic(key:string){const s=await settings(),now=new Date().toISOString(),url="/api/images/"+encodeURIComponent(key);const rows=await env.DB.prepare("SELECT kind,published FROM esports_market WHERE "+liveWhere+" AND EXISTS(SELECT 1 FROM json_each(published) WHERE value=?)").bind(now,now,url).all<any>();return rows.results.some((row:any)=>{if(!s[row.kind as MarketKind])return false;const data=JSON.parse(row.published);return (!data.deadline||data.deadline>=now.slice(0,10))&&fields(row.kind,s).some(f=>mediaKey(String(data[f.key]||""))===key)})}
export async function isMarketMediaPrivate(key:string,token:string){const row=await privateSubmission(token);return !!row&&Object.values(JSON.parse(row.draft)).some(v=>mediaKey(String(v))===key)}
export async function cleanSubmission(kind:MarketKind,raw:any,s:MarketSettings){const data=validateData(kind,raw,s);for(const value of Object.values(data)){const key=mediaKey(value);if(key&&!await env.BUCKET.head(key))throw Error("Media tidak ditemukan, unggah ulang.");}return data}
export async function privateSubmission(token:string){if(!/^[a-f0-9-]{72}$/.test(token))return null;await ensureMarket();return env.DB.prepare("SELECT id,kind,draft,status,reason,member_id FROM esports_market WHERE token_hash=? AND status<>'deleted'").bind(await hashRosterToken(token)).first<any>()}
export async function submitMarket(body:any){const s=await settings(),kind=body.kind as MarketKind;if(body.consent!==true)throw Error("Persetujuan publikasi diperlukan.");if(kind!=="player"&&kind!=="team")throw Error("Pilih kategori.");
 if(!s[kind])throw Error("Form ini sedang ditutup.");
 const existing=body.token?await privateSubmission(String(body.token)):null;if(body.token&&!existing)throw Error("Tautan edit tidak valid.");
 if(existing&&existing.kind!==kind)throw Error("Kategori pengajuan tidak dapat diubah.");
 let memberId=existing?.member_id??null;
 if(s.membersOnly&&memberId){const active=await env.DB.prepare("SELECT id FROM community_members WHERE id=? AND active=1 AND (membership_end='' OR membership_end>=date('now'))").bind(memberId).first();if(!active)memberId=null}
 if(s.membersOnly&&!memberId){const m=await verifyMember(String(body.memberTeam||""),String(body.memberPhone||""));if(!m)throw Error("Verifikasi member aktif gagal.");memberId=m.id}
 const data=await cleanSubmission(kind,body.data,s),now=new Date().toISOString();
 if(existing){await env.DB.prepare("UPDATE esports_market SET draft=?,status='pending',reason='',member_id=?,updated_at=? WHERE id=?").bind(JSON.stringify(data),memberId,now,existing.id).run();return {id:existing.id,token:body.token}}
 const token=crypto.randomUUID()+crypto.randomUUID();const r=await env.DB.prepare("INSERT INTO esports_market(kind,draft,token_hash,member_id,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(kind,JSON.stringify(data),await hashRosterToken(token),memberId,now,now).run();return{id:r.meta.last_row_id,token}}
export async function blacklistMatch(id:string,details=false){if(!/^\d{5,20}$/.test(id))return null;return env.DB.prepare("SELECT id,player_id AS playerId,nickname,reason"+(details?",evidence_link AS evidenceLink,evidence_key AS evidenceKey":"")+" FROM blacklist_players WHERE player_id=? AND status='approved' ORDER BY id DESC LIMIT 1").bind(id).first<any>()}
