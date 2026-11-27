import {env} from "cloudflare:workers";
import {activeMember,digits,safeLink,type BlacklistRow} from "../../../lib/blacklist";
import {getMeta,metaKey} from "./upload/route";
import {getSettings} from "../../../lib/settings";
export async function GET(request:Request) {
  const term = new URL(request.url).searchParams.get("q")?.trim().slice(0,100) || "";
  const query = `%${term.replace(/[\\%_]/g,"\\$&")}%`;
  const rows = await env.DB.prepare(`SELECT b.id,b.player_id AS playerId,b.player_name AS playerName,b.phone AS playerWhatsapp,b.nickname,b.reason,b.evidence_link AS evidenceLink,b.evidence_key AS evidenceKey,b.status,b.created_at AS createdAt,b.approved_at AS approvedAt,((SELECT count(*) FROM blacklist_support s WHERE s.blacklist_id=b.id)+(SELECT count(*) FROM blacklist_feedback f WHERE f.blacklist_id=b.id)) AS supports FROM blacklist_players b JOIN community_members m ON m.id=b.member_id WHERE b.status='approved' AND (?='' OR b.player_id LIKE ? ESCAPE '\\' OR b.player_name LIKE ? ESCAPE '\\' OR b.phone LIKE ? ESCAPE '\\' OR b.nickname LIKE ? ESCAPE '\\') ORDER BY b.approved_at DESC,b.id DESC LIMIT 100`).bind(term,query,query,query,query).all<BlacklistRow>();
  return Response.json({items:(rows.results||[]).map(row=>({...row,playerWhatsapp:row.playerWhatsapp?`${row.playerWhatsapp.slice(0,3)}xxxxx${row.playerWhatsapp.slice(-3)}`:"",evidenceKey:undefined,evidenceLink:row.evidenceLink ? safeLink(row.evidenceLink) : "",hasEvidence:!!row.evidenceKey}))},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request) {
  const form=await request.formData();
  const field=(name:string,max:number)=>String(form.get(name)||"").trim().slice(0,max);
  const playerId=field("playerId",50),team=field("team",120),memberPhone=field("memberPhone",40),reporterName=field("reporterName",120);
  if(!playerId) return Response.json({error:"ID player wajib diisi."},{status:400});
  if(!reporterName)return Response.json({error:"Nama pengaju wajib diisi."},{status:400});
  if(digits(memberPhone).length<9)return Response.json({error:"Isi nomor WhatsApp pengaju yang dapat dihubungi."},{status:400});
  const member=await activeMember(team);
  if(!member)return Response.json({error:"Pilih nama member team yang masih aktif."},{status:403});
  const existing=await env.DB.prepare("SELECT id FROM blacklist_players WHERE player_id=? AND status IN ('pending','approved') LIMIT 1").bind(playerId).first();
  if(existing)return Response.json({error:"ID player ini sudah diajukan atau tercatat."},{status:409});
  const rawLink=field("evidenceLink",1500),link=safeLink(rawLink);
  if(rawLink&&!link)return Response.json({error:"Link bukti harus menggunakan http atau https."},{status:400});
  const uploadId=field("uploadId",36),upload=uploadId?await getMeta(uploadId):null;
  if(uploadId&&(!upload?.evidenceKey||upload.memberId!==member.id))return Response.json({error:"Upload bukti belum selesai atau bukan milik tim ini. Ulangi unggahan."},{status:400});
  const key=upload?.evidenceKey||"";
  try {
    await env.DB.prepare("INSERT INTO blacklist_players(player_id,player_name,phone,nickname,reason,evidence_link,evidence_key,member_id,reporter_name,reporter_whatsapp,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'pending',?)").bind(playerId,field("playerName",120),field("playerWhatsapp",40),field("nickname",120),field("reason",1500),link,key,member.id,reporterName,memberPhone,new Date().toISOString()).run();
  } catch(e) {console.error("blacklist insert failed",e);return Response.json({error:"Gagal menyimpan pengajuan. Silakan coba lagi."},{status:500});}
  if(uploadId)await env.BUCKET.delete(metaKey(uploadId));
  let whatsappUrl="";
  try{const settings=await getSettings(),number=String(settings.memberWhatsapp||"").replace(/\D/g,"");if(number){const notification=`Halo Admin Panboy, saya sudah mengajukan laporan BLACKLIST PLAYER.\n\nPengaju: ${reporterName}\nMember team: ${member.teamName}\nID player: ${playerId}\n\nMohon diperiksa di halaman admin.`;whatsappUrl=`https://wa.me/${number}?text=${encodeURIComponent(notification)}`}}catch{}
  return Response.json({ok:true,message:"Pengajuan tersimpan dan menunggu pemeriksaan admin.",whatsappUrl});
}
