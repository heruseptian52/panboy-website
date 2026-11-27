import {env} from "cloudflare:workers";
import {chunkedImage} from "../../../../lib/chunked-image";
import {settings} from "../../../../lib/esports-market";
const CHUNK=512*1024,MAX=25*1024*1024;
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function POST(r:Request){
 try{const s=await settings();if(!s.player&&!s.team)return bad("Market sedang ditutup.",403);const u=new URL(r.url);if(u.searchParams.get("kind")!=="video")return chunkedImage(r,"market-media",10*1024*1024,true);
 const action=u.searchParams.get("action");if(action==="init"){const b=await r.json() as any,size=Number(b.size),ext=String(b.name||"").split(".").pop()?.toLowerCase()||"";if(!["mp4","webm"].includes(ext)||!Number.isInteger(size)||size<16||size>MAX)return bad("Video MP4/WebM maksimal 25 MB.");const id=crypto.randomUUID();await env.BUCKET.put(`market-temp/${id}/meta`,JSON.stringify({size,ext,parts:Math.ceil(size/CHUNK),created:Date.now()}));return Response.json({uploadId:id,chunkSize:CHUNK})}
 const id=u.searchParams.get("uploadId")||"";if(!/^[a-f0-9-]{36}$/.test(id))return bad("Sesi tidak valid.");const temp=`market-temp/${id}`,obj=await env.BUCKET.get(temp+"/meta");if(!obj)return bad("Sesi tidak ditemukan.",404);const m=await obj.json<any>();if(Date.now()-m.created>3600000)return bad("Sesi kedaluwarsa.",410);
 if(action==="cancel"){await env.BUCKET.delete([temp+"/meta",...Array.from({length:m.parts},(_,i)=>temp+"/part-"+i)]);return Response.json({ok:true})}
 if(action==="chunk"){const i=Number(u.searchParams.get("index")),bytes=new Uint8Array(await r.arrayBuffer());if(!Number.isInteger(i)||i<0||i>=m.parts||bytes.length!==Math.min(CHUNK,m.size-i*CHUNK))return bad("Bagian file tidak lengkap.");if(i===0&&!(m.ext==="mp4"?String.fromCharCode(...bytes.slice(4,8))==="ftyp":bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3))return bad("Isi file bukan video valid.");await env.BUCKET.put(temp+"/part-"+i,bytes);return Response.json({ok:true})}
 if(action==="complete"){if(m.result)return Response.json({url:m.result});const bytes=new Uint8Array(m.size);let offset=0;for(let i=0;i<m.parts;i++){const part=await env.BUCKET.get(temp+"/part-"+i);if(!part)return bad("Bagian video belum lengkap.",409);const v=new Uint8Array(await part.arrayBuffer());bytes.set(v,offset);offset+=v.length}if(offset!==m.size)return bad("Ukuran file tidak sesuai.");const key=`market-media/${crypto.randomUUID()}.${m.ext}`,url="/api/images/"+encodeURIComponent(key);await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:m.ext==="mp4"?"video/mp4":"video/webm",cacheControl:"private,no-store"}});await env.BUCKET.put(temp+"/meta",JSON.stringify({...m,result:url}));await env.BUCKET.delete(Array.from({length:m.parts},(_,i)=>temp+"/part-"+i));return Response.json({url})}
 return bad("Aksi tidak valid.");
 }catch{return bad("Upload gagal. Silakan coba kembali.",503)}
}
