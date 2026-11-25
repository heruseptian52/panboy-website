import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../lib/admin-auth";
import {getSettings,ensureSettings} from "../../../../lib/settings";
import {orderHomeMembers,parseMemberOrder} from "../../../../lib/member-home-order";
import {getCommunityMembers} from "../../../../lib/members";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function members(){const rows=await getCommunityMembers(false);return rows.map(m=>({id:m.id,teamName:m.teamName,logoUrl:m.logoUrl,sortOrder:m.sortOrder,active:m.active&&(!m.membershipEnd||m.membershipEnd>=new Date().toISOString().slice(0,10))}))}
export async function GET(request:Request){
 if(!await requirePermission(request,"appearance"))return json({error:"Tidak diizinkan."},403);
 const [rows,settings]=await Promise.all([members(),getSettings()]);
 return json({members:orderHomeMembers(rows,settings.featuredMemberOrder,settings.featuredMemberId)});
}
export async function PUT(request:Request){
 if(!await requirePermission(request,"appearance"))return json({error:"Tidak diizinkan."},403);
 try{
  const {ids}=await request.json();const order=Array.isArray(ids)?parseMemberOrder(JSON.stringify(ids)):null;
  if(!order)return json({error:"Urutan member tidak valid."},400);
  const rows=await members(),known=new Set(rows.map(m=>m.id));
  if(order.some(id=>!known.has(id)))return json({error:"Daftar member berubah. Muat ulang pengaturan urutan."},409);
  await ensureSettings();
  await env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES('featuredMemberOrder',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(order),new Date().toISOString()).run();
  return json({ok:true});
 }catch{return json({error:"Urutan member gagal disimpan."},400)}
}
