import {env} from "cloudflare:workers";
import {normalizeShortDestination,validShortCode} from "../../../lib/short-link";
export async function GET(request:Request,{params}:{params:Promise<{code:string}>}){
 const {code}=await params;if(!validShortCode(code))return new Response("Link tidak ditemukan",{status:404});
 try{const row=await env.DB.prepare("SELECT destination FROM short_links WHERE code=?").bind(code).first<{destination:string}>();const path=normalizeShortDestination(row?.destination);if(!path)return new Response("Link tidak ditemukan",{status:404});return new Response(null,{status:302,headers:{Location:new URL(path,request.url).href,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}})}catch{return new Response("Link tidak ditemukan",{status:404})}
}
