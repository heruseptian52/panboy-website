import {env} from "cloudflare:workers";
import {requestAdmin} from "../../../../lib/admin-auth";
import {getCasterProfiles} from "../../../../lib/caster-profiles";

async function owner(request:Request){return (await requestAdmin(request))?.services}
function clean(body:Record<string,unknown>){
  const name=String(body.name||"").trim().slice(0,80),photoUrl=String(body.photoUrl||"").trim().slice(0,600),youtubeUrl=String(body.youtubeUrl||"").trim().slice(0,600);
  if(!name||!photoUrl)return {error:"Isi nama dan foto caster."};
  if(!photoUrl.startsWith("/api/images/")&&!/^https:\/\//i.test(photoUrl))return {error:"Foto harus berasal dari upload atau link HTTPS."};
  if(youtubeUrl){try{const u=new URL(youtubeUrl);if(u.protocol!=="https:"||!u.hostname.includes("."))return {error:"Gunakan link HTTPS yang benar."}}catch{return {error:"Gunakan link HTTPS yang benar."}}}
  return {name,photoUrl,youtubeUrl,active:body.active===false||body.active===0?0:1,sortOrder:Math.max(0,Math.min(999,Number(body.sortOrder)||0))};
}
export async function GET(request:Request){if(!await owner(request))return Response.json({error:"Tidak diizinkan"},{status:403});return Response.json(await getCasterProfiles(false))}
export async function POST(request:Request){if(!await owner(request))return Response.json({error:"Tidak diizinkan"},{status:403});const body=await request.json() as Record<string,unknown>,data=clean(body);if("error" in data)return Response.json(data,{status:400});const result=await env.DB.prepare("INSERT INTO caster_profiles(name,photo_url,youtube_url,active,sort_order) VALUES(?,?,?,?,?)").bind(data.name,data.photoUrl,data.youtubeUrl,data.active,data.sortOrder).run();return Response.json({ok:true,id:result.meta.last_row_id})}
export async function PUT(request:Request){if(!await owner(request))return Response.json({error:"Tidak diizinkan"},{status:403});const body=await request.json() as Record<string,unknown>,data=clean(body),id=Number(body.id);if("error" in data)return Response.json(data,{status:400});if(!Number.isSafeInteger(id)||id<1)return Response.json({error:"Caster tidak valid"},{status:400});const result=await env.DB.prepare("UPDATE caster_profiles SET name=?,photo_url=?,youtube_url=?,active=?,sort_order=? WHERE id=?").bind(data.name,data.photoUrl,data.youtubeUrl,data.active,data.sortOrder,id).run();return Response.json({ok:!!result.meta.changes})}
export async function DELETE(request:Request){if(!await owner(request))return Response.json({error:"Tidak diizinkan"},{status:403});const id=Number(new URL(request.url).searchParams.get("id"));if(!Number.isSafeInteger(id)||id<1)return Response.json({error:"Caster tidak valid"},{status:400});await env.DB.prepare("DELETE FROM caster_profiles WHERE id=?").bind(id).run();return Response.json({ok:true})}
