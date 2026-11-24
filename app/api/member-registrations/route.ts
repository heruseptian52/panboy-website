import { env } from "cloudflare:workers";
import { ensureMemberPayments } from "../../../lib/member-payments";
import { normalizeInstagram, normalizeTiktok } from "../../../lib/member-socials";

export async function POST(request: Request) {
  await ensureMemberPayments();
  const body = await request.json() as Record<string, unknown>;
  const teamName=String(body.teamName||"").trim(), ownerName=String(body.ownerName||"").trim(), managementName=String(body.managementName||"").trim(), whatsapp=String(body.whatsapp||"").replace(/\D/g,"");
  if(!teamName||!whatsapp) return Response.json({error:"Nama team/organizer dan nomor WhatsApp wajib diisi."},{status:400});
  const now=new Date().toISOString(), instagram=normalizeInstagram(String(body.instagram||"")), tiktok=normalizeTiktok(String(body.tiktok||""));
  await env.DB.prepare("INSERT INTO member_registrations(team_name,owner_name,management_name,logo_url,whatsapp,instagram,tiktok,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'PENDING',?,?)").bind(teamName,ownerName,managementName,String(body.logoUrl||"").trim(),whatsapp,instagram.url,tiktok.url,now,now).run();
  return Response.json({ok:true});
}
