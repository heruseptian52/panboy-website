import { AdminHeaderLinks } from "../../admin-nav";
import { env } from "cloudflare:workers";
import { requireAdminPage } from "../../../../lib/admin-auth";
import RegistrationActions from "./registration-actions";

export const dynamic = "force-dynamic";

type Registration = {
  id: number;
  team_name: string;
  owner_name: string;
  management_name: string;
  logo_url: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  status: string;
  hidden: number;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tampilkan?: string }> }) {
  const admin = await requireAdminPage("/admin/member/pendaftaran");
  if (!admin.members)
    return <main className="admin-shell"><div className="access-card"><h1>Akses ditolak</h1></div></main>;

  const showHidden = (await searchParams).tampilkan === "1";
  const rows = (await env.DB.prepare(
    `SELECT * FROM member_registrations ${showHidden ? "" : "WHERE hidden=0"} ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END,created_at DESC`,
  ).all<Registration>()).results;

  return <main className="admin-shell">
    <header className="admin-header">
      <a className="brand" href="/admin/member"><img src="/panboy-logo.png" alt="Panboy" /><span>PANBOY<small>PENDAFTARAN MEMBER</small></span></a>
      <AdminHeaderLinks><a href="/admin/member">MEMBER</a><a href="/admin/member/pendaftaran">PENDAFTARAN BARU</a><a href="/admin/member/nonaktif">NONAKTIF MEMBER</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks>
    </header>
    <section className="member-manager">
      <div className="manager-head"><h1>PENDAFTARAN MEMBER</h1><p>Konfirmasi pendaftar sebelum masuk ke daftar member resmi.</p><a className="button gold" href={showHidden ? "/admin/member/pendaftaran" : "/admin/member/pendaftaran?tampilkan=1"}>{showHidden ? "SEMBUNYIKAN YANG SELESAI" : "TAMPILKAN YANG DISEMBUNYIKAN"}</a></div>
      <div className="member-admin-list">
        {rows.map((item) => <article key={item.id}>
          {item.logo_url ? <img src={item.logo_url} alt={item.team_name} /> : null}
          <div><small>{item.status === "APPROVED" ? "DITERIMA · SUDAH MASUK MEMBER" : item.status === "REJECTED" ? "DITOLAK · TIDAK MASUK MEMBER" : "MENUNGGU KEPUTUSAN"}</small><h3>{item.team_name}</h3><p>Owner: {item.owner_name || "—"} · Manager: {item.management_name || "—"}</p><p>Instagram: {item.instagram || "—"} · TikTok: {item.tiktok || "—"}</p><p>WhatsApp: {item.whatsapp}</p></div>
          <RegistrationActions id={item.id} whatsapp={item.whatsapp} managementName={item.management_name} teamName={item.team_name} status={item.status} hidden={Boolean(item.hidden)} />
        </article>)}
        {!rows.length && <p>Belum ada pendaftaran member.</p>}
      </div>
    </section>
  </main>;
}
