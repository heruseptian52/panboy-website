import { AdminHeaderLinks } from "../../admin-nav";
import { requireAdminPage } from "../../../../lib/admin-auth";
import { getSettings } from "../../../../lib/settings";
import QrisClient from "./qris-client";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await requireAdminPage("/admin/member-dues/qris");
  if (!a.isOwner && !a.memberDues)
    return (
      <main className="admin-shell">
        <div className="access-card">
          <h1>Akses ditolak</h1>
        </div>
      </main>
    );
  const s = await getSettings();
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/admin/member-dues">
          ← IURAN MEMBER
        </a>
        <AdminHeaderLinks>
          <a href="/admin/member-dues">KELOLA IURAN</a>
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <QrisClient initial={s.memberQrisUrl || "/panboy-qris-dana.png"} />
    </main>
  );
}
