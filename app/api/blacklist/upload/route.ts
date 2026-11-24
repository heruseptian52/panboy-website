import {env} from "cloudflare:workers";
import {activeMember} from "../../../../lib/blacklist";
const CHUNK=512*1024,MAX=5*1024*1024;
type Meta={memberId:number;size:number;type:string;extension:string;parts:number;createdAt:number;evidenceKey?:string};
const validId=(id:string)=>/^[0-9a-f-]{36}$/.test(id);
const metaKey=(id:string)=>`blacklist-temp/${id}/meta.json`;
async function getMeta(id:string){if(!validId(id))return null;const o=await env.BUCKET.get(metaKey(id));if(!o)return null;const m=await o.json<Meta>();return Date.now()-m.createdAt<3600000?m:null}
export async function POST(request:Request){
 const url=new URL(request.url),action=url.searchParams.get("action");
 if(action==="init"){
  const b=await request.json() as {team?:string;memberPhone?:string;size?:number;type?:string};
  const member=await activeMember(String(b.team||""));
  if(!member)return Response.json({error:"Pilih nama member team yang masih aktif sebelum mengunggah."},{status:403});
  const size=Number(b.size),type=String(b.type||"");
  const allowed:Record<string,string>={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","application/pdf":"pdf"};
  if(!Number.isInteger(size)||size<1||size>MAX||!allowed[type])return Response.json({error:"File bukti harus JPG, PNG, WebP, atau PDF dengan ukuran maksimal 5 MB."},{status:400});
  const id=crypto.randomUUID(),meta:Meta={memberId:member.id,size,type,extension:allowed[type],parts:Math.ceil(size/CHUNK),createdAt:Date.now()};
  await env.BUCKET.put(metaKey(id),JSON.stringify(meta));return Response.json({uploadId:id,chunkSize:CHUNK,parts:meta.parts});
 }
 const id=url.searchParams.get("uploadId")||"",meta=await getMeta(id);
 if(!meta)return Response.json({error:"Sesi upload tidak ditemukan atau kedaluwarsa."},{status:404});
 if(action==="chunk"){
  const index=Number(url.searchParams.get("index"));if(!Number.isInteger(index)||index<0||index>=meta.parts)return Response.json({error:"Bagian file tidak valid."},{status:400});
  const bytes=new Uint8Array(await request.arrayBuffer()),expected=Math.min(CHUNK,meta.size-index*CHUNK);
  if(bytes.length!==expected)return Response.json({error:"Ukuran bagian file tidak sesuai."},{status:400});
  await env.BUCKET.put(`blacklist-temp/${id}/part-${index}`,bytes);return Response.json({ok:true});
 }
 if(action==="complete"){
  const parts:Uint8Array[]=[];for(let i=0;i<meta.parts;i++){const o=await env.BUCKET.get(`blacklist-temp/${id}/part-${i}`);if(!o)return Response.json({error:`Bagian ${i+1} belum selesai diunggah.`},{status:409});parts.push(new Uint8Array(await o.arrayBuffer()))}
  const bytes=new Uint8Array(meta.size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}
  const valid=meta.extension==="pdf"?new TextDecoder().decode(bytes.slice(0,5))==="%PDF-":meta.extension==="png"?bytes[0]===137&&bytes[1]===80:meta.extension==="jpg"?bytes[0]===255&&bytes[1]===216:bytes[0]===82&&bytes[1]===73&&bytes[8]===87;
  if(!valid)return Response.json({error:"Isi file tidak sesuai format yang dipilih."},{status:400});
  const evidenceKey=`blacklist-evidence/${crypto.randomUUID()}.${meta.extension}`;
  await env.BUCKET.put(evidenceKey,bytes,{httpMetadata:{contentType:meta.type,cacheControl:"private, no-store"}});
  await env.BUCKET.put(metaKey(id),JSON.stringify({...meta,evidenceKey}));
  await env.BUCKET.delete(parts.map((_,i)=>`blacklist-temp/${id}/part-${i}`));
  return Response.json({ok:true});
 }
 return Response.json({error:"Aksi tidak valid."},{status:400});
}
export {getMeta,metaKey};
