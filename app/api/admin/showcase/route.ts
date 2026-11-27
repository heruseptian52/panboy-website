import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../lib/admin-auth";
import {getCommunityMembers} from "../../../../lib/members";
import {ensureShowcase,listShowcaseAdmin} from "../../../../lib/showcase";
import {normalizeAd,normalizeConfig,publicContent,defaultConfig} from "../../../../lib/showcase-model";
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){
 if(!await requirePermission(request,"appearance"))return response({error:"Tidak diizinkan."},403);
 const [data,members]=await Promise.all([listShowcaseAdmin(),getCommunityMembers(false)]);
 return response({...data,members:members.map(m=>({id:m.id,name:m.teamName,logo:m.logoUrl,active:m.active&&(!m.membershipEnd||m.membershipEnd>=new Date().toISOString().slice(0,10))}))});
}
export async function POST(request:Request){
 if(!await requirePermission(request,"appearance"))return response({error:"Tidak diizinkan."},403);
 await ensureShowcase();
 try{
 const raw=await request.text();if(raw.length>400000)return response({error:"Konten terlalu besar."},413);
 const body=JSON.parse(raw);
 if(body.action==="config"){const config=normalizeConfig(body.config);await env.DB.prepare("INSERT INTO showcase_config(id,config_json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET config_json=excluded.config_json").bind(JSON.stringify(config)).run();return response({ok:true})}
 if(body.action==="delete"){const id=String(body.id||"");await env.DB.batch([env.DB.prepare("DELETE FROM showcase_stats WHERE ad_id=?").bind(id),env.DB.prepare("DELETE FROM showcase_ads WHERE id=?").bind(id)]);return response({ok:true})}
 if(body.action!=="save")return response({error:"Aksi tidak valid."},400);
 const ad=normalizeAd(body.ad);
 if(ad.memberId&&!await env.DB.prepare("SELECT id FROM community_members WHERE id=?").bind(ad.memberId).first())return response({error:"Member tidak ditemukan."},400);
 if(ad.status==="published"&&!ad.content.consentConfirmed)return response({error:"Konfirmasi izin publikasi materi dan informasi terlebih dahulu."},400);
 if(ad.status==="published"&&!publicContent(ad,defaultConfig,false))return response({error:"Tambahkan minimal satu konten sebelum publikasi."},400);
 await env.DB.prepare("INSERT INTO showcase_ads(id,internal_name,member_id,status,starts_at,ends_at,priority,sort_order,content_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET internal_name=excluded.internal_name,member_id=excluded.member_id,status=excluded.status,starts_at=excluded.starts_at,ends_at=excluded.ends_at,priority=excluded.priority,sort_order=excluded.sort_order,content_json=excluded.content_json,updated_at=excluded.updated_at").bind(ad.id,ad.internalName,ad.memberId,ad.status,ad.startsAt,ad.endsAt,ad.priority,ad.sortOrder,JSON.stringify(ad.content),new Date().toISOString()).run();
 return response({ok:true,id:ad.id});
 }catch(e){return response({error:e instanceof Error?e.message:"Gagal menyimpan."},400)}
}
