import {env} from "cloudflare:workers";
import {requestAdmin} from "../../../../lib/admin-auth";
import {ensureSettings} from "../../../../lib/settings";
import {readTemplateCatalog,CATALOG_KEY} from "../../../../lib/leaderboard-catalog";
import {sanitizeCatalog,visibleStyles,roleDefault} from "../../../../lib/leaderboard-style";
const response=(x:unknown,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(r:Request){const a=await requestAdmin(r);if(!a||(!a.isOwner&&!a.leaderboardDesign&&!a.liveObs&&!a.leaderboard))return response({error:"Tidak diizinkan"},403);const catalog=await readTemplateCatalog();return response({visible:visibleStyles(catalog,a.isOwner),defaultId:roleDefault(catalog,a.isOwner),...(a.isOwner?{catalog}: {})})}
export async function PUT(r:Request){const a=await requestAdmin(r);if(!a?.isOwner)return response({error:"Hanya Admin Utama."},403);try{const catalog=sanitizeCatalog(await r.json());await ensureSettings();await env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(CATALOG_KEY,JSON.stringify(catalog),new Date().toISOString()).run();return response({ok:true,catalog})}catch(e){return response({error:(e as Error).message},400)}}
