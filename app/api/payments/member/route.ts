import { env } from "cloudflare:workers";
import { createIPaymuPayment, ipaymuConfig } from "../../../../lib/ipaymu";
import { getCommunityMembers } from "../../../../lib/members";
import { getSettings } from "../../../../lib/settings";
import { ensureMemberPayments, invoice, MEMBERSHIP_PACKAGES } from "../../../../lib/member-payments";
const clean=(v:unknown,n=80)=>String(v??"").trim().slice(0,n);
export async function POST(request:Request){
  const b=await request.json() as Record<string,unknown>;
  const memberId=Number(b.memberId), tier=clean(b.tier,1).toUpperCase(), months=Number(b.months);
  if(!memberId||!['S','C'].includes(tier)) return Response.json({error:"Pilih member, tier, dan jumlah bulan yang valid."},{status:400});
  if((await getSettings()).memberIpaymuEnabled==="false")return Response.json({error:"Pembayaran iPaymu sedang dinonaktifkan."},{status:403});
  if(!ipaymuConfig(env).enabled) return Response.json({error:"iPaymu belum dikonfigurasi. Admin perlu mengisi VA dan API Key di Secrets."},{status:503});
  const member=(await getCommunityMembers(false)).find(x=>x.id===memberId); if(!member) return Response.json({error:"Member tidak ditemukan."},{status:404});
  const amount=MEMBERSHIP_PACKAGES[tier]?.[months];
  if(!amount) return Response.json({error:"Paket pembayaran tidak tersedia."},{status:400});
  const orderId=invoice(), buyerName=member.teamName.slice(0,80), whatsapp=String(member.whatsapp||"").replace(/\D/g,"").slice(0,18);
  await ensureMemberPayments();
  try { const origin=new URL(request.url).origin; const payment=await createIPaymuPayment(env,{referenceId:orderId,amount,productName:`Iuran Member Tier ${tier} - ${months} Bulan`,buyerName,buyerPhone:whatsapp});
    const now=new Date().toISOString();
    await env.DB.prepare("INSERT INTO member_payments(invoice,member_id,team_name,buyer_name,whatsapp,tier,months,amount,payment_method,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(orderId,memberId,member.teamName,buyerName,whatsapp,tier,months,amount,"IPAYMU","WAITING_IPAYMU",now,now).run();
    return Response.json({ok:true,invoice:orderId,amount,months,tier,payment,provider:"ipaymu",returnUrl:`${origin}/member?payment=success`}); }
  catch(e){ return Response.json({error:e instanceof Error?e.message:"Gagal membuat pembayaran."},{status:502}); }
}
