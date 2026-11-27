import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import DuesClient from "./client";
import { env } from "cloudflare:workers";
import { ensureMemberBillingPreferences } from "../../../lib/member-billing";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await requireAdminPage("/admin/member-dues");
  if (!a.isOwner && !a.memberDues)
    return (
      <main className="admin-shell">
        <div className="access-card">
          <h1>Akses ditolak</h1>
        </div>
      </main>
    );
  await ensureMemberBillingPreferences();
  const [memberRows, settingRows, payments, deductions] = await env.DB.batch([
    env.DB.prepare("SELECT m.id,m.team_name AS teamName,m.whatsapp,m.logo_url AS logoUrl,m.active,m.sort_order AS sortOrder,m.membership_start AS membershipStart,m.membership_end AS membershipEnd,m.membership_tier AS membershipTier,COALESCE(b.enabled,1) AS billingEnabled FROM community_members m LEFT JOIN member_billing_preferences b ON b.member_id=m.id ORDER BY m.active DESC,m.sort_order ASC,m.team_name COLLATE NOCASE ASC"),
    env.DB.prepare("SELECT value FROM site_settings WHERE key='memberDuesJson' LIMIT 1"),
    env.DB.prepare("SELECT member_id AS memberId,team_name AS teamName,tier,amount,paid_at AS paidAt,membership_end AS membershipEnd FROM member_payments WHERE status='LUNAS' ORDER BY paid_at DESC,id DESC"),
    env.DB.prepare("SELECT d.member_id AS memberId,d.amount,d.created_at AS usedAt,p.name AS periodName,p.event_name AS eventName,p.month,p.year FROM finance_member_deductions d JOIN finance_periods p ON p.id=d.period_id WHERE d.status='ACTIVE' ORDER BY d.created_at DESC,d.id DESC"),
  ]);
  const members=(memberRows.results as Array<any>).map(m=>({...m,active:Boolean(m.active),billingEnabled:Boolean(m.billingEnabled)}));
  const memberDuesJson=String((settingRows.results[0] as {value?:string}|undefined)?.value||"{}");
  let dues:Record<string,{amount?:string;status?:string;paidAt?:string;tier?:string}>={};try{dues=JSON.parse(memberDuesJson)}catch{}
  const monthEnd=(month:string)=>{const [y,m]=month.split("-").map(Number);return y&&m?new Date(Date.UTC(y,m,0)).toISOString().slice(0,10):""};
  const summary = members.map(m => {
    const paid = payments.results.filter(x => Number(x.memberId) === m.id || String(x.teamName).trim().toLowerCase() === m.teamName.trim().toLowerCase());
    const paidPeriods = new Set(paid.map(x => String(x.paidAt || "").slice(0, 7)));
    const manual = Object.entries(dues)
      .filter(([key, row]) => key.endsWith(`:${m.id}`) && row.status === "SUDAH BAYAR" && !paidPeriods.has(key.slice(0, 7)))
      .map(([key, row]) => ({ month: key.slice(0, 7), date: row.paidAt || `${key.slice(0, 7)}-01`, tier: row.tier || "C", amount: Number(row.amount || 0) }));
    const used = deductions.results.filter(x => Number(x.memberId) === m.id);
    const totalPaid = paid.reduce((n, x) => n + Number(x.amount || 0), 0) + manual.reduce((n, x) => n + x.amount, 0);
    const totalUsed = used.reduce((n, x) => n + Number(x.amount || 0), 0);
    const last = used[0];
    const membershipEnd = String(m.membershipEnd || "");
    const active = m.active && (!membershipEnd || membershipEnd >= new Date().toISOString().slice(0, 10));
    const incomeHistory = [
      ...paid.map(x => ({ date: String(x.paidAt || "-").slice(0, 10), type: "IURAN MASUK", name: `Tier ${String(x.tier || "C")} • pembayaran terverifikasi`, amount: Number(x.amount || 0) })),
      ...manual.map(x => ({ date: x.date, type: "IURAN MASUK", name: `Tier ${x.tier} • ${x.month} (manual)`, amount: x.amount })),
    ];
    return { memberId: m.id, teamName: m.teamName, logoUrl: m.logoUrl,
      tier: String(m.membershipTier || paid[0]?.tier || manual.at(-1)?.tier || "C").replace("TIER ", ""),
      totalPaid, totalUsed, balance: totalPaid - totalUsed,
      lastPeriod: last ? `${String(last.periodName)} (${String(last.month).padStart(2, "0")}/${String(last.year)})` : "-",
      lastEvent: String(last?.eventName || "-"), membershipEnd,
      status: !active ? "NONAKTIF" : totalPaid - totalUsed < 0 ? "TUNGGAKAN" : totalPaid - totalUsed === 0 ? "HABIS" : "TERSEDIA",
      history: [...incomeHistory, ...used.map(x => ({ date: String(x.usedAt || "-").slice(0, 10), type: "ALOKASI EVENT", name: `${String(x.periodName)} • ${String(x.eventName || "")}`, amount: -Number(x.amount || 0) }))].sort((x, y) => y.date.localeCompare(x.date)),
    };
  });
  const today=new Date().toISOString().slice(0,10),soon=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const reminders=members.filter(m=>m.membershipEnd&&m.membershipEnd<=soon).map(m=>({memberId:m.id,teamName:m.teamName,whatsapp:m.whatsapp,membershipEnd:m.membershipEnd,expired:m.membershipEnd<today})).sort((a,b)=>a.membershipEnd.localeCompare(b.membershipEnd));
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>
            PANBOY<small>IURAN MEMBER</small>
          </span>
        </a>
        <AdminHeaderLinks>
          {a.members && <a href="/admin/member">MEMBER</a>}
          <a href="/admin/member-dues/pembayaran">PEMBAYARAN QRIS</a>
          <a href="/admin/member-dues/qris">ATUR QRIS</a>
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <DuesClient members={members} initial={memberDuesJson} summary={summary} reminders={reminders} isOwner={a.isOwner} />
    </main>
  );
}
