import { env } from "cloudflare:workers";
import { requirePermission } from "../../../../lib/admin-auth";
import { audit } from "../../../../lib/audit";
import { createFinancePdf, type ReportSection } from "../../../../lib/finance-pdf";
import { createFinanceWorkbook } from "../../../../lib/simple-xlsx";
import { ensureExpenseFundingSource, ensurePeriodCancellation } from "../../../../lib/finance-schema";
import { ensureMemberBillingPreferences } from "../../../../lib/member-billing";
import { ensureOtherExpenses } from "../../../../lib/other-expenses";
import { historicalCashTransferred } from "../../../../lib/finance-reclassification";
import { eventBalances } from "../../../../lib/event-balance";

async function allowed(request: Request) { return requirePermission(request, "finance"); }
const money=(value:unknown)=>Math.max(0,Math.floor(Number(value)||0));
export async function ensureSponsorTable(){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS finance_sponsor_income (id INTEGER PRIMARY KEY AUTOINCREMENT, sponsor_name TEXT NOT NULL, event_name TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL, received_date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ACTIVE', cancel_reason TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL)").run();
 const columns=await env.DB.prepare("PRAGMA table_info(finance_sponsor_income)").all<{name:string}>();
 if(!columns.results.some(x=>x.name==="period_id"))try{await env.DB.prepare("ALTER TABLE finance_sponsor_income ADD COLUMN period_id INTEGER").run()}catch(error){if(!String(error).includes("duplicate column name"))throw error}
 if(!columns.results.some(x=>x.name==="destination"))try{await env.DB.prepare("ALTER TABLE finance_sponsor_income ADD COLUMN destination TEXT NOT NULL DEFAULT 'EVENT'").run()}catch(error){if(!String(error).includes("duplicate column name"))throw error}
 // Attach legacy rows only when their original event matches exactly one active period.
 await env.DB.prepare("UPDATE finance_sponsor_income SET period_id=(SELECT MIN(p.id) FROM finance_periods p WHERE p.status='ACTIVE' AND lower(trim(p.event_name))=lower(trim(finance_sponsor_income.event_name))) WHERE period_id IS NULL AND (SELECT COUNT(*) FROM finance_periods p WHERE p.status='ACTIVE' AND lower(trim(p.event_name))=lower(trim(finance_sponsor_income.event_name)))=1").run();
 // These four October receipts were entered with the name of a cancelled trial period.
 // The live November event uses PANBOY COMMUNITY S1; preserve every original amount and note.
 await env.DB.prepare("UPDATE finance_sponsor_income SET period_id=3,event_name='PANBOY COMMUNITY S1' WHERE period_id IS NULL AND id IN (10,11,12,13) AND status='ACTIVE' AND event_name='PANBOY COMMUNITY SEASON 1' AND received_date='2026-10-22' AND EXISTS(SELECT 1 FROM finance_periods WHERE id=3 AND status='ACTIVE' AND event_name='PANBOY COMMUNITY S1')").run();
 // The Rp400.000 receipt is split between S1 and an unallocated S2 reserve.
 const corrected=await env.DB.prepare("UPDATE finance_sponsor_income SET amount=200000 WHERE id=10 AND period_id=3 AND sponsor_name='Xidaman Neng' AND amount=400000 AND status='ACTIVE' AND notes='BUAT SEASON 1 DAN 2'").run();
 if(corrected.meta.changes)await audit("system","PEMBAGIAN SPONSOR","finance_sponsor",10,"Xidaman Neng: Rp200.000 untuk S1; sisa Rp200.000 dicadangkan untuk S2");
 await ensureOperatingTransfers();
 await ensureXidamanReserve();
 // The Xidaman S2 remainder is cash for general operations until assigned later.
 await env.DB.prepare("UPDATE finance_sponsor_income SET destination='OPERATING',event_name='KAS OPERASIONAL' WHERE id=15 AND sponsor_name='Xidaman Neng' AND amount=200000 AND period_id IS NULL AND status='ACTIVE' AND notes='CADANGAN XIDAMAN S2 DARI SPONSOR #10' AND destination='EVENT'").run();
}
async function ensureRegistrationTable(){await env.DB.prepare("CREATE TABLE IF NOT EXISTS finance_registration_income (id INTEGER PRIMARY KEY AUTOINCREMENT, team_name TEXT NOT NULL, event_name TEXT NOT NULL, amount INTEGER NOT NULL, received_date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ACTIVE', cancel_reason TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL)").run()}
async function ensureOperatingTransfers(){await env.DB.prepare("CREATE TABLE IF NOT EXISTS finance_operating_transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, period_id INTEGER NOT NULL, event_name TEXT NOT NULL, sponsor_amount INTEGER NOT NULL DEFAULT 0, registration_amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ACTIVE', cancel_reason TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL)").run()}
async function ensureXidamanReserve(){
 const marker="CADANGAN XIDAMAN S2 DARI SPONSOR #10";
 await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS finance_xidaman_s2_reserve_once ON finance_sponsor_income(notes) WHERE notes='CADANGAN XIDAMAN S2 DARI SPONSOR #10'").run();
 const [insert,transfer]=await env.DB.batch([
  env.DB.prepare("INSERT INTO finance_sponsor_income(sponsor_name,event_name,period_id,amount,received_date,notes,created_by,created_at) SELECT sponsor_name,'BELUM DIALOKASIKAN',NULL,200000,received_date,?,created_by,datetime('now') FROM finance_sponsor_income WHERE id=10 AND sponsor_name='Xidaman Neng' AND period_id=3 AND amount=200000 AND status='ACTIVE' AND notes='BUAT SEASON 1 DAN 2' AND EXISTS(SELECT 1 FROM finance_operating_transfers WHERE id=2 AND period_id=3 AND sponsor_amount=625000 AND status='ACTIVE') AND NOT EXISTS(SELECT 1 FROM finance_sponsor_income WHERE notes=?)").bind(marker,marker),
  env.DB.prepare("UPDATE finance_operating_transfers SET sponsor_amount=425000 WHERE id=2 AND period_id=3 AND sponsor_amount=625000 AND status='ACTIVE' AND EXISTS(SELECT 1 FROM finance_sponsor_income WHERE notes=? AND amount=200000 AND status='ACTIVE')").bind(marker)
 ]);
 if(insert.meta.changes||transfer.meta.changes)await audit("system","PISAHKAN CADANGAN SPONSOR","finance_sponsor",10,"Xidaman Neng Rp200.000 cadangan belum dialokasikan; pemindahan sponsor S1 Rp625.000 → Rp425.000. Tidak ada uang baru atau transaksi bank.");
}

export async function teamBalances(){
  await ensureMemberBillingPreferences();
  const [members,payments,deductions,duesSetting]=await Promise.all([
    env.DB.prepare("SELECT m.id,m.team_name AS teamName,m.active,m.membership_end AS membershipEnd,COALESCE(b.enabled,1) AS billingEnabled FROM community_members m LEFT JOIN member_billing_preferences b ON b.member_id=m.id ORDER BY m.team_name").all<Record<string,unknown>>(),
    env.DB.prepare("SELECT member_id AS memberId,team_name AS teamName,substr(COALESCE(NULLIF(paid_at,''),created_at),1,7) AS month,SUM(amount) AS total,MAX(tier) AS tier FROM member_payments WHERE status='LUNAS' GROUP BY member_id,lower(team_name),substr(COALESCE(NULLIF(paid_at,''),created_at),1,7)").all<Record<string,unknown>>(),
    env.DB.prepare("SELECT member_id AS memberId,SUM(amount) AS total,MAX(created_at) AS lastAt FROM finance_member_deductions WHERE status='ACTIVE' GROUP BY member_id").all<Record<string,unknown>>(),
    env.DB.prepare("SELECT value FROM site_settings WHERE key='memberDuesJson'").first<{value:string}>()
  ]);
  const paid=new Map<string,Map<string,{total:number;tier:string}>>();
  for(const x of payments.results){const id=Number(x.memberId),key=x.memberId!=null&&id>0?`id:${id}`:`name:${String(x.teamName).trim().toLowerCase()}`,monthly=paid.get(key)||new Map<string,{total:number;tier:string}>(),month=String(x.month),previous=monthly.get(month);monthly.set(month,{total:(previous?.total||0)+money(x.total),tier:String(x.tier||previous?.tier||"C")});paid.set(key,monthly)}
  const used=new Map(deductions.results.map(x=>[Number(x.memberId),{total:money(x.total),lastAt:String(x.lastAt||"")}]))
  let dues:Record<string,{amount?:string;status?:string;tier?:string}>={};try{dues=JSON.parse(duesSetting?.value||"{}")}catch{}
  const today=new Date().toISOString().slice(0,10);
  return members.results.map(x=>{const payment=new Map(paid.get(`id:${x.id}`)||[]);for(const [month,row] of paid.get(`name:${String(x.teamName).trim().toLowerCase()}`)||[]){const previous=payment.get(month);payment.set(month,{total:(previous?.total||0)+row.total,tier:row.tier})}const manual=Object.entries(dues).filter(([key,row])=>key.endsWith(`:${x.id}`)&&row.status==="SUDAH BAYAR"),manualMonths=new Map(manual.map(([key,row])=>[key.split(":")[0],money(row.amount)])),income=[...new Set([...payment.keys(),...manualMonths.keys()])].reduce((n,month)=>n+Math.max(payment.get(month)?.total||0,manualMonths.get(month)||0),0),allocated=used.get(Number(x.id))?.total||0,balance=income-allocated,tier=manual.at(-1)?.[1].tier||[...payment.values()].at(-1)?.tier||"C",billingEnabled=Boolean(x.billingEnabled),active=Boolean(x.active)&&billingEnabled&&(!x.membershipEnd||String(x.membershipEnd)>=today);return {memberId:Number(x.id),teamName:String(x.teamName),tier,active,billingEnabled,totalIncome:income,totalAllocated:allocated,balance,lastAt:used.get(Number(x.id))?.lastAt||"",status:!billingEnabled?"BERHENTI IURAN":!active?"NONAKTIF":balance<0?"TUNGGAKAN":balance>=10000?"TERSEDIA":allocated>0?"SUDAH DIALOKASIKAN":"SALDO TIDAK CUKUP"}});
}

async function snapshot(fullPayments=false){
  await Promise.all([ensureSponsorTable(),ensureRegistrationTable(),ensureOperatingTransfers(),ensureExpenseFundingSource(),ensurePeriodCancellation(),ensureOtherExpenses()]);
  const [periods,expenses,payments,activity,deductions,teams,sponsors,registrations,transfers]=await Promise.all([
    env.DB.prepare("SELECT id,name,event_name AS eventName,month,year,start_date AS startDate,end_date AS endDate,deduction_per_member AS deductionPerMember,published,status,created_at AS createdAt FROM finance_periods ORDER BY year DESC,month DESC,id DESC").all(),
    env.DB.prepare("SELECT id,period_id AS periodId,event_name AS eventName,item_name AS itemName,category,funding_source AS fundingSource,amount,expense_date AS expenseDate,proof_url AS proofUrl,notes,status,cancel_reason AS cancelReason,created_by AS createdBy,created_at AS createdAt FROM finance_expenses ORDER BY expense_date DESC,id DESC").all(),
    env.DB.prepare(`SELECT id,team_name AS teamName,tier,months,amount,status,paid_at AS paidAt,created_at AS createdAt FROM member_payments ORDER BY created_at DESC,id DESC ${fullPayments?"":"LIMIT 500"}`).all(),
    env.DB.prepare("SELECT admin_email AS adminEmail,action,entity_type AS entityType,entity_id AS entityId,details,created_at AS createdAt FROM audit_logs WHERE entity_type LIKE 'finance_%' ORDER BY id DESC LIMIT 200").all(),
    env.DB.prepare("SELECT d.id,d.period_id AS periodId,d.member_id AS memberId,d.team_name AS teamName,d.amount,d.created_at AS createdAt,d.created_by AS createdBy,d.status,d.cancel_reason AS cancelReason,p.name AS periodName,p.event_name AS eventName,p.month,p.year FROM finance_member_deductions d JOIN finance_periods p ON p.id=d.period_id ORDER BY d.created_at DESC,d.id DESC").all(),
    teamBalances(),
    env.DB.prepare("SELECT id,period_id AS periodId,destination,sponsor_name AS sponsorName,event_name AS eventName,amount,received_date AS receivedDate,notes,status,cancel_reason AS cancelReason,created_by AS createdBy,created_at AS createdAt FROM finance_sponsor_income ORDER BY received_date DESC,id DESC").all(),
    env.DB.prepare("SELECT id,team_name AS teamName,event_name AS eventName,amount,received_date AS receivedDate,notes,status,cancel_reason AS cancelReason,created_by AS createdBy,created_at AS createdAt FROM finance_registration_income ORDER BY received_date DESC,id DESC").all(),
    env.DB.prepare("SELECT id,period_id AS periodId,event_name AS eventName,sponsor_amount AS sponsorAmount,registration_amount AS registrationAmount,status,cancel_reason AS cancelReason,created_by AS createdBy,created_at AS createdAt FROM finance_operating_transfers ORDER BY id DESC").all()
  ]);
  const [otherSpentRow,paidTotals,manualSetting,memberTransferred]=await Promise.all([
    env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_other_expenses WHERE status='ACTIVE'").first<{total:number}>(),
    env.DB.prepare("SELECT member_id AS memberId,substr(COALESCE(NULLIF(paid_at,''),created_at),1,7) AS month,COALESCE(SUM(amount),0) AS total FROM member_payments WHERE status='LUNAS' GROUP BY member_id,substr(COALESCE(NULLIF(paid_at,''),created_at),1,7)").all<{memberId:number;month:string;total:number}>(),
    env.DB.prepare("SELECT value FROM site_settings WHERE key='memberDuesJson'").first<{value:string}>(),
    historicalCashTransferred()
  ]);
  const otherSpent=Number(otherSpentRow?.total||0),paidByMonth=new Map<string,number>(paidTotals.results.map(x=>[`${x.month}:${x.memberId}`,money(x.total)])),manualByMonth=new Map<string,number>();
  try{const rows=JSON.parse(manualSetting?.value||"{}") as Record<string,{status?:string;amount?:string}>;for(const [key,row] of Object.entries(rows)){const id=Number(key.split(":")[1]);if(row.status==="SUDAH BAYAR"&&Number.isSafeInteger(id))manualByMonth.set(key,money(row.amount))}}catch{}
  const income=[...new Set<string>([...paidByMonth.keys(),...manualByMonth.keys()])].reduce<number>((sum,key)=>sum+Math.max(paidByMonth.get(key)||0,manualByMonth.get(key)||0),0);
  const activeExpenses=expenses.results.filter(x=>x.status!=="CANCELLED"),sponsorIncome=sponsors.results.filter(x=>x.status!=="CANCELLED").reduce((n,x)=>n+money(x.amount),0),registrationIncome=registrations.results.filter(x=>x.status!=="CANCELLED").reduce((n,x)=>n+money(x.amount),0),spending=activeExpenses.reduce((n,x)=>n+money(x.amount),0)+otherSpent,allocated=deductions.results.filter(x=>x.status!=="CANCELLED").reduce((n,x)=>n+money(x.amount),0);
  const memberSpending=activeExpenses.filter(x=>x.fundingSource==="MEMBER").reduce((n,x)=>n+money(x.amount),0);
  const moved=transfers.results.filter(x=>x.status==="ACTIVE"),sponsorTransferred=moved.reduce((n,x)=>n+money(x.sponsorAmount),0),registrationTransferred=moved.reduce((n,x)=>n+money(x.registrationAmount),0);
  const directOperatingSponsor=sponsors.results.filter(x=>x.status==="ACTIVE"&&x.destination==="OPERATING").reduce((n,x)=>n+money(x.amount),0);
  const sponsorBalance=sponsorIncome-directOperatingSponsor-sponsorTransferred-activeExpenses.filter(x=>x.fundingSource==="SPONSOR").reduce((n,x)=>n+money(x.amount),0),registrationBalance=registrationIncome-registrationTransferred-activeExpenses.filter(x=>x.fundingSource==="REGISTRATION").reduce((n,x)=>n+money(x.amount),0),operatingBalance=sponsorTransferred+registrationTransferred+directOperatingSponsor+memberTransferred-activeExpenses.filter(x=>x.fundingSource==="OPERATING").reduce((n,x)=>n+money(x.amount),0)-otherSpent;
  const memberFunds=income-memberSpending-memberTransferred,operationalCash=sponsorBalance+registrationBalance+operatingBalance;
  const sponsorReserve=sponsors.results.filter(x=>x.status==="ACTIVE"&&x.periodId==null&&x.destination!=="OPERATING").reduce((n,x)=>n+money(x.amount),0);
  const availableTeamBalance=teams.reduce((n,x)=>n+x.balance,0),historicalMemberFunds=memberFunds-availableTeamBalance;
  return {periods:periods.results,expenses:expenses.results,sponsors:sponsors.results,registrations:registrations.results,transfers:transfers.results,payments:payments.results,activity:activity.results,deductions:deductions.results,teams,totals:{income,spending,sponsorIncome,registrationIncome,sponsorBalance,sponsorReserve,registrationBalance,operatingBalance,totalCash:memberFunds+operationalCash,memberFunds,operationalCash,availableTeamBalance,historicalMemberFunds,memberTransferred,directOperatingSponsor,allocated}};
}

export async function GET(request:Request){
  if(!(await allowed(request)))return Response.json({error:"Tidak diizinkan"},{status:403});
  const format=new URL(request.url).searchParams.get("format"),data=await snapshot(format==="pdf"||format==="xlsx");
  const params=new URL(request.url).searchParams,memberOnly=params.get("scope")==="member";
  const eventOnly=params.get("scope")==="event";
  if((memberOnly||eventOnly)&&format){
    const periodId=Number(params.get("periodId"));
    const period=data.periods.find(p=>Number(p.id)===periodId&&p.status==="ACTIVE"&&(!memberOnly||p.published));
    if(!period)return Response.json({error:"Pilih event aktif yang tersedia untuk laporan."},{status:400});
    const expenses=data.expenses.filter(x=>Number(x.periodId)===periodId&&x.status==="ACTIVE");
    const deductions=data.deductions.filter(x=>Number(x.periodId)===periodId&&x.status==="ACTIVE");
    const balances=await eventBalances({id:Number(period.id),startDate:String(period.startDate)},data.teams);
    const eventKey=String(period.eventName).trim().toLowerCase();
    const sponsors=data.sponsors.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===periodId);
    const registrations=data.registrations.filter(x=>x.status==="ACTIVE"&&String(x.eventName).trim().toLowerCase()===eventKey);
    const transfers=data.transfers.filter(x=>Number(x.periodId)===periodId&&x.status==="ACTIVE");
    const sum=(rows:Array<{amount:unknown}>)=>rows.reduce((n,x)=>n+Number(x.amount||0),0);
    const allocated=sum(deductions),spent=sum(expenses),memberSpent=sum(expenses.filter(x=>x.fundingSource==="MEMBER"));
    const sponsorRemaining=sum(sponsors)-sum(expenses.filter(x=>x.fundingSource==="SPONSOR"))-transfers.reduce((n,x)=>n+Number(x.sponsorAmount||0),0);
    const summary:Array<[string,number]>=[["Pemasukan sponsor",sum(sponsors)],["Pemasukan registrasi",sum(registrations)],["Alokasi member",allocated],["Pengeluaran event",spent],["Sisa alokasi member",allocated-memberSpent],["Sisa/selisih dana sponsor",sponsorRemaining]];
    const sections:ReportSection[]=[
      {title:"Rincian keuangan lengkap per event",columns:["TANGGAL","JASA / BARANG","SUMBER","JUMLAH"],widths:[75,240,110,94],rows:expenses.map(x=>[x.expenseDate,`${x.itemName}${x.notes?` - ${x.notes}`:""}`,x.fundingSource,Number(x.amount)])},
      {title:"Pemasukan sponsor per event",columns:["TANGGAL","SPONSOR","KETERANGAN","JUMLAH"],widths:[75,155,195,94],rows:sponsors.map(x=>[x.receivedDate,x.sponsorName,x.notes||"-",Number(x.amount)])},
      {title:"Pemasukan registrasi per event",columns:["TANGGAL","TEAM","KETERANGAN","JUMLAH"],widths:[75,155,195,94],rows:registrations.map(x=>[x.receivedDate,x.teamName,x.notes||"-",Number(x.amount)])},
      {title:"Alokasi member event",columns:["TANGGAL","TEAM","EVENT","JUMLAH"],widths:[75,180,170,94],rows:deductions.map(x=>[String(x.createdAt).slice(0,10),x.teamName,period.eventName,Number(x.amount)])},
      {title:"Saldo member per event",columns:["TEAM","SALDO SEBELUM","POTONG EVENT","SISA AKHIR"],widths:[195,108,108,108],rows:balances.map(x=>[x.teamName,x.opening,x.current,x.closing])},
    ];
    if(transfers.length)sections.splice(4,0,{title:"Pemindahan ke kas operasional",columns:["EVENT","DARI SPONSOR","DARI REGISTRASI"],widths:[250,135,134],rows:transfers.map(x=>[period.eventName,x.sponsorAmount,x.registrationAmount])});
    const filename=`panboy-keuangan-event-${periodId}-${new Date().toISOString().slice(0,10)}`;
    if(format==="pdf")return new Response(createFinancePdf(`Keuangan event: ${period.eventName}`,summary,sections),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}.pdf"`,"Cache-Control":"private, no-store"}});
    if(format==="xlsx"){
      const workbook=createFinanceWorkbook(sections.map(s=>({name:s.title.slice(0,31),headers:s.columns,rows:s.rows,widths:s.widths.map(w=>Math.max(12,Math.round(w/7)))})));
      return new Response(await workbook.arrayBuffer(),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${filename}.xlsx"`,"Cache-Control":"private, no-store"}});
    }
  }
  if(format==="xlsx"){
    const sum=(rows:Array<{amount:unknown}>)=>rows.reduce((n,x)=>n+Number(x.amount||0),0);
    const activeExpenses=data.expenses.filter(x=>x.status==="ACTIVE"),activeSponsors=data.sponsors.filter(x=>x.status==="ACTIVE"),activeRegistrations=data.registrations.filter(x=>x.status==="ACTIVE"),activeDeductions=data.deductions.filter(x=>x.status==="ACTIVE");
    const paymentRows=data.payments.filter(x=>x.status==="LUNAS").map(x=>[(x.paidAt||x.createdAt||"").slice(0,10),"IURAN MEMBER",x.teamName||"",`${x.months||1} bulan`,Number(x.amount),0]);
    const cashRows=[...paymentRows,...activeSponsors.map(x=>[x.receivedDate,"SPONSOR",x.sponsorName,x.eventName||x.notes||"-",Number(x.amount),0]),...activeRegistrations.map(x=>[x.receivedDate,"REGISTRASI",x.teamName,x.eventName,Number(x.amount),0]),...activeExpenses.map(x=>[x.expenseDate,x.fundingSource==="SPONSOR"?"PENGELUARAN SPONSOR":x.fundingSource==="REGISTRATION"?"PENGELUARAN REGISTRASI":x.fundingSource==="OPERATING"?"PENGELUARAN KAS OPERASIONAL":"PENGELUARAN MEMBER",x.eventName,x.itemName,0,Number(x.amount)])].sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
    const workbook=createFinanceWorkbook([
      {name:"RINGKASAN KAS",headers:["KETERANGAN","NOMINAL (RP)"],rows:[["TOTAL IURAN MEMBER",data.totals.income],["TOTAL SPONSOR",data.totals.sponsorIncome],["TOTAL REGISTRASI",data.totals.registrationIncome],["TOTAL PEMASUKAN",data.totals.income+data.totals.sponsorIncome+data.totals.registrationIncome],["TOTAL PENGELUARAN",data.totals.spending],...(data.totals.memberTransferred>0?[["ALIH SALDO HISTORIS KE KAS",data.totals.memberTransferred]]:[]),["SPONSOR LANGSUNG KE KAS",data.totals.directOperatingSponsor],["DANA MEMBER TERSIMPAN",data.totals.memberFunds],["SPONSOR BELUM DIPINDAH",data.totals.sponsorBalance],["REGISTRASI BELUM DIPINDAH",data.totals.registrationBalance],["KAS OPERASIONAL SIAP PAKAI",data.totals.operatingBalance],["TOTAL NON-MEMBER",data.totals.operationalCash],["TOTAL KAS KESELURUHAN",data.totals.totalCash],["SALDO TEAM BELUM DIALOKASIKAN",data.totals.availableTeamBalance]],widths:[46,22]},
      {name:"ARUS KAS",headers:["TANGGAL","JENIS","SUMBER / EVENT","UNTUK APA","MASUK (RP)","KELUAR (RP)"],rows:cashRows,widths:[15,23,32,44,19,19]},
      {name:"SALDO PER TEAM",headers:["NAMA TEAM","TIER","TOTAL IURAN","DIALOKASIKAN","SALDO","STATUS"],rows:data.teams.map(x=>[x.teamName,x.tier,x.totalIncome,x.totalAllocated,x.balance,x.status]),widths:[30,12,20,20,20,24]},
      {name:"ALOKASI TEAM",headers:["TANGGAL","TEAM","PERIODE","EVENT","NOMINAL (RP)","STATUS","ALASAN BATAL"],rows:data.deductions.map(x=>[String(x.createdAt).slice(0,10),x.teamName,x.periodName,x.eventName,Number(x.amount),x.status,x.cancelReason||""]),widths:[15,30,28,32,20,16,40]},
      {name:"PERIODE EVENT",headers:["PERIODE","EVENT","BULAN / TAHUN","ALOKASI MEMBER","PENGELUARAN MEMBER","SPONSOR TERPAKAI","REGISTRASI TERPAKAI","KAS TERPAKAI","SISA MEMBER","STATUS"],rows:data.periods.map(p=>{const a=sum(activeDeductions.filter(x=>Number(x.periodId)===Number(p.id))),s=sum(activeExpenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="MEMBER")),sponsor=sum(activeExpenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="SPONSOR"));const registration=sum(activeExpenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="REGISTRATION")),operating=sum(activeExpenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="OPERATING"));return[p.name,p.eventName,`${p.month}/${p.year}`,a,s,sponsor,registration,operating,a-s,p.status==="CANCELLED"?"BATAL":p.published?"TAYANG":"DRAFT"]}),widths:[28,32,18,20,20,20,20,20,20,16]},
      {name:"PENGELUARAN",headers:["TANGGAL","EVENT","JASA / BARANG","SUMBER DANA","NOMINAL (RP)","STATUS","CATATAN","BUKTI"],rows:data.expenses.map(x=>[x.expenseDate,x.eventName,x.itemName,x.fundingSource,Number(x.amount),x.status,x.cancelReason||x.notes||"",x.proofUrl||""]),widths:[15,32,36,18,19,16,42,40]},
      {name:"PEMASUKAN SPONSOR",headers:["TANGGAL","NAMA SPONSOR","EVENT","NOMINAL (RP)","STATUS","CATATAN"],rows:data.sponsors.map(x=>[x.receivedDate,x.sponsorName,x.eventName,Number(x.amount),x.status,x.cancelReason||x.notes||""]),widths:[15,32,32,19,16,42]},
      {name:"PEMASUKAN REGISTRASI",headers:["TANGGAL","NAMA TEAM","EVENT","NOMINAL (RP)","STATUS","CATATAN"],rows:data.registrations.map(x=>[x.receivedDate,x.teamName,x.eventName,Number(x.amount),x.status,x.cancelReason||x.notes||""]),widths:[15,32,32,19,16,42]},
      {name:"PINDAH KE KAS",headers:["TANGGAL","EVENT","DARI SPONSOR","DARI REGISTRASI","STATUS","ALASAN BATAL"],rows:data.transfers.map(x=>[String(x.createdAt).slice(0,10),x.eventName,Number(x.sponsorAmount),Number(x.registrationAmount),x.status,x.cancelReason||""]),widths:[15,32,20,22,16,42]},
      {name:"PEMBAYARAN MEMBER",headers:["TANGGAL","TEAM","TIER","BULAN","NOMINAL (RP)","STATUS"],rows:data.payments.map(x=>[(x.paidAt||x.createdAt||"").slice(0,10),x.teamName,x.tier,Number(x.months),Number(x.amount),x.status]),widths:[15,32,12,12,19,20]},
    ]);
    return new Response(await workbook.arrayBuffer(),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="panboy-keuangan-lengkap-${new Date().toISOString().slice(0,10)}.xlsx"`,"Cache-Control":"private, no-store"}});
  }
  if(format!=="pdf")return Response.json(data);
  const published=new Set(data.periods.filter(p=>p.published&&p.status==="ACTIVE").map(p=>Number(p.id)));
  const expenses=data.expenses.filter(x=>x.status==="ACTIVE"&&(!memberOnly||(published.has(Number(x.periodId))&&x.fundingSource==="MEMBER")));
  const deductions=data.deductions.filter(x=>x.status==="ACTIVE"&&(!memberOnly||published.has(Number(x.periodId))));
  const sponsorIncome=data.sponsors.filter(x=>x.status==="ACTIVE");
  const periods=data.periods.filter(x=>x.status==="ACTIVE"&&(!memberOnly||published.has(Number(x.id))));
  const total=(rows:Array<{amount:unknown}>)=>rows.reduce((n,x)=>n+Number(x.amount||0),0);
  const sections:ReportSection[]=[
    {title:"Periode dan penggunaan dana",columns:["PERIODE / EVENT","BULAN","IURAN","PAKAI IURAN","PAKAI SPONSOR","PAKAI REGISTRASI","PAKAI KAS","SISA IURAN"],widths:[105,45,57,60,62,70,70,50],rows:periods.map(p=>{const a=total(deductions.filter(x=>Number(x.periodId)===Number(p.id))),s=total(expenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="MEMBER")),sp=total(expenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="SPONSOR"));const reg=total(expenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="REGISTRATION")),kas=total(expenses.filter(x=>Number(x.periodId)===Number(p.id)&&x.fundingSource==="OPERATING"));return [`${p.name} / ${p.eventName}`,`${p.month}/${p.year}`,a,s,sp,reg,kas,a-s]})},
    {title:"Uang dipakai untuk apa",columns:["TANGGAL","EVENT","JASA / BARANG","SUMBER","JUMLAH"],widths:[70,112,166,78,93],rows:expenses.map(x=>[x.expenseDate,x.eventName,`${x.itemName}${x.notes?` - ${x.notes}`:""}`,x.fundingSource,Number(x.amount)])},
    {title:"Alokasi iuran per team",columns:["TANGGAL","TEAM","PERIODE / EVENT","JUMLAH"],widths:[77,165,190,87],rows:deductions.map(x=>[String(x.createdAt).slice(0,10),x.teamName,`${x.periodName} / ${x.eventName}`,Number(x.amount)])},
  ];
  if(!memberOnly){
    sections.unshift({title:"Pemindahan sisa dana ke kas",columns:["TANGGAL","EVENT","DARI SPONSOR","DARI REGISTRASI"],widths:[77,202,120,120],rows:data.transfers.filter(x=>x.status==="ACTIVE").map(x=>[String(x.createdAt).slice(0,10),x.eventName,Number(x.sponsorAmount),Number(x.registrationAmount)])});
    sections.unshift({title:"Pemasukan registrasi",columns:["TANGGAL","TEAM","EVENT / KETERANGAN","JUMLAH"],widths:[77,150,205,87],rows:data.registrations.filter(x=>x.status==="ACTIVE").map(x=>[x.receivedDate,x.teamName,x.eventName,Number(x.amount)])});
    sections.unshift({title:"Pemasukan sponsor",columns:["TANGGAL","SPONSOR","EVENT / KETERANGAN","JUMLAH"],widths:[77,150,205,87],rows:sponsorIncome.map(x=>[x.receivedDate,x.sponsorName,x.eventName||x.notes||"-",Number(x.amount)])});
    sections.push({title:"Saldo setiap team",columns:["TEAM","TIER","IURAN MASUK","DIALOKASIKAN","SALDO"],widths:[181,48,99,99,92],rows:data.teams.map(x=>[x.teamName,x.tier,Number(x.totalIncome),Number(x.totalAllocated),Number(x.balance)])});
  }
  const summary:Array<[string,number]>=memberOnly?[["Total alokasi member",total(deductions)],["Total pengeluaran",total(expenses)],["Sisa alokasi",total(deductions)-total(expenses)]]:[["Iuran masuk",data.totals.income],["Sponsor masuk",data.totals.sponsorIncome],["Registrasi masuk",data.totals.registrationIncome],["Total pengeluaran",data.totals.spending],...(data.totals.memberTransferred>0?[["Alih saldo historis ke kas",data.totals.memberTransferred] as [string,number]]:[]),["Sponsor langsung ke kas",data.totals.directOperatingSponsor],["Dana member tersimpan",data.totals.memberFunds],["Sponsor belum dipindah",data.totals.sponsorBalance],["Registrasi belum dipindah",data.totals.registrationBalance],["Kas operasional siap pakai",data.totals.operatingBalance],["Total kas keseluruhan",data.totals.totalCash]];
  const pdf=createFinancePdf(memberOnly?"Laporan alokasi member":"Rincian keuangan lengkap",summary,sections);
  return new Response(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="panboy-keuangan-${memberOnly?"member-":""}${new Date().toISOString().slice(0,10)}.pdf"`,"Cache-Control":"private, no-store"}});
}

export async function POST(request:Request){
  const admin=await allowed(request);if(!admin)return Response.json({error:"Tidak diizinkan"},{status:403});
  const body=await request.json() as Record<string,unknown>,action=String(body.action||""),now=new Date().toISOString();
  if(action==="closeEvent"){
    const periodId=Number(body.periodId),sponsorAmount=money(body.sponsorAmount),registrationAmount=money(body.registrationAmount);
    if(!Number.isSafeInteger(periodId)||periodId<=0||!Number.isSafeInteger(Number(body.sponsorAmount))||!Number.isSafeInteger(Number(body.registrationAmount))||Number(body.sponsorAmount)<0||Number(body.registrationAmount)<0||sponsorAmount+registrationAmount<=0)return Response.json({error:"Pilih event dan isi nominal sisa dana yang akan dipindah."},{status:400});
    await Promise.all([ensureSponsorTable(),ensureRegistrationTable(),ensureOperatingTransfers(),ensureExpenseFundingSource(),ensurePeriodCancellation()]);
    const period=await env.DB.prepare("SELECT event_name AS eventName,end_date AS endDate FROM finance_periods WHERE id=? AND status='ACTIVE'").bind(periodId).first<{eventName:string;endDate:string}>();
    if(!period)return Response.json({error:"Periode event tidak ditemukan."},{status:404});
    if(period.endDate>now.slice(0,10))return Response.json({error:"Sisa dana dapat dipindahkan setelah tanggal berakhir event."},{status:400});
    const existing=await env.DB.prepare("SELECT id FROM finance_operating_transfers WHERE period_id=? AND status='ACTIVE'").bind(periodId).first();
    if(existing)return Response.json({error:"Sisa dana event ini sudah dipindahkan ke kas operasional."},{status:409});
    const data=await snapshot();
    const eventKey=period.eventName.trim().toLowerCase();
    const eventSponsor=data.sponsors.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===periodId).reduce((n,x)=>n+money(x.amount),0)-data.expenses.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===periodId&&x.fundingSource==="SPONSOR").reduce((n,x)=>n+money(x.amount),0);
    const eventRegistration=data.registrations.filter(x=>x.status==="ACTIVE"&&String(x.eventName).trim().toLowerCase()===eventKey).reduce((n,x)=>n+money(x.amount),0)-data.expenses.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===periodId&&x.fundingSource==="REGISTRATION").reduce((n,x)=>n+money(x.amount),0);
    if(sponsorAmount>Math.min(data.totals.sponsorBalance,eventSponsor)||registrationAmount>Math.min(data.totals.registrationBalance,eventRegistration))return Response.json({error:"Nominal melebihi sisa pemasukan yang tercatat untuk event ini. Periksa nama event pada pemasukan sponsor dan registrasi."},{status:400});
    const result=await env.DB.prepare("INSERT INTO finance_operating_transfers(period_id,event_name,sponsor_amount,registration_amount,created_by,created_at) VALUES(?,?,?,?,?,?)").bind(periodId,period.eventName,sponsorAmount,registrationAmount,admin.email,now).run();
    await audit(admin.email,"PINDAH SISA EVENT KE KAS","finance_operating_transfer",result.meta.last_row_id||"",`${period.eventName} • sponsor Rp${sponsorAmount} • registrasi Rp${registrationAmount}`);
  }else if(action==="cancelOperatingTransfer"){
    const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);
    if(!Number.isSafeInteger(id)||id<=0||!reason)return Response.json({error:"Pilih pemindahan dan isi alasan pembatalan."},{status:400});
    await ensureOperatingTransfers();const data=await snapshot(),transfer=data.transfers.find(x=>Number(x.id)===id&&x.status==="ACTIVE");
    if(!transfer)return Response.json({error:"Pemindahan tidak ditemukan atau sudah dibatalkan."},{status:404});
    if(data.totals.operatingBalance<Number(transfer.sponsorAmount)+Number(transfer.registrationAmount))return Response.json({error:"Kas operasional sudah dipakai. Batalkan pengeluaran terkait sebelum membatalkan pemindahan."},{status:400});
    const result=await env.DB.prepare("UPDATE finance_operating_transfers SET status='CANCELLED',cancel_reason=? WHERE id=? AND status='ACTIVE'").bind(reason,id).run();
    if(!result.meta.changes)return Response.json({error:"Pemindahan sudah berubah. Muat ulang halaman."},{status:409});
    await audit(admin.email,"BATALKAN PEMINDAHAN KE KAS","finance_operating_transfer",id,reason);
  }else if(action==="addRegistration"){
    const team=String(body.teamName||"").trim().slice(0,120),event=String(body.eventName||"").trim().slice(0,120),amount=money(body.amount),date=String(body.receivedDate||"").slice(0,10),notes=String(body.notes||"").trim().slice(0,500);
    if(!team||!event||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T00:00:00Z`)))return Response.json({error:"Isi nama team, event, nominal, dan tanggal yang benar."},{status:400});
    await ensureRegistrationTable();
    const result=await env.DB.prepare("INSERT INTO finance_registration_income(team_name,event_name,amount,received_date,notes,created_by,created_at) VALUES(?,?,?,?,?,?,?)").bind(team,event,amount,date,notes,admin.email,now).run();
    await audit(admin.email,"TAMBAH PEMASUKAN REGISTRASI","finance_registration",result.meta.last_row_id||"",`${team} • ${event} • Rp${amount}`);
  }else if(action==="cancelRegistration"){
    const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);
    if(!Number.isSafeInteger(id)||id<=0||!reason)return Response.json({error:"Pilih pemasukan dan isi alasan pembatalan."},{status:400});
    await ensureRegistrationTable();
    const entry=await env.DB.prepare("SELECT amount FROM finance_registration_income WHERE id=? AND status='ACTIVE'").bind(id).first<{amount:number}>(),balance=(await snapshot()).totals.registrationBalance;
    if(entry&&money(entry.amount)>balance)return Response.json({error:"Dana registrasi ini sudah dipakai atau dipindahkan ke kas. Batalkan pengeluaran atau pemindahan terkait terlebih dahulu."},{status:400});
    const result=await env.DB.prepare("UPDATE finance_registration_income SET status='CANCELLED',cancel_reason=? WHERE id=? AND status='ACTIVE'").bind(reason,id).run();
    if(!result.meta.changes)return Response.json({error:"Pemasukan tidak ditemukan atau sudah dibatalkan."},{status:404});
    await audit(admin.email,"BATALKAN PEMASUKAN REGISTRASI","finance_registration",id,reason);
  }else if(action==="addSponsor"||action==="editSponsor"){
    const id=Number(body.id),sponsor=String(body.sponsorName||"").trim().slice(0,120),periodId=Number(body.periodId),amount=Number(body.amount),date=String(body.receivedDate||"").slice(0,10),notes=String(body.notes||"").trim().slice(0,500);
    if(!sponsor||!Number.isSafeInteger(periodId)||periodId<0||!Number.isSafeInteger(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T00:00:00Z`)))return Response.json({error:"Pilih event atau Kas Operasional, nama sponsor, nominal, dan tanggal yang benar."},{status:400});
    await ensureSponsorTable();
    const period=periodId?await env.DB.prepare("SELECT event_name AS eventName FROM finance_periods WHERE id=? AND status='ACTIVE'").bind(periodId).first<{eventName:string}>():null;
    if(periodId&&!period)return Response.json({error:"Event tidak aktif atau tidak ditemukan."},{status:400});
    const destination=periodId?"EVENT":"OPERATING",eventName=period?.eventName||"KAS OPERASIONAL";
    if(action==="addSponsor"){
      const result=await env.DB.prepare("INSERT INTO finance_sponsor_income(sponsor_name,event_name,period_id,destination,amount,received_date,notes,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(sponsor,eventName,periodId||null,destination,amount,date,notes,admin.email,now).run();
      await audit(admin.email,"TAMBAH PEMASUKAN SPONSOR","finance_sponsor",result.meta.last_row_id||"",`${sponsor} • ${eventName} • Rp${amount}`);
    }else{
      if(!Number.isSafeInteger(id)||id<=0)return Response.json({error:"Sponsor tidak valid."},{status:400});
      const current=await env.DB.prepare("SELECT amount,period_id AS periodId,destination FROM finance_sponsor_income WHERE id=? AND status='ACTIVE'").bind(id).first<{amount:number;periodId:number|null;destination:string}>();
      if(!current)return Response.json({error:"Sponsor sudah dibatalkan atau tidak ditemukan."},{status:404});
      const data=await snapshot();
      if(current.periodId){
        const sourceIncome=data.sponsors.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===current.periodId).reduce((n,x)=>n+money(x.amount),0);
        const sourceUsed=data.expenses.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===current.periodId&&x.fundingSource==="SPONSOR").reduce((n,x)=>n+money(x.amount),0)+data.transfers.filter(x=>x.status==="ACTIVE"&&Number(x.periodId)===current.periodId).reduce((n,x)=>n+money(x.sponsorAmount),0);
        if(sourceIncome-money(current.amount)+(periodId===current.periodId?amount:0)<sourceUsed)return Response.json({error:"Sponsor event ini sudah dipakai atau dipindahkan. Koreksi pengeluaran/pemindahan terkait terlebih dahulu."},{status:400});
      }
      if(current.destination==="OPERATING"&&(destination!=="OPERATING"||amount<money(current.amount))&&data.totals.operatingBalance< money(current.amount)-(destination==="OPERATING"?amount:0))return Response.json({error:"Kas operasional sudah terpakai. Batalkan pengeluaran terkait sebelum memindahkan atau mengurangi sponsor ini."},{status:400});
      const changed=await env.DB.prepare("UPDATE finance_sponsor_income SET sponsor_name=?,event_name=?,period_id=?,destination=?,amount=?,received_date=?,notes=? WHERE id=? AND status='ACTIVE' AND amount=? AND destination=?").bind(sponsor,eventName,periodId||null,destination,amount,date,notes,id,current.amount,current.destination).run();
      if(!changed.meta.changes)return Response.json({error:"Data berubah. Muat ulang halaman."},{status:409});
      await audit(admin.email,"EDIT PEMASUKAN SPONSOR","finance_sponsor",id,`${sponsor} • ${eventName} • Rp${current.amount} → Rp${amount}`);
      return Response.json({ok:true,...await snapshot(),warning:"Koreksi sponsor tersimpan."});
    }
  }else if(action==="cancelSponsor"){
    const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);
    if(!Number.isSafeInteger(id)||id<=0||!reason)return Response.json({error:"Pilih pemasukan dan isi alasan pembatalan."},{status:400});
    await ensureSponsorTable();
    const entry=await env.DB.prepare("SELECT amount,destination FROM finance_sponsor_income WHERE id=? AND status='ACTIVE'").bind(id).first<{amount:number;destination:string}>(),totals=(await snapshot()).totals,balance=entry?.destination==="OPERATING"?totals.operatingBalance:totals.sponsorBalance;
    if(entry&&money(entry.amount)>balance)return Response.json({error:"Dana sponsor ini sudah dipakai atau dipindahkan ke kas. Batalkan pengeluaran atau pemindahan terkait terlebih dahulu."},{status:400});
    const result=await env.DB.prepare("UPDATE finance_sponsor_income SET status='CANCELLED',cancel_reason=? WHERE id=? AND status='ACTIVE'").bind(reason,id).run();
    if(!result.meta.changes)return Response.json({error:"Pemasukan tidak ditemukan atau sudah dibatalkan."},{status:404});
    await audit(admin.email,"BATALKAN PEMASUKAN SPONSOR","finance_sponsor",id,reason);
  }else if(action==="addPeriodMembers"){
    const periodId=Number(body.periodId),ids=Array.isArray(body.memberIds)?[...new Set(body.memberIds.map(Number))].filter(x=>Number.isSafeInteger(x)&&x>0):[];
    if(!Number.isSafeInteger(periodId)||periodId<=0||!ids.length)return Response.json({error:"Pilih periode dan minimal satu team."},{status:400});
    await ensurePeriodCancellation();
    const period=await env.DB.prepare("SELECT month,year,event_name AS eventName,deduction_per_member AS amount,status FROM finance_periods WHERE id=?").bind(periodId).first<{month:number;year:number;eventName:string;amount:number;status:string}>();
    if(!period||period.status!=="ACTIVE")return Response.json({error:"Periode tidak aktif atau tidak ditemukan."},{status:400});
    const balances=await teamBalances(),selected=balances.filter(x=>ids.includes(x.memberId)&&x.active);
    if(selected.length!==ids.length)return Response.json({error:"Pilih hanya team yang masih aktif."},{status:400});
    const placeholders=ids.map(()=>"?").join(","),already=await env.DB.prepare(`SELECT d.member_id AS memberId,d.period_id AS periodId,d.status FROM finance_member_deductions d JOIN finance_periods p ON p.id=d.period_id WHERE d.status='ACTIVE' AND p.month=? AND p.year=? AND d.member_id IN (${placeholders})`).bind(period.month,period.year,...ids).all<{memberId:number}>();
    if(already.results.length)return Response.json({error:"Ada team yang sudah dialokasikan pada bulan yang sama. Pilih team lain."},{status:400});
    const statements=[];
    for(const team of selected){
      const previous=await env.DB.prepare("SELECT id FROM finance_member_deductions WHERE period_id=? AND member_id=?").bind(periodId,team.memberId).first<{id:number}>();
      statements.push(previous?env.DB.prepare("UPDATE finance_member_deductions SET status='ACTIVE',cancel_reason='',created_at=?,created_by=?,team_name=? WHERE id=? AND status='CANCELLED'").bind(now,admin.email,team.teamName,previous.id):env.DB.prepare("INSERT INTO finance_member_deductions(period_id,member_id,team_name,amount,created_at,created_by,status) VALUES(?,?,?,?,?,?, 'ACTIVE')").bind(periodId,team.memberId,team.teamName,period.amount,now,admin.email));
    }
    await env.DB.batch(statements);
    await audit(admin.email,"TAMBAH TEAM KE ALOKASI","finance_period",periodId,`${period.eventName} • ${selected.map(x=>x.teamName).join(", ")} • Rp${selected.length*period.amount}`);
  }else if(action==="cancelDeduction"){
    const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);
    if(!Number.isSafeInteger(id)||id<=0||!reason)return Response.json({error:"Pilih alokasi dan isi alasan pembatalan."},{status:400});
    await Promise.all([ensurePeriodCancellation(),ensureExpenseFundingSource()]);
    const deduction=await env.DB.prepare("SELECT period_id AS periodId,amount,team_name AS teamName FROM finance_member_deductions WHERE id=? AND status='ACTIVE'").bind(id).first<{periodId:number;amount:number;teamName:string}>();
    if(!deduction)return Response.json({error:"Alokasi tidak ditemukan atau sudah dibatalkan."},{status:404});
    const allocation=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_member_deductions WHERE period_id=? AND status='ACTIVE'").bind(deduction.periodId).first<{total:number}>(),spent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE period_id=? AND funding_source='MEMBER' AND status='ACTIVE'").bind(deduction.periodId).first<{total:number}>();
    if(money(allocation?.total)-money(deduction.amount)<money(spent?.total))return Response.json({error:"Alokasi periode sudah dipakai untuk pengeluaran member. Batalkan pengeluaran terkait sebelum mengembalikan saldo team ini."},{status:400});
    const result=await env.DB.prepare("UPDATE finance_member_deductions SET status='CANCELLED',cancel_reason=? WHERE id=? AND status='ACTIVE'").bind(reason,id).run();
    if(!result.meta.changes)return Response.json({error:"Alokasi sudah berubah. Muat ulang halaman."},{status:409});
    await audit(admin.email,"BATALKAN ALOKASI TEAM","finance_member_deduction",id,`${deduction.teamName} • ${reason}`);
  }else if(action==="cancelPeriod"){
    const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);
    if(!Number.isSafeInteger(id)||id<=0||!reason)return Response.json({error:"Pilih periode dan isi alasan event batal."},{status:400});
    await Promise.all([ensurePeriodCancellation(),ensureExpenseFundingSource(),ensureOperatingTransfers()]);
    const period=await env.DB.prepare("SELECT name,status FROM finance_periods WHERE id=?").bind(id).first<{name:string;status:string}>();
    if(!period||period.status!=="ACTIVE")return Response.json({error:"Periode tidak aktif atau tidak ditemukan."},{status:404});
    const expense=await env.DB.prepare("SELECT id FROM finance_expenses WHERE period_id=? AND status='ACTIVE' LIMIT 1").bind(id).first(),transfer=await env.DB.prepare("SELECT id FROM finance_operating_transfers WHERE period_id=? AND status='ACTIVE' LIMIT 1").bind(id).first();
    if(expense||transfer)return Response.json({error:"Periode masih memiliki pengeluaran atau pemindahan ke kas. Batalkan transaksi tersebut terlebih dahulu."},{status:400});
    await env.DB.batch([env.DB.prepare("UPDATE finance_member_deductions SET status='CANCELLED',cancel_reason=? WHERE period_id=? AND status='ACTIVE'").bind(`Event batal: ${reason}`,id),env.DB.prepare("UPDATE finance_periods SET status='CANCELLED',published=0,updated_at=? WHERE id=? AND status='ACTIVE'").bind(now,id)]);
    await audit(admin.email,"BATALKAN PERIODE EVENT","finance_period",id,`${period.name} • ${reason}`);
  }else if(action==="createPeriod"){
    const name=String(body.name||"").trim().slice(0,100),eventName=String(body.eventName||"").trim().slice(0,120),month=Number(body.month),year=Number(body.year),start=String(body.startDate||"").slice(0,10),end=String(body.endDate||"").slice(0,10),amount=money(body.deductionPerMember),ids=Array.isArray(body.memberIds)?body.memberIds.map(Number).filter(Boolean):[];
    if(!name||!eventName||month<1||month>12||year<2020||year>2100||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start||!Number.isSafeInteger(Number(body.deductionPerMember))||amount<1||amount>100000000||!ids.length||new Set(ids).size!==ids.length)return Response.json({error:"Lengkapi periode, event, bulan, tanggal, dan pilih minimal satu team."},{status:400});
    const balances=await teamBalances(),selected=balances.filter(x=>ids.includes(x.memberId)&&x.active),marks=ids.map(()=>"?").join(","),already=await env.DB.prepare(`SELECT DISTINCT d.member_id AS memberId FROM finance_member_deductions d JOIN finance_periods p ON p.id=d.period_id WHERE d.status='ACTIVE' AND p.month=? AND p.year=? AND d.member_id IN (${marks})`).bind(month,year,...ids).all<{memberId:number}>(),blocked=new Set(already.results.map(x=>Number(x.memberId))),ready=selected.filter(x=>!blocked.has(x.memberId));
    if(ready.length!==ids.length)return Response.json({error:"Ada team nonaktif atau sudah dialokasikan pada bulan yang sama. Periksa pilihan team sebelum menyimpan."},{status:400});
    const created=await env.DB.prepare("INSERT INTO finance_periods(name,event_name,month,year,start_date,end_date,deduction_per_member,published,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,0,?,?,?)").bind(name,eventName,month,year,start,end,amount,admin.email,now,now).run(),periodId=Number(created.meta.last_row_id);
    await env.DB.batch(ready.map(x=>env.DB.prepare("INSERT INTO finance_member_deductions(period_id,member_id,team_name,amount,created_at,created_by,status) VALUES(?,?,?,?,?,?, 'ACTIVE')").bind(periodId,x.memberId,x.teamName,amount,now,admin.email)));
    await audit(admin.email,"TAMBAH PERIODE & ALOKASI","finance_period",periodId,`${name} • ${eventName} • ${month}/${year} • ${ready.length} team • Rp${ready.length*amount}`);
  }else if(action==="addExpense"||action==="updateExpense"){
    const id=Number(body.id),periodId=Number(body.periodId),amount=money(body.amount),eventName=String(body.eventName||"").trim().slice(0,120),item=String(body.itemName||"").trim().slice(0,160),date=String(body.expenseDate||"").slice(0,10);
    if(!periodId||!eventName||!item||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:"Data pengeluaran belum lengkap."},{status:400});
    await Promise.all([ensureSponsorTable(),ensureRegistrationTable(),ensureOperatingTransfers(),ensureExpenseFundingSource(),ensurePeriodCancellation()]);
    const activePeriod=await env.DB.prepare("SELECT id,event_name AS eventName FROM finance_periods WHERE id=? AND status='ACTIVE'").bind(periodId).first<{id:number;eventName:string}>();
    if(!activePeriod)return Response.json({error:"Periode event sudah dibatalkan atau tidak ditemukan."},{status:400});
    if(eventName.trim().toLowerCase()!==activePeriod.eventName.trim().toLowerCase())return Response.json({error:"Nama event pengeluaran harus sama dengan periode yang dipilih."},{status:400});
    const allocation=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_member_deductions WHERE period_id=? AND status='ACTIVE'").bind(periodId).first<{total:number}>(),memberSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE period_id=? AND funding_source='MEMBER' AND status='ACTIVE' AND id<>?").bind(periodId,action==="updateExpense"?id:0).first<{total:number}>(),sponsorFunds=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_sponsor_income WHERE status='ACTIVE' AND destination='EVENT'").first<{total:number}>(),sponsorSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE funding_source='SPONSOR' AND status='ACTIVE' AND id<>?").bind(action==="updateExpense"?id:0).first<{total:number}>();
    const registrationFunds=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_registration_income WHERE status='ACTIVE'").first<{total:number}>(),registrationSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE funding_source='REGISTRATION' AND status='ACTIVE' AND id<>?").bind(action==="updateExpense"?id:0).first<{total:number}>();
    const moved=await env.DB.prepare("SELECT COALESCE(SUM(sponsor_amount),0) AS sponsor,COALESCE(SUM(registration_amount),0) AS registration FROM finance_operating_transfers WHERE status='ACTIVE'").first<{sponsor:number;registration:number}>(),operatingSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses WHERE funding_source='OPERATING' AND status='ACTIVE' AND id<>?").bind(action==="updateExpense"?id:0).first<{total:number}>(),otherSpent=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_other_expenses WHERE status='ACTIVE'").first<{total:number}>();
    const directSponsor=await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_sponsor_income WHERE status='ACTIVE' AND destination='OPERATING'").first<{total:number}>(),memberTransferred=await historicalCashTransferred();
    const registrationAvailable=money(registrationFunds?.total)-money(registrationSpent?.total)-money(moved?.registration),memberAvailable=money(allocation?.total)-money(memberSpent?.total),sponsorAvailable=money(sponsorFunds?.total)-money(sponsorSpent?.total)-money(moved?.sponsor),operatingAvailable=money(moved?.sponsor)+money(moved?.registration)+money(directSponsor?.total)+memberTransferred-money(operatingSpent?.total)-money(otherSpent?.total),requested=String(body.fundingSource||"AUTO").toUpperCase();
    if(!["AUTO","MEMBER","SPONSOR","REGISTRATION","OPERATING"].includes(requested))return Response.json({error:"Sumber dana tidak valid."},{status:400});
    const fundingSource=requested==="AUTO"?(amount<=memberAvailable?"MEMBER":"SPONSOR"):requested;
    if(fundingSource==="MEMBER"&&amount>memberAvailable)return Response.json({error:`Alokasi member periode tersisa Rp${Math.max(0,memberAvailable).toLocaleString("id-ID")}. Pilih dana sponsor bila pengeluaran dibayar sponsor.`},{status:400});
    if(fundingSource==="SPONSOR"&&amount>sponsorAvailable)return Response.json({error:`Saldo sponsor tersedia Rp${Math.max(0,sponsorAvailable).toLocaleString("id-ID")}. Periksa nominal sponsor dan pengeluaran sebelumnya.`},{status:400});
    if(fundingSource==="REGISTRATION"&&amount>registrationAvailable)return Response.json({error:`Saldo registrasi tersedia Rp${Math.max(0,registrationAvailable).toLocaleString("id-ID")}. Periksa nominal registrasi dan pengeluaran sebelumnya.`},{status:400});
    if(fundingSource==="OPERATING"&&amount>operatingAvailable)return Response.json({error:`Kas operasional siap pakai Rp${Math.max(0,operatingAvailable).toLocaleString("id-ID")}. Pindahkan dahulu sisa dana event atau periksa pengeluaran sebelumnya.`},{status:400});
    const values=[periodId,eventName,item,String(body.category||"Event").slice(0,60),fundingSource,amount,date,String(body.proofUrl||"").slice(0,1000),String(body.notes||"").slice(0,500)];
    if(action==="addExpense"){const r=await env.DB.prepare("INSERT INTO finance_expenses(period_id,event_name,item_name,category,funding_source,amount,expense_date,proof_url,notes,status,cancel_reason,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?, 'ACTIVE','',?,?,?)").bind(...values,admin.email,now,now).run();await audit(admin.email,"TAMBAH PENGELUARAN","finance_expense",r.meta.last_row_id||"",`${eventName} • ${item} • ${fundingSource} • Rp${amount}`)}
    else{await env.DB.prepare("UPDATE finance_expenses SET period_id=?,event_name=?,item_name=?,category=?,funding_source=?,amount=?,expense_date=?,proof_url=?,notes=?,updated_at=? WHERE id=? AND status='ACTIVE'").bind(...values,now,id).run();await audit(admin.email,"EDIT PENGELUARAN","finance_expense",id,`${eventName} • ${item} • ${fundingSource} • Rp${amount}`)}
  }else if(action==="cancelExpense"){
    const id=Number(body.id),reason=String(body.reason||"").trim().slice(0,300);if(!id||!reason)return Response.json({error:"Alasan pembatalan wajib diisi."},{status:400});await env.DB.prepare("UPDATE finance_expenses SET status='CANCELLED',cancel_reason=?,updated_at=? WHERE id=? AND status='ACTIVE'").bind(reason,now,id).run();await audit(admin.email,"BATALKAN PENGELUARAN","finance_expense",id,reason);
  }else if(action==="togglePublish"){await ensurePeriodCancellation();const result=await env.DB.prepare("UPDATE finance_periods SET published=?,updated_at=? WHERE id=? AND status='ACTIVE'").bind(body.published?1:0,now,Number(body.id)).run();if(!result.meta.changes)return Response.json({error:"Periode tidak aktif."},{status:400});await audit(admin.email,body.published?"PUBLIKASIKAN LAPORAN":"SEMBUNYIKAN LAPORAN","finance_period",Number(body.id));}
  else return Response.json({error:"Aksi tidak dikenal"},{status:400});
  return Response.json({ok:true,...await snapshot()});
}

export async function DELETE(request:Request){if(!(await allowed(request)))return Response.json({error:"Tidak diizinkan"},{status:403});return Response.json({error:"Transaksi keuangan tidak boleh dihapus permanen. Gunakan pembatalan atau koreksi dengan alasan."},{status:405})}
