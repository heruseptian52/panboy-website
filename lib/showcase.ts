import {env} from "cloudflare:workers";
import {blankContent,defaultConfig,publicContent, type ShowcaseAd,type ShowcaseConfig,type PublicShowcase} from "./showcase-model";
let ready=false;
export async function ensureShowcase(){
 if(ready)return;
 await env.DB.batch([
 env.DB.prepare("CREATE TABLE IF NOT EXISTS showcase_ads (id TEXT PRIMARY KEY, internal_name TEXT NOT NULL, member_id INTEGER, status TEXT NOT NULL CHECK(status IN ('draft','published','inactive')), starts_at TEXT NOT NULL DEFAULT '', ends_at TEXT NOT NULL DEFAULT '', priority INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, content_json TEXT NOT NULL, updated_at TEXT NOT NULL)"),
 env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_showcase_active ON showcase_ads(status,priority DESC,sort_order)"),
 env.DB.prepare("CREATE TABLE IF NOT EXISTS showcase_config (id INTEGER PRIMARY KEY CHECK(id=1), config_json TEXT NOT NULL)"),
 env.DB.prepare("CREATE TABLE IF NOT EXISTS showcase_stats (ad_id TEXT NOT NULL,metric TEXT NOT NULL,total INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(ad_id,metric))")]);ready=true;
}
const fields="a.id,a.internal_name AS internalName,a.member_id AS memberId,a.status,a.starts_at AS startsAt,a.ends_at AS endsAt,a.priority,a.sort_order AS sortOrder,a.content_json AS raw";
type Row=Omit<ShowcaseAd,"content">&{raw:string;memberActive?:number};
const parse=(r:Row):ShowcaseAd=>({id:r.id,internalName:r.internalName,memberId:r.memberId,status:r.status,startsAt:r.startsAt,endsAt:r.endsAt,priority:r.priority,sortOrder:r.sortOrder,content:{...blankContent,...JSON.parse(r.raw)}});
export async function getShowcaseConfig(){const row=await env.DB.prepare("SELECT config_json AS raw FROM showcase_config WHERE id=1").first<{raw:string}>();return row?JSON.parse(row.raw) as ShowcaseConfig:defaultConfig;}
export async function listShowcaseAdmin(){await ensureShowcase();const [ads,config,stats]=await Promise.all([env.DB.prepare("SELECT "+fields+" FROM showcase_ads a ORDER BY a.priority DESC,a.sort_order,a.updated_at DESC").all<Row>(),getShowcaseConfig(),env.DB.prepare("SELECT ad_id AS adId,metric,total FROM showcase_stats").all<{adId:string;metric:string;total:number}>()]);return {ads:ads.results.map(parse),config,stats:stats.results}}
export async function getPublicShowcases(id?:string,media?:string):Promise<{ads:PublicShowcase[];whatsapp:string}>{
 // Read only on the public path; before the first migration the section is simply absent.
 try{
 const now=new Date().toISOString(),query=env.DB.prepare("SELECT "+fields+",CASE WHEN m.active=1 AND (m.membership_end='' OR m.membership_end>=date('now')) THEN 1 ELSE 0 END AS memberActive FROM showcase_ads a LEFT JOIN community_members m ON a.member_id=m.id WHERE a.status='published' AND (a.starts_at='' OR a.starts_at<=?) AND (a.ends_at='' OR a.ends_at>?)"+(id?" AND a.id=?":"")+(media?" AND instr(a.content_json,?)>0":"")+" ORDER BY a.priority DESC,a.sort_order,a.id LIMIT 100");
 const [rows,config]=await Promise.all([query.bind(now,now,...(id?[id]:[]),...(media?[media]:[])).all<Row>(),getShowcaseConfig()]);
 return {ads:rows.results.map(r=>publicContent(parse(r),config,!!r.memberActive)).filter((x):x is PublicShowcase=>!!x),whatsapp:config.whatsapp};
 }catch(e){if(!/no such (table|column)/i.test(String(e)))console.error("Showcase read failed",e);return {ads:[],whatsapp:defaultConfig.whatsapp}}
}

export async function isShowcaseMediaPublic(key:string){
 const url="/api/images/"+encodeURIComponent(key);
 const {ads}=await getPublicShowcases(undefined,url);
 return ads.some(({content:c,label})=>[c.logo,c.banner,...(label?[c.labelIcon]:[]),...c.media.map(m=>m.url),...c.bios.flatMap(b=>[b.photo,b.icon]),...c.links.map(l=>l.icon)].includes(url));
}
