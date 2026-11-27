import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import MemberAdmin from "./member-admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  const admin = await requireAdminPage("/admin/member");
  if (!admin.members)
    return (
      <main className="admin-shell">
        <div className="access-card">
          <h1>Akses Member tidak tersedia</h1>
          <a href="/admin">Kembali</a>
        </div>
      </main>
    );
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>
            PANBOY<small>KELOLA MEMBER</small>
          </span>
        </a>
        <AdminHeaderLinks>
          {admin.events && <a href="/admin">EVENT</a>}
          <a href="/admin/member">MEMBER</a>{admin.blacklist && <a href="/admin/blacklist">BLACKLIST PLAYER</a>}{admin.memberDues && <a href="/admin/member-dues">IURAN MEMBER</a>}
          <a href="/member" target="_blank" rel="noreferrer">
            LIHAT PUBLIK
          </a>
          <a href="/admin/member/nonaktif">NONAKTIF MEMBER</a>
          <a href="/admin/member/pendaftaran">PENDAFTARAN BARU</a>
          {admin.isOwner && <a href="/admin/akses">AKSES ADMIN</a>}
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <MemberAdmin />
    </main>
  );
}
