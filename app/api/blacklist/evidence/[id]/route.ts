import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../../lib/admin-auth";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;const row=await env.DB.prepare("SELECT evidence_key AS evidenceKey,status FROM blacklist_players WHERE id=?").bind(Number(id)).first<{evidenceKey:string;status:string}>();
 if(!row?.evidenceKey||row.status!=="approved"&&!await requirePermission(request,"blacklist"))return new Response("Tidak ditemukan",{status:404});
 const file=await env.BUCKET.get(row.evidenceKey);if(!file)return new Response("Tidak ditemukan",{status:404});
 return new Response(file.body,{headers:{"Content-Type":file.httpMetadata?.contentType||"application/octet-stream","Content-Disposition":"inline","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
