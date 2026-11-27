import {env} from "cloudflare:workers";
import {emptyBuilder,parseBlocks,type BuilderState} from "./website-builder-model";
export async function ensureBuilder(){await env.DB.prepare("CREATE TABLE IF NOT EXISTS website_builder_state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL, updated_at TEXT NOT NULL)").run();}
export async function readBuilder():Promise<BuilderState>{
 const row=await env.DB.prepare("SELECT value FROM website_builder_state WHERE id=1").first<{value:string}>();
 if(!row)return emptyBuilder;
 const data=JSON.parse(row.value);
 return {blocks:parseBlocks(data.blocks),version:data.version,history:data.history};
}
