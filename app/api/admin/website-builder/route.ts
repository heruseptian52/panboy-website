import {env} from "cloudflare:workers";
import {requestAdmin} from "../../../../lib/admin-auth";
import {readBuilder,ensureBuilder} from "../../../../lib/website-builder";
import {parseBlocks} from "../../../../lib/website-builder-model";
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(r:Request){
 if(!(await requestAdmin(r))?.isOwner)return response({error:"Khusus Admin Utama"},403);
 try{await ensureBuilder();return response(await readBuilder());}catch{return response({error:"Gagal memuat pengaturan."},503);}
}
export async function PUT(r:Request){
 if(!(await requestAdmin(r))?.isOwner)return response({error:"Khusus Admin Utama"},403);
 if(r.headers.get("origin")!==new URL(r.url).origin)return response({error:"Origin tidak valid."},403);
 let body:any,blocks;
 try{body=await r.json();blocks=parseBlocks(body.blocks);}catch{return response({error:"Data tidak valid. Periksa judul dan link."},400);}
 try{
  await ensureBuilder();const old=await readBuilder();
  if(body.version!==old.version)return response({error:"Versi berubah. Muat ulang pengaturan."},409);
  const next={blocks,version:new Date().toISOString(),history:[{version:old.version||"Awal",blocks:old.blocks},...old.history].slice(0,10)};
  const result=old.version?await env.DB.prepare("UPDATE website_builder_state SET value=?,updated_at=? WHERE id=1 AND updated_at=?").bind(JSON.stringify(next),next.version,old.version).run():await env.DB.prepare("INSERT OR IGNORE INTO website_builder_state(id,value,updated_at) VALUES(1,?,?)").bind(JSON.stringify(next),next.version).run();
  if(!result.meta.changes)return response({error:"Versi berubah. Muat ulang pengaturan."},409);
  return response(next);
 }catch{return response({error:"Gagal menyimpan pengaturan."},503);}
}
