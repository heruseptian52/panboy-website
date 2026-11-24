import {env} from "cloudflare:workers";
import {detectUploadedImage} from "../../../../lib/uploaded-image";
import {ensureRosterTables,hashRosterToken,resolveRosterHash} from "../../../../lib/event-rosters";
import {readOptions} from "../../../../lib/roster-options";
const CHUNK_SIZE=256*1024,MAX_SIZE=5*1024*1024;
type Upload={objectKey:string;fileName:string;sizeBytes:number;ready:number;consumed:number;expiresAt:string};
const error=(message:string,status=400)=>Response.json({error:message},{status});
async function activeEvent(id:number){if(!Number.isSafeInteger(id)||id<1)return false;await ensureRosterTables();const e=await env.DB.prepare("SELECT options_json AS settings,deadline,stopped FROM roster_events WHERE id=?").bind(id).first<{settings:string;deadline:string;stopped:number}>();return !!e&&readOptions(e.settings).logoEnabled&&!e.stopped&&Date.now()<Date.parse(e.deadline)}
async function canInitUpload(eventId:number,inviteToken:unknown,editToken:unknown) {
  if (!await activeEvent(eventId)) return false;
  const event=await env.DB.prepare("SELECT site_event_id AS siteEventId,options_json AS settings FROM roster_events WHERE id=?").bind(eventId).first<{siteEventId:number|null;settings:string}>();
  if (!event) return false;
  if (typeof editToken==="string" && editToken && editToken.length<=150) {
    return !!await env.DB.prepare("SELECT id FROM roster_entries WHERE event_id=? AND edit_token_hash=?")
      .bind(eventId,await resolveRosterHash(eventId,editToken)).first();
  }
  if (typeof inviteToken==="string" && inviteToken && inviteToken.length<=150) {
    return !!await env.DB.prepare("SELECT id FROM roster_invitations WHERE roster_event_id=? AND token_hash=? AND revoked=0 AND entry_id IS NULL")
      .bind(eventId,await hashRosterToken(inviteToken)).first();
  }
  return !event.siteEventId || readOptions(event.settings).publicRegistrationEnabled===true;
}
async function getUpload(token:string,eventId:number){return env.DB.prepare("SELECT object_key AS objectKey,file_name AS fileName,size_bytes AS sizeBytes,ready,consumed,expires_at AS expiresAt FROM roster_uploads WHERE token=? AND event_id=?").bind(token,eventId).first<Upload>()}
export async function POST(request:Request){
  const stage=new URL(request.url).searchParams.get("stage");
  if(stage==="init"){
    let body:{eventId?:number;fileName?:string;size?:number;inviteToken?:string;editToken?:string};try{body=await request.json();if(!body||typeof body!=="object")throw new Error()}catch{return error("Data file tidak valid.")}
    const eventId=Number(body.eventId),size=Number(body.size),fileName=String(body.fileName||"").slice(0,150);
    if(!await canInitUpload(eventId,body.inviteToken,body.editToken))return error("Upload logo tidak tersedia untuk tautan ini.",403);
    if(!Number.isInteger(size)||size<1||size>MAX_SIZE)return error("Ukuran file maksimal 5 MB.");
    if(!fileName)return error("Pilih file logo.");
    const token=crypto.randomUUID(),key=`roster-tmp/${eventId}/${token}`,expires=new Date(Date.now()+30*60000).toISOString();
    await env.DB.prepare("INSERT INTO roster_uploads(token,event_id,object_key,file_name,expires_at,consumed,size_bytes,ready) VALUES(?,?,?,?,?,0,?,0)").bind(token,eventId,key,fileName,expires,size).run();
    return Response.json({token,chunkSize:CHUNK_SIZE});
  }
  const token=request.headers.get("x-upload-token")||"",eventId=Number(request.headers.get("x-event-id"));
  if(!token||!await activeEvent(eventId))return error("Upload tidak tersedia untuk event ini.",403);
  const upload=await getUpload(token,eventId);
  if(!upload||upload.consumed||Date.now()>=Date.parse(upload.expiresAt))return error("Sesi upload kedaluwarsa. Pilih file lagi.",403);
  const parts=Math.ceil(upload.sizeBytes/CHUNK_SIZE);
  if(stage==="chunk"){
    if(upload.ready)return error("Upload sudah selesai.");
    const index=Number(request.headers.get("x-chunk-index"));
    if(!Number.isInteger(index)||index<0||index>=parts)return error("Urutan file tidak valid.");
    const expected=index===parts-1?upload.sizeBytes-index*CHUNK_SIZE:CHUNK_SIZE;
    const bytes=new Uint8Array(await request.arrayBuffer());
    if(bytes.length!==expected)return error("Bagian file tidak lengkap. Coba upload ulang.");
    await env.BUCKET.put(`${upload.objectKey}/part-${index}`,bytes);
    return Response.json({ok:true,index});
  }
  if(stage==="finish"){
    if(upload.ready)return Response.json({uploadToken:token,previewUrl:`/api/images/${upload.objectKey}`,fileName:upload.fileName,isImage:/\.(png|jpg|jpeg|webp|gif|avif|bmp)$/i.test(upload.objectKey)});
    const keys=Array.from({length:parts},(_,i)=>`${upload.objectKey}/part-${i}`),pieces:Uint8Array[]=[];
    for(const key of keys){const part=await env.BUCKET.get(key);if(!part)return error("Upload belum lengkap. Coba lagi.");pieces.push(new Uint8Array(await part.arrayBuffer()))}
    const bytes=new Uint8Array(upload.sizeBytes);let offset=0;for(const piece of pieces){bytes.set(piece,offset);offset+=piece.length}
    if(offset!==upload.sizeBytes)return error("Ukuran file tidak sesuai. Coba lagi.");
    const image=detectUploadedImage(bytes),extension=image?.extension||"bin";
    const finalKey=`roster-logos/${eventId}/${crypto.randomUUID()}.${extension}`,contentType=image?.contentType||"application/octet-stream";
    await env.BUCKET.put(finalKey,bytes,{httpMetadata:{contentType}});
    await env.DB.prepare("UPDATE roster_uploads SET object_key=?,ready=1 WHERE token=? AND ready=0").bind(finalKey,token).run();
    await env.BUCKET.delete(keys);
    return Response.json({uploadToken:token,previewUrl:`/api/images/${finalKey}`,fileName:upload.fileName,isImage:!!image});
  }
  return error("Proses upload tidak dikenali.");
}
