import {env} from "cloudflare:workers";
function validId(raw:string){const n=Number(raw);return Number.isSafeInteger(n)&&n>0?n:null}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const id=validId((await params).id);if(!id)return Response.json({error:"Data tidak valid."},{status:400});
 const row=await env.DB.prepare("SELECT id FROM blacklist_players WHERE id=? AND status='approved'").bind(id).first();if(!row)return Response.json({error:"Data tidak ditemukan."},{status:404});
 const comments=await env.DB.prepare("SELECT name,comment,created_at AS createdAt FROM blacklist_feedback WHERE blacklist_id=? AND comment<>'' ORDER BY id DESC LIMIT 50").bind(id).all<{name:string;comment:string;createdAt:string}>();
 return Response.json({comments:comments.results||[]},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const id=validId((await params).id);if(!id)return Response.json({error:"Data tidak valid."},{status:400});
 const body=await request.json() as {visitorToken?:string;name?:string;comment?:string};
 const token=String(body.visitorToken||"").trim(),name=String(body.name||"").trim().slice(0,80),comment=String(body.comment||"").trim().slice(0,500);
 if(!/^[0-9a-f-]{36}$/.test(token))return Response.json({error:"Sesi dukungan tidak valid. Muat ulang halaman."},{status:400});
 if(!name)return Response.json({error:"Isi nama untuk memberi dukungan."},{status:400});
 const row=await env.DB.prepare("SELECT id FROM blacklist_players WHERE id=? AND status='approved'").bind(id).first();if(!row)return Response.json({error:"Data tidak ditemukan."},{status:404});
 const result=await env.DB.prepare("INSERT OR IGNORE INTO blacklist_feedback(blacklist_id,visitor_token,name,comment,created_at) VALUES(?,?,?,?,?)").bind(id,token,name,comment,new Date().toISOString()).run();
 return Response.json({ok:true,added:result.meta.changes>0});
}
