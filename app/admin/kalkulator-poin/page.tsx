import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import ScoreboardCalculator from "./scoreboard-calculator";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await requireAdminPage("/admin/kalkulator-poin");
  if (!a.leaderboard)
    return (
      <main className="admin-shell">
        <div className="access-card">
          <h1>Akses Hitung Poin tidak tersedia</h1>
          <a href="/api/admin/auth/logout">Keluar</a>
        </div>
      </main>
    );
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>
            PANBOY<small>POINT CALCULATOR</small>
          </span>
        </a>
        <AdminHeaderLinks>
          {a.events && <a href="/admin">EVENT</a>}
          <a href="/admin/kalkulator-poin">HITUNG POIN</a>
          {a.leaderboardDesign && <a href="/admin/desain-leaderboard">TEMPLATE & EXPORT</a>}
          {a.liveObs && <a href="/admin/live-leaderboard">LIVE LEADERBOARD OBS</a>}
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminHeaderLinks>
      </header>
      <ScoreboardCalculator />
    </main>
  );
}
