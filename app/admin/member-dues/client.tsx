"use client";
import { useEffect, useState } from "react";
type M = { id: number; teamName: string; logoUrl: string; active: boolean; membershipEnd: string; billingEnabled: boolean };
type R = { amount: string; status: string; paidAt: string; tier: string };
type S = {memberId:number;teamName:string;logoUrl:string;tier:string;totalPaid:number;totalUsed:number;balance:number;lastPeriod:string;lastEvent:string;membershipEnd:string;status:string;history:{date:string;type:string;name:string;amount:number}[]};
export default function DuesClient({
  members,
  initial,
  summary,
  reminders,
  isOwner,
}: {
  members: M[];
  initial: string;
  summary: S[];
  reminders: {memberId:number;teamName:string;whatsapp:string;membershipEnd:string;expired:boolean}[];
  isOwner: boolean;
}) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [memberId, setMemberId] = useState(members[0]?.id || 0);
  const [tier, setTier] = useState("C");
  const [months, setMonths] = useState(1);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState<S | null>(null);
  const [billing, setBilling] = useState<Record<number, boolean>>(() => Object.fromEntries(members.map(m => [m.id, m.billingEnabled])));
  const [billingSearch, setBillingSearch] = useState("");
  const [billingBusy, setBillingBusy] = useState<number | null>(null);
  const [billingMessage, setBillingMessage] = useState("");
  const records: Record<string, R> = (() => { try { return JSON.parse(initial); } catch { return {}; } })();
  const current = records[`${month}:${memberId}`];
  const rupiah=(n:number)=>`${n<0?"−":""}Rp${Math.abs(n).toLocaleString("id-ID")}`;
  const tanggal=(v:string)=>v?new Date(`${v.slice(0,10)}T12:00:00`).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"-";
  function loadRecord(id: number, selectedMonth: string) {
    const row = records[`${selectedMonth}:${id}`];
    const rowTier = row?.tier === "S" ? "S" : "C";
    const price = rowTier === "S" ? 100000 : 10000;
    setTier(rowTier);
    setMonths(row && Number(row.amount) > 0 ? Math.min(120, Math.max(1, Math.round(Number(row.amount) / price))) : 1);
    setPaidAt(row?.paidAt || new Date().toISOString().slice(0, 10));
    setMsg("");
  }
  useEffect(() => { if (members[0]) loadRecord(members[0].id, month); }, []);
  async function toggleBilling(memberId: number, enabled: boolean) {
    if (!isOwner || billingBusy !== null) return;
    const team = members.find(m => m.id === memberId);
    if (!team || !confirm(`${enabled ? "Aktifkan lagi penagihan" : "Hentikan penagihan"} ${team.teamName}?`)) return;
    setBillingBusy(memberId); setBillingMessage("");
    try {
      const response = await fetch("/api/admin/member-billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, enabled }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Gagal mengubah status penagihan.");
      setBilling(previous => ({ ...previous, [memberId]: enabled }));
      setBillingMessage(`${team.teamName}: ${enabled ? "ikut iuran lagi" : "tidak ditagih lagi"}.`);
    } catch (error) { setBillingMessage(error instanceof Error ? error.message : "Gagal mengubah status. Coba lagi."); }
    finally { setBillingBusy(null); }
  }
  async function submit(action: "save" | "cancel") {
    if (!isOwner || busy) return;
    if (action === "save" && !confirm(`${current ? "Koreksi" : "Catat"} iuran ${members.find(m=>m.id===memberId)?.teamName} untuk ${month}: ${rupiah(months * (tier === "S" ? 100000 : 10000))}, ${months} bulan?`)) return;
    if (action === "cancel" && !confirm(`Batalkan iuran manual ${members.find(m=>m.id===memberId)?.teamName} bulan ${month}? Masa aktif akan dikoreksi.`)) return;
    setBusy(true); setMsg("");
    try {
      const response = await fetch("/api/admin/member-dues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, month, tier, months, paidAt, action }), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Gagal menyimpan iuran.");
      window.location.reload();
    } catch (error) { setMsg(error instanceof Error ? error.message : "Gagal menyimpan iuran."); setBusy(false); }
  }
  return (
    <section className="dues-admin">
      <section className="dues-reminders"><h2>Pengingat Masa Aktif</h2><p>Hanya tim yang masih ikut iuran dan sudah habis atau akan habis dalam 7 hari. Pesan WhatsApp dibuka oleh admin, tidak terkirim otomatis.</p>{reminders.filter(m => billing[m.memberId]).length ? reminders.filter(m => billing[m.memberId]).map(m => {const number=m.whatsapp.replace(/\D/g,"").replace(/^0/,"62");const message=`Halo kak, masa aktif member ${m.teamName} ${m.expired?"sudah berakhir":"akan berakhir"} pada ${tanggal(m.membershipEnd)}. Silakan perpanjang iuran melalui https://panboycommunity.my.id/member/bayar`;return <article key={m.memberId}><b>{m.teamName}</b><span>{m.expired?"SUDAH HABIS":"SEGERA HABIS"} · {tanggal(m.membershipEnd)}</span>{number.length>=10?<a href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">INGATKAN VIA WHATSAPP</a>:<small>Nomor WhatsApp belum tersedia</small>}{isOwner&&<button type="button" onClick={() => toggleBilling(m.memberId,false)} disabled={billingBusy!==null}>BERHENTI TAGIH</button>}</article>}):<p>Belum ada tim yang perlu diingatkan.</p>}</section>
      {isOwner && <details className="dues-billing-panel"><summary>ATUR TIM YANG IKUT IURAN <span>BUKA / TUTUP</span></summary><div><p>Tim yang berhenti iuran tidak muncul di pengingat. Riwayat dan tanggal masa aktifnya tetap tersimpan. Mengaktifkan tagihan kembali tidak otomatis memperpanjang masa aktif.</p><input type="search" value={billingSearch} onChange={e=>setBillingSearch(e.target.value)} placeholder="Cari nama tim" aria-label="Cari tim untuk atur penagihan" />{billingMessage&&<p role="status">{billingMessage}</p>}<div className="dues-billing-list">{members.filter(m=>m.teamName.toLocaleLowerCase().includes(billingSearch.toLocaleLowerCase())).map(m=><article key={m.id}><b>{m.teamName}</b><span>{billing[m.id]?"IKUT IURAN":"BERHENTI IURAN"} · Masa aktif sampai {tanggal(m.membershipEnd)}</span><button type="button" disabled={billingBusy!==null} onClick={()=>toggleBilling(m.id,!billing[m.id])}>{billingBusy===m.id?"MENYIMPAN...":billing[m.id]?"BERHENTI TAGIH":"AKTIFKAN TAGIHAN"}</button></article>)}</div></div></details>}
      {isOwner && <details className="dues-manual-panel">
        <summary>PENCATATAN IURAN MANUAL <span>BUKA / TUTUP</span></summary>
        <div className="dues-manual-simple">
          <h2>Catat atau koreksi iuran</h2>
          <p>Pilih team dan bulan, lalu tentukan tier serta jumlah bulan. Nominal dihitung otomatis. Iuran iPaymu dikoreksi di penyedia pembayaran.</p>
          <div className="dues-manual-fields">
            <label>TEAM<select value={memberId} onChange={e=>{const id=Number(e.target.value);setMemberId(id);loadRecord(id,month)}}>{members.map(m=><option key={m.id} value={m.id}>{m.teamName}</option>)}</select></label>
            <label>BULAN CATATAN<input type="month" value={month} onChange={e=>{setMonth(e.target.value);loadRecord(memberId,e.target.value)}} /></label>
            <label>TIER<select value={tier} onChange={e=>{setTier(e.target.value);setMsg("")}}><option value="C">TIER C</option><option value="S">TIER S</option></select></label>
            <label>MASA AKTIF<select value={months} onChange={e=>setMonths(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12,36,120].map(n=><option value={n} key={n}>{n} BULAN</option>)}</select></label>
            <label>TANGGAL BAYAR<input type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)} /></label>
          </div>
          <p className="dues-manual-amount">TOTAL IURAN <strong>{rupiah(months * (tier === "S" ? 100000 : 10000))}</strong></p>
          <p>{current?.status === "SUDAH BAYAR" ? `Catatan saat ini: ${rupiah(Number(current.amount || 0))}, Tier ${current.tier || "C"}, dibayar ${tanggal(current.paidAt)}.` : "Belum ada catatan manual untuk team dan bulan ini."}</p>
          <div className="dues-manual-actions"><button type="button" onClick={()=>submit("save")} disabled={busy||!memberId}>{busy?"MENYIMPAN...":current?"SIMPAN KOREKSI":"CATAT IURAN"}</button>{current && <button type="button" className="cancel" onClick={()=>submit("cancel")} disabled={busy}>BATALKAN IURAN</button>}</div>
          {msg && <p className="form-message" role="alert">{msg}</p>}
        </div>
      </details>}
      <section className="dues-summary">
        <div className="dues-summary-title"><div><small>RINGKASAN KEUANGAN TEAM</small><h2>PEMBAYARAN, PEMAKAIAN & SISA SALDO</h2></div><b>{summary.length} TEAM</b></div>
        <div className="dues-summary-table"><div className="dues-summary-head"><b>TEAM</b><b>TIER</b><b>TOTAL DIBAYAR</b><b>SUDAH TERPAKAI</b><b>PERIODE / EVENT TERAKHIR</b><b>AKTIF SAMPAI</b><b>SISA SALDO</b><b>STATUS</b><b>AKSI</b></div>{summary.map(x=><div className="dues-summary-row" key={x.memberId}><div className="dues-team"><div className="dues-logo">{x.logoUrl?<img src={x.logoUrl} alt={`Logo ${x.teamName}`}/>:<span>{x.teamName.slice(0,2)}</span>}</div><b>{x.teamName}</b></div><span>Tier {x.tier}</span><b>{rupiah(x.totalPaid)}</b><b>{rupiah(x.totalUsed)}</b><span>{x.lastPeriod}<small>{x.lastEvent}</small></span><span>{tanggal(x.membershipEnd)}</span><b className={x.balance<0?"balance-minus":"balance-ok"}>{rupiah(x.balance)}</b><span className={`dues-summary-status ${billing[x.memberId] ? x.status.toLowerCase() : "berhenti"}`}>{billing[x.memberId] ? x.status : "BERHENTI IURAN"}</span><button onClick={()=>setDetail(x)}>LIHAT RINCIAN</button></div>)}</div>
      </section>
      {detail&&<div className="dues-detail-modal" onClick={()=>setDetail(null)}><section onClick={e=>e.stopPropagation()}><button className="dues-detail-close" onClick={()=>setDetail(null)}>×</button><small>RIWAYAT TEAM</small><h2>{detail.teamName}</h2><div className="dues-detail-total"><span>Total dibayar <b>{rupiah(detail.totalPaid)}</b></span><span>Sudah terpakai <b>{rupiah(detail.totalUsed)}</b></span><span>Sisa saldo <b className={detail.balance<0?"balance-minus":"balance-ok"}>{rupiah(detail.balance)}</b></span></div><div className="dues-detail-list"><div><b>TANGGAL</b><b>TRANSAKSI</b><b>KETERANGAN</b><b>NOMINAL</b></div>{detail.history.map((h,i)=><div key={i}><span>{tanggal(h.date)}</span><b>{h.type}</b><span>{h.name}</span><b className={h.amount<0?"balance-minus":"balance-ok"}>{h.amount<0?"− ":"+ "}{rupiah(Math.abs(h.amount))}</b></div>)}</div></section></div>}
    </section>
  );
}
