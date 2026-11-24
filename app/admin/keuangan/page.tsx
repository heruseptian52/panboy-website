import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import FinanceClient from "./finance-client";
export const dynamic = "force-dynamic";
export default async function Page() {
  const admin = await requireAdminPage("/admin/keuangan");
  if (!admin.finance) return <main className="admin-shell"><div className="access-card"><h1>Akses Keuangan tidak tersedia</h1></div></main>;
  return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>KEUANGAN</small></span></a><AdminHeaderLinks><a href="/admin/member-dues">IURAN</a><a href="/transparansi-keuangan">LAPORAN MEMBER</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><FinanceClient isOwner={admin.isOwner}/></main>;
}
