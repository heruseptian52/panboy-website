import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import Designer from "./designer";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await requireAdminPage("/admin/desain-leaderboard");
  if (!a.leaderboardDesign) return null;
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>
            PANBOY<small>TEMPLATE EDITOR</small>
          </span>
        </a>
        <AdminHeaderLinks>
          {a.leaderboard && <a href="/admin/kalkulator-poin">HITUNG POIN</a>}
          <a href="/admin/desain-leaderboard">TEMPLATE & EXPORT</a>
          {a.isOwner&&<a href="/admin/kelola-template-leaderboard">KELOLA TEMPLATE</a>}
          {a.liveObs && <a href="/admin/live-leaderboard">LIVE LEADERBOARD OBS</a>}
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <Designer />
    </main>
  );
}
