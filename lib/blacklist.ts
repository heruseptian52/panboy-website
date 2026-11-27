import { env } from "cloudflare:workers";

export function digits(value: string) { return value.replace(/\D/g, ""); }
export function samePhone(a: string, b: string) {
  const normalize = (x: string) => { const d = digits(x); return d.startsWith("62") ? "0" + d.slice(2) : d; };
  return normalize(a).length >= 9 && normalize(a) === normalize(b);
}
export async function activeMember(team: string) {
  if (!team.trim()) return null;
  return env.DB.prepare("SELECT id,team_name AS teamName FROM community_members WHERE lower(team_name)=lower(?) AND active=1 AND (membership_end='' OR membership_end>=date('now')) LIMIT 1")
    .bind(team.trim()).first<{id:number;teamName:string}>();
}
export async function verifyMember(team: string, phone: string) {
  if (!team.trim() || !phone.trim()) return null;
  const row = await env.DB.prepare("SELECT id,team_name AS teamName,whatsapp FROM community_members WHERE lower(team_name)=lower(?) AND active=1 AND (membership_end='' OR membership_end>=date('now')) LIMIT 1").bind(team.trim()).first<{id:number;teamName:string;whatsapp:string}>();
  return row && samePhone(row.whatsapp || "",phone) ? row : null;
}
export function safeLink(raw: string) {
  if (!raw) return "";
  try { const u = new URL(raw); return ["https:","http:"].includes(u.protocol) ? u.toString() : ""; } catch { return ""; }
}
export type BlacklistRow = {id:number;playerId:string;playerName:string;playerWhatsapp:string;nickname:string;reason:string;evidenceLink:string;evidenceKey:string;status:string;createdAt:string;approvedAt:string;teamName:string;supports:number};
export function maskedPhone(phone:string) { return phone ? phone.slice(0,3) + "••••" + phone.slice(-3) : ""; }
