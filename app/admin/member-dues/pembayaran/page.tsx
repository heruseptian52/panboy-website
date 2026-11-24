import { AdminHeaderLinks } from "../../admin-nav";
import "./payments.css";
import { env } from "cloudflare:workers";
import { requireAdminPage } from "../../../../lib/admin-auth";
import { getCommunityMembers } from "../../../../lib/members";
import PaymentsClient from "./payments-client";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await requireAdminPage("/admin/member-dues/pembayaran");
  if (!a.isOwner && !a.memberDues)
    return (
      <main className="admin-shell">
        <div className="access-card">
          <h1>Akses ditolak</h1>
        </div>
      </main>
    );
  const [rows, members] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM member_payments ORDER BY created_at DESC LIMIT 100",
    ).all(),
    getCommunityMembers(false),
  ]);
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/admin/member-dues">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>
            PANBOY<small>PEMBAYARAN MEMBER</small>
          </span>
        </a>
        <AdminHeaderLinks>
          <a href="/admin/member-dues">IURAN</a>
          <a href="/admin/member/nonaktif">NONAKTIF MEMBER</a>
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <PaymentsClient initial={rows.results} members={members} isOwner={a.isOwner} />
    </main>
  );
}
