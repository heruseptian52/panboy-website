import {env} from "cloudflare:workers";
import {ensureRosterTables,hashRosterToken,normalizePlayers,resolveRosterHash} from "../../../lib/event-rosters";
import {syncRosterLogo} from "../../../lib/roster-drive";
import {readOptions, readZones, normalizeTeamPhone} from "../../../lib/roster-options";
const fields = "id,title,deadline,stopped,max_players AS maxPlayers,site_event_id AS siteEventId,max_slots AS maxSlots,options_json AS settings";
function publicEvent(row: Record<string,unknown>) {
  const {settings,...event}=row;
  const {groupUrl,excelNicknameEnabled,excelPlayerIdEnabled,publicRegistrationEnabled,...options}=readOptions(String(settings));
  return {...event,options};
}
export async function GET(request: Request) {
  try{return await readRoster(request)}catch(error){if(!/no such (table|column)/i.test(String(error)))throw error;await ensureRosterTables();return readRoster(request)}
}
async function readRoster(request:Request){
  const params = new URL(request.url).searchParams;
  const id = Number(params.get("id"));
  if (!id) {
    const rows=await env.DB.prepare(`SELECT ${fields} FROM roster_events WHERE site_event_id IS NULL AND stopped=0 AND deadline>? ORDER BY id DESC LIMIT 100`).bind(new Date().toISOString()).all();
    return Response.json(rows.results.map(publicEvent));
  }
  const event=await env.DB.prepare(`SELECT ${fields} FROM roster_events WHERE id=?`).bind(id).first();
  if (!event) return Response.json({error:"Event tidak ditemukan"},{status:404});
  const token=params.get("token");
  const inviteToken=params.get("invite");
  if(inviteToken){
    const invite=await env.DB.prepare("SELECT team_name AS teamName,entry_id AS entryId FROM roster_invitations WHERE roster_event_id=? AND token_hash=? AND revoked=0").bind(id,await hashRosterToken(inviteToken)).first<{teamName:string;entryId:number|null}>();
    if(!invite)return Response.json({error:"Undangan tidak valid atau telah dibatalkan."},{status:403});
    if(invite.entryId)return Response.json({error:"Team sudah terdaftar. Gunakan link edit pribadi atau minta ke admin."},{status:409});
    return Response.json({...publicEvent(event),teamName:invite.teamName},{headers:{"Cache-Control":"private, no-store"}});
  }
  if (!token) {
    const options = readOptions(String(event.settings));
    if (event.siteEventId && options.publicRegistrationEnabled !== true)
      return Response.json({error:"Pendaftaran event ini menggunakan undangan pribadi."},{status:403});
    if (event.stopped || Date.parse(String(event.deadline)) <= Date.now())
      return Response.json({error:"Pendaftaran event sudah ditutup."},{status:403});
    return Response.json(publicEvent(event),{headers:{"Cache-Control":"no-store"}});
  }
  const entry=await env.DB.prepare("SELECT team_name AS teamName,contact_phone AS contactPhone,players_json AS playersJson,zones_json AS zonesJson,logo_key AS logoKey,logo_name AS logoName FROM roster_entries WHERE event_id=? AND edit_token_hash=?")
    .bind(id,await resolveRosterHash(id,token)).first<{teamName:string;contactPhone:string;playersJson:string;zonesJson:string;logoKey:string;logoName:string}>();
  if(!entry)return Response.json({error:"Tautan edit tidak valid"},{status:403});
  return Response.json({...publicEvent(event),groupUrl:readOptions(String(event.settings)).groupUrl,teamName:entry.teamName,contactPhone:entry.contactPhone,players:JSON.parse(entry.playersJson),zones:JSON.parse(entry.zonesJson),logoUrl:entry.logoKey?`/api/images/${entry.logoKey}`:"",logoName:entry.logoName},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request: Request) {
  await ensureRosterTables();
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>;if(!body||typeof body!=="object"||Array.isArray(body))throw new Error()}catch{return Response.json({error:"Data tidak valid"},{status:400})}
  const eventId=Number(body.eventId),teamName=String(body.teamName||"").trim().replace(/\s+/g," ");
  if(!Number.isSafeInteger(eventId)||eventId<1||teamName.length<2||teamName.length>80)return Response.json({error:"Nama team atau event tidak valid"},{status:400});
  const event=await env.DB.prepare("SELECT options_json AS settings,deadline,stopped,max_players AS maxPlayers,drive_folder_url AS driveFolderUrl,site_event_id AS siteEventId,max_slots AS maxSlots FROM roster_events WHERE id=?").bind(eventId).first<{settings:string;deadline:string;stopped:number;maxPlayers:number;driveFolderUrl:string;siteEventId:number|null;maxSlots:number}>();
  if(!event)return Response.json({error:"Event tidak ditemukan"},{status:404});
  const options=readOptions(event.settings);
  let players, zones, contactPhone;
  try {
    players=options.playersEnabled ? normalizePlayers(body.players,event.maxPlayers) : [];
    zones=options.zonesEnabled ? readZones(body.zones) : [];
    contactPhone=options.phoneEnabled ? normalizeTeamPhone(body.contactPhone) : "";
  } catch(error){return Response.json({error:(error as Error).message},{status:400})}
  if(event.stopped||Date.now()>=Date.parse(event.deadline))return Response.json({error:"Batas pengisian dan edit data sudah ditutup."},{status:403});
  const uploadToken=options.logoEnabled ? String(body.uploadToken||"") : "";
  const upload=uploadToken?await env.DB.prepare("SELECT object_key AS objectKey,file_name AS fileName,consumed,ready,expires_at AS expiresAt FROM roster_uploads WHERE token=? AND event_id=?").bind(uploadToken,eventId).first<{objectKey:string;fileName:string;consumed:number;ready:number;expiresAt:string}>():null;
  if(uploadToken&&(!upload||!upload.ready||upload.consumed||Date.now()>=Date.parse(upload.expiresAt)))return Response.json({error:"Logo belum selesai diupload atau sudah kedaluwarsa. Upload ulang logo."},{status:400});
  const token=String(body.editToken||"");
  const existing=token?await env.DB.prepare("SELECT id,edit_token_hash,logo_key AS logoKey,logo_name AS logoName FROM roster_entries WHERE event_id=? AND edit_token_hash=?").bind(eventId,await resolveRosterHash(eventId,token)).first<{id:number;edit_token_hash:string;logoKey:string}>():null;
  if(existing){
    if(options.logoEnabled&&options.logoRequired&&!upload&&!existing.logoKey)return Response.json({error:"Upload logo team terlebih dahulu."},{status:400});
    try{
      const logoKey=upload?.objectKey||existing.logoKey;
      const updated=await env.DB.prepare("UPDATE roster_entries SET team_name=?,contact_phone=COALESCE(?,contact_phone),players_json=COALESCE(?,players_json),zones_json=COALESCE(?,zones_json),logo_key=?,logo_name=CASE WHEN ?!='' THEN ? ELSE logo_name END,drive_status=CASE WHEN ?!='' THEN 'pending' ELSE drive_status END,drive_file_id=CASE WHEN ?!='' THEN '' ELSE drive_file_id END,updated_at=? WHERE id=?").bind(teamName,options.phoneEnabled?contactPhone:null,options.playersEnabled?JSON.stringify(players):null,options.zonesEnabled?JSON.stringify(zones):null,logoKey,upload?.objectKey||"",upload?.fileName||"",upload?.objectKey||"",upload?.objectKey||"",new Date().toISOString(),existing.id).run();
      if(!updated.meta.changes)return Response.json({error:"Data team sudah dihapus. Daftar kembali melalui form event."},{status:404});
      if(upload){await env.DB.prepare("UPDATE roster_uploads SET consumed=1 WHERE token=?").bind(uploadToken).run();const status=await syncRosterLogo(logoKey,upload.fileName,event.driveFolderUrl,teamName);await env.DB.prepare("UPDATE roster_entries SET drive_status=?,drive_file_id=? WHERE id=?").bind(status.status,status.fileId,existing.id).run()}
      return Response.json({ok:true,id:existing.id,editToken:token});
    }catch{return Response.json({error:"Data team gagal disimpan."},{status:500})}
  }
  if(token)return Response.json({error:"Tautan edit tidak valid."},{status:403});
  const invitationToken=String(body.inviteToken||"");
  const invite=invitationToken?await env.DB.prepare("SELECT id,team_name AS teamName,entry_id AS entryId FROM roster_invitations WHERE roster_event_id=? AND token_hash=? AND revoked=0").bind(eventId,await hashRosterToken(invitationToken)).first<{id:number;teamName:string;entryId:number|null}>():null;
  if (invitationToken && (!invite || invite.entryId || invite.teamName.toLocaleLowerCase("id-ID") !== teamName.toLocaleLowerCase("id-ID")))
    return Response.json({error:"Gunakan link undangan aktif untuk team ini."},{status:403});
  if (!invite && event.siteEventId && options.publicRegistrationEnabled !== true)
    return Response.json({error:"Event ini hanya menerima undangan pribadi."},{status:403});
  if(options.logoEnabled&&options.logoRequired&&!upload)return Response.json({error:"Upload logo team terlebih dahulu."},{status:400});
  const newToken=[...crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,"0")).join("");
  try{
    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
      INSERT INTO roster_entries(event_id,team_name,contact_phone,players_json,zones_json,edit_token_hash,logo_key,logo_name,drive_status,updated_at,invitation_id)
      SELECT event.id,?,?,?,?,?,?,?,?,?,? FROM roster_events event
      WHERE event.id=? AND event.stopped=0 AND event.deadline>?
        AND (event.max_slots<=0 OR (SELECT COUNT(*) FROM roster_entries WHERE event_id=event.id)<event.max_slots)
        AND (
          EXISTS (SELECT 1 FROM roster_invitations WHERE roster_event_id=event.id AND id=? AND token_hash=? AND revoked=0 AND entry_id IS NULL)
          OR (? IS NULL AND (event.site_event_id IS NULL OR
            CASE WHEN json_valid(event.options_json) THEN json_type(event.options_json, '$.publicRegistrationEnabled')='true' ELSE 0 END)
            AND NOT EXISTS (SELECT 1 FROM roster_invitations WHERE roster_event_id=event.id AND team_name=? COLLATE NOCASE AND revoked=0))
        )
    `).bind(invite?.teamName ?? teamName,contactPhone,JSON.stringify(players),JSON.stringify(zones),await hashRosterToken(newToken),
      upload?.objectKey||"",upload?.fileName||"","pending",now,invite?.id??null,eventId,now,
      invite?.id??null,invitationToken?await hashRosterToken(invitationToken):"",invite?.id??null,teamName).run();
    if(!result.meta.changes)return Response.json({error:"Pendaftaran ditutup, slot penuh, atau nama team memakai undangan pribadi. Hubungi admin event."},{status:409});
    const id=result.meta.last_row_id;
    if(invite)await env.DB.prepare("UPDATE roster_invitations SET entry_id=? WHERE id=?").bind(id,invite.id).run();
    if(upload){await env.DB.prepare("UPDATE roster_uploads SET consumed=1 WHERE token=?").bind(uploadToken).run();
    const status=await syncRosterLogo(upload.objectKey,upload.fileName,event.driveFolderUrl,teamName);
    await env.DB.prepare("UPDATE roster_entries SET drive_status=?,drive_file_id=? WHERE id=?").bind(status.status,status.fileId,id).run();}
    return Response.json({ok:true,id,editToken:newToken,groupUrl:options.groupUrl,teamName:invite?.teamName??teamName});
  }catch{return Response.json({error:"Nama team sudah terdaftar atau data gagal disimpan. Coba lagi."},{status:409})}
}
