import {env} from "cloudflare:workers";
import {defaultCatalog,sanitizeCatalog,type TemplateCatalog} from "./leaderboard-style";
export const CATALOG_KEY="leaderboard_style_catalog";
export async function readTemplateCatalog():Promise<TemplateCatalog>{
 try{const row=await env.DB.prepare("SELECT value FROM site_settings WHERE key=?").bind(CATALOG_KEY).first<{value:string}>();return row?sanitizeCatalog(JSON.parse(row.value)):defaultCatalog}catch{return defaultCatalog}
}
