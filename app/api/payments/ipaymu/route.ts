import {env} from "cloudflare:workers";
import {ipaymuConfig,validIPaymuSignature} from "../../../../lib/ipaymu";
import {addMonths,ensureMemberPayments,isoDate,MEMBERSHIP_PACKAGES} from "../../../../lib/member-payments";

const text=(v:unknown,n=120)=>String(v??"").trim().slice(0,n);
function parseBody(raw:string,contentType:string){
  if(contentType.includes("application/json")){try{return JSON.parse(raw) as Record<string,unknown>}catch{return null}}
  const params=new URLSearchParams(raw),body:Record<string,unknown>={};params.forEach((value,key)=>{body[key]=value});return Object.keys(body).length?body:null;
}
function pick(body:Record<string,unknown>,keys:string[]){for(const key of keys)if(body[key]!==undefined&&body[key]!==null&&String(body[key]).trim()!=="")return body[key];return ""}

export async function POST(request:Request){
  const config=ipaymuConfig(env);
  if(!config.va)return Response.json({error:"iPaymu belum dikonfigurasi."},{status:503});
  const raw=await request.text(),signature=request.headers.get("x-signature")||"";
  const body=parseBody(raw,request.headers.get("content-type")||"");
  if(!body)return Response.json({error:"Payload tidak valid."},{status:400});
  if(!(await validIPaymuSignature(body,signature,config.va)))return Response.json({error:"Signature tidak valid."},{status:401});
  await ensureMemberPayments();
  const reference=text(pick(body,["referenceId","reference_id","order_id","reference"]),100);
  const providerTransactionId=text(pick(body,["trx_id","transactionId","transaction_id","payment_no","paymentNo"]),100);
  const providerStatus=text(pick(body,["status","transactionStatus","transaction_status","status_code"]),40).toLowerCase();
  const paidStatuses=new Set(["1","200","success","paid","completed","settlement","berhasil"]);
  if(!paidStatuses.has(providerStatus))return Response.json({ok:true,processed:false,status:providerStatus||"unknown"});
  if(!reference.startsWith("PB-MEMBER-"))return Response.json({ok:true,processed:false});
  const row=await env.DB.prepare("SELECT * FROM member_payments WHERE invoice=?").bind(reference).first<any>();
  if(!row)return Response.json({error:"Invoice tidak ditemukan."},{status:404});
  if(row.status==="LUNAS")return Response.json({ok:true,processed:false,duplicate:true});
  if(row.status!=="WAITING_IPAYMU"||String(row.payment_method).toUpperCase()!=="IPAYMU")return Response.json({error:"Status atau metode pembayaran tidak sesuai."},{status:409});
  const expected=MEMBERSHIP_PACKAGES[String(row.tier||"C").toUpperCase()]?.[Number(row.months)];
  if(!expected||expected!==Number(row.amount))return Response.json({error:"Paket atau nominal invoice tidak valid."},{status:409});
  const callbackAmount=Number(pick(body,["amount","total","price","nominal"]));
  if(callbackAmount&&callbackAmount!==Number(row.amount))return Response.json({error:"Nominal pembayaran tidak sesuai."},{status:409});
  if(!providerTransactionId)return Response.json({error:"ID transaksi iPaymu tidak ditemukan."},{status:400});
  const now=new Date(),today=isoDate(now);
  const existing=await env.DB.prepare("SELECT membership_end AS end FROM community_members WHERE id=?").bind(row.member_id).first<{end:string}>();
  const activeEnd=existing?.end&&existing.end>today?new Date(`${existing.end}T00:00:00Z`):now,start=isoDate(activeEnd),end=isoDate(addMonths(activeEnd,Number(row.months))),stamp=now.toISOString();
  try{
    await env.DB.batch([
      env.DB.prepare("UPDATE member_payments SET status='LUNAS',paid_at=?,verified_by='IPAYMU',verified_at=?,membership_start=?,membership_end=?,provider_transaction_id=?,provider_status=?,callback_received_at=?,updated_at=? WHERE invoice=? AND status='WAITING_IPAYMU'").bind(today,stamp,start,end,providerTransactionId,providerStatus,stamp,stamp,reference),
      env.DB.prepare("UPDATE community_members SET active=1,membership_start=?,membership_end=?,membership_tier=?,updated_at=? WHERE id=?").bind(start,end,`TIER ${String(row.tier||"C").toUpperCase()}`,stamp,row.member_id),
    ]);
  }catch{return Response.json({error:"Callback sudah pernah diproses atau data transaksi tidak valid."},{status:409})}
  return Response.json({ok:true,processed:true});
}
