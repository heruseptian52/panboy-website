import {env} from "cloudflare:workers";
import {requestAdmin} from "../../../../lib/admin-auth";
const AUDIO:Record<string,string>={mp3:"audio/mpeg",m4a:"audio/mp4",ogg:"audio/ogg",wav:"audio/wav"},MAX=20*1024*1024,CHUNK=1024*1024;
const bad=(error:string,status=400)=>Response.json({error},{status});
function validId(value:string){return /^[a-f0-9-]{36}$/.test(value)}
function validAudio(b:Uint8Array,ext:string){const ascii=(start:number,len:number)=>String.fromCharCode(...b.slice(start,start+len));return ext==="mp3"?(ascii(0,3)==="ID3"||(b[0]===255&&(b[1]&224)===224)):ext==="m4a"?ascii(4,4)==="ftyp":ext==="ogg"?ascii(0,4)==="OggS":ascii(0,4)==="RIFF"&&ascii(8,4)==="WAVE"}
type Meta={size:number;parts:number;ext:string;type:string;created:number;result?:string};
export async function POST(request:Request){
 const admin=await requestAdmin(request);if(!admin?.appearance)return bad("Tidak diizinkan",403);
 const url=new URL(request.url),action=url.searchParams.get("action");
 try{
 if(action==="init"){const b=await request.json() as any,ext=String(b.name||"").split(".").pop()?.toLowerCase()||"",size=Number(b.size);if(!AUDIO[ext])return bad("Format lagu harus MP3, M4A, OGG, atau WAV");if(!Number.isInteger(size)||size<12||size>MAX||Number(b.parts)!==Math.ceil(size/CHUNK))return bad("Ukuran file atau jumlah bagian tidak valid (maksimal 20 MB).");const uploadId=crypto.randomUUID();await env.BUCKET.put(`temp-music/${uploadId}/meta.json`,JSON.stringify({size,parts:Math.ceil(size/CHUNK),ext,type:AUDIO[ext],created:Date.now()}));return Response.json({uploadId,chunkSize:CHUNK})}
 const id=url.searchParams.get("uploadId")||"";if(!validId(id))return bad("Upload tidak valid");const temp="temp-music/"+id,object=await env.BUCKET.get(temp+"/meta.json");if(!object)return bad("Sesi upload tidak ditemukan",404);const m=await object.json<Meta>();if(Date.now()-m.created>3600000)return bad("Sesi kedaluwarsa.",410);
 if(action==="cancel"){await env.BUCKET.delete([temp+"/meta.json",...Array.from({length:m.parts},(_,i)=>temp+"/part-"+i)]);return Response.json({ok:true})}
 if(action==="chunk"){const index=Number(url.searchParams.get("index")),bytes=new Uint8Array(await request.arrayBuffer());if(!Number.isInteger(index)||index<0||index>=m.parts||bytes.length!==Math.min(CHUNK,m.size-index*CHUNK))return bad("Bagian file tidak lengkap.");if(index===0&&!validAudio(bytes,m.ext))return bad("Isi file tidak sesuai format audio.");await env.BUCKET.put(temp+"/part-"+index,bytes);return Response.json({ok:true})}
 if(action==="complete"){if(m.result)return Response.json({url:m.result});const merged=new Uint8Array(m.size);let offset=0;for(let i=0;i<m.parts;i++){const part=await env.BUCKET.get(temp+"/part-"+i);if(!part)return bad("Bagian lagu "+(i+1)+" belum terunggah.",409);const bytes=new Uint8Array(await part.arrayBuffer());merged.set(bytes,offset);offset+=bytes.length}if(offset!==m.size||!validAudio(merged,m.ext))return bad("File tidak lengkap atau tidak valid.");const key="music/"+crypto.randomUUID()+"."+m.ext,result="/api/images/"+encodeURIComponent(key);await env.BUCKET.put(key,merged,{httpMetadata:{contentType:AUDIO[m.ext]}});await env.BUCKET.put(temp+"/meta.json",JSON.stringify({...m,result}));await env.BUCKET.delete(Array.from({length:m.parts},(_,i)=>temp+"/part-"+i));return Response.json({url:result})}
 return bad("Aksi upload tidak valid");
 }catch{return bad("Upload audio gagal. Coba kembali.",503)}
}
