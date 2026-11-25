import {env} from "cloudflare:workers";
import {getPublicShowcases} from "../../../../lib/showcase";
import {validMetric} from "../../../../lib/showcase-model";
export async function POST(request:Request){
 try{
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return new Response(null,{status:403});
 const text=await request.text();if(text.length>240)return new Response(null,{status:400});
 const {id,key}=JSON.parse(text);
 if(typeof id!=="string"||typeof key!=="string"||!/^[-\w]{1,80}$/.test(id))return new Response(null,{status:400});
 const {ads}=await getPublicShowcases(id);if(!ads[0]||!validMetric(ads[0],key))return new Response(null,{status:404});
 await env.DB.prepare("INSERT INTO showcase_stats(ad_id,metric,total) VALUES(?,?,1) ON CONFLICT(ad_id,metric) DO UPDATE SET total=total+1").bind(id,key).run();
 return new Response(null,{status:204});
 }catch{return new Response(null,{status:400})}
}
