import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import { createFinancePdf, type ReportSection } from "../../../../lib/finance-pdf";
import { ensureOtherExpenses } from "../../../../lib/other-expenses";
import { ensureSponsorTable } from "../finance/route";
import { historicalCashTransferred } from "../../../../lib/finance-reclassification";

type OtherExpense={id:number;category:string;itemName:string;amount:number;expenseDate:string;notes:string;proofUrl:string;status:string;cancelReason:string};
async function rows(){await ensureOtherExpenses();return (await env.DB.prepare("SELECT id,category,item_name AS itemName,amount,expense_date AS expenseDate,notes,proof_url AS proofUrl,status,cancel_reason AS cancelReason FROM finance_other_expenses ORDER BY expense_date DESC,id DESC").all<OtherExpense>()).results}
export async function GET(request:Request){
 const admin=await requestAdmin(request);if(!admin?.isOwner)return Response.json({error:"Hanya Admin Utama yang dapat melihat pengeluaran operasional khusus."},{status:403});
 const items=await rows();
 if(new URL(request.url).searchParams.get("format")!=="pdf")return Response.json({items});
 const active=items.filter(x=>x.status==="ACTIVE"),total=active.reduce((n,x)=>n+Number(x.amount),0);
 const sections:ReportSection[]=[{title:"Pengeluaran operasional",columns:["TANGGAL","KATEGORI","JASA / BARANG","JUMLAH"],widths:[75,140,210,94],rows:active.map(x=>[x.expenseDate,x.category,`${x.itemName}${x.notes?` - ${x.notes}`:""}`,Number(x.amount)])}];
 return new Response(createFinancePdf("Laporan pengeluaran operasional",[["Total pengeluaran operasional",total]],sections),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="panboy-pengeluaran-operasional-${new Date().toISOString().slice(0,10)}.pdf"`,"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request){
 const admin=await requestAdmin(request);if(!admin?.isOwner)return Response.json({error:"Hanya Admin Utama yang dapat mencatat pengeluaran ini."},{status:403});
 const body=await request.json() as Record<string,unknown>,action=String(body.action||"add");await ensureOtherExpenses();
 if(action==="cancel"){
  const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);
  if(!Number.isSafeInteger(id)||id<=0||!reason)return Response.json({error:"Isi alasan pembatalan."},{status:400});
  const changed=await env.DB.prepare("UPDATE finance_other_expenses SET status='CANCELLED',cancel_reason=? WHERE id=? AND status='ACTIVE'").bind(reason,id).run();
  if(!changed.meta.changes)return Response.json({error:"Catatan tidak ditemukan atau sudah dibatalkan."},{status:404});
  await audit(admin.email,"BATALKAN PENGELUARAN OPERASIONAL","finance_other_expense",id,reason);
 }else if(action==="add"){
  const category=String(body.category||"").trim().slice(0,80),item=String(body.itemName||"").trim().slice(0,160),amount=Number(body.amount),date=String(body.expenseDate||""),notes=String(body.notes||"").trim().slice(0,500),proof=String(body.proofUrl||"").slice(0,1000);
  if(!category||!item||!Number.isSafeInteger(amount)||amount<=0||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T00:00:00Z`)))return Response.json({error:"Isi kategori, keterangan, nominal, dan tanggal yang benar."},{status:400});
  await ensureSponsorTable();
  const transferred=await env.DB.prepare("SELECT COALESCE(SUM(sponsor_amount+registration_amount),0) AS total FROM finance_operating_transfers WHERE status='ACTIVE'").first<{total:number}>();
  const direct=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_sponsor_income WHERE status='ACTIVE' AND destination='OPERATING'").first<{total:number}>();
  const historical=await historicalCashTransferred();
  const eventSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE funding_source='OPERATING' AND status='ACTIVE'").first<{total:number}>();
  const otherSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_other_expenses WHERE status='ACTIVE'").first<{total:number}>();
  if(amount>Number(transferred?.total||0)+Number(direct?.total||0)+historical-Number(eventSpent?.total||0)-Number(otherSpent?.total||0))return Response.json({error:"Kas operasional tidak cukup untuk pengeluaran ini."},{status:400});
  const result=await env.DB.prepare("INSERT INTO finance_other_expenses(category,item_name,amount,expense_date,notes,proof_url,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(category,item,amount,date,notes,proof,admin.email,new Date().toISOString()).run();
  await audit(admin.email,"TAMBAH PENGELUARAN OPERASIONAL","finance_other_expense",result.meta.last_row_id||"",`${category} • ${item} • Rp${amount}`);
 }else return Response.json({error:"Aksi tidak dikenal."},{status:400});
 return Response.json({items:await rows()});
}
