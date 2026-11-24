import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import LiveLeaderboardAdmin from "./live-leaderboard-admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await requireAdminPage("/admin/live-leaderboard");
  if (!a.liveObs) return null;
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>
            PANBOY<small>LIVE LEADERBOARD OBS</small>
          </span>
        </a>
        <AdminHeaderLinks>
          {a.leaderboard && <a href="/admin/kalkulator-poin">HITUNG POIN</a>}
          {a.leaderboardDesign && <a href="/admin/desain-leaderboard">TEMPLATE & EXPORT</a>}
          <a href="/admin/live-leaderboard">LIVE OBS</a>
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <LiveLeaderboardAdmin />
    </main>
  );
}
