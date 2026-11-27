import { requireAdminPage } from "../../../lib/admin-auth";
import { AdminHeaderLinks } from "../admin-nav";
import EventSubmissionReview from "./review";

export const dynamic = "force-dynamic";
export default async function Page() {
  const admin = await requireAdminPage("/admin/pengajuan-event");
  if (!admin.events) return <main className="admin-shell"><p>Akses event tidak tersedia.</p></main>;
  return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>PENGAJUAN EVENT</small></span></a><AdminHeaderLinks><a href="/admin">KELOLA EVENT</a><a href="/admin/menu/event">MENU EVENT</a></AdminHeaderLinks></header><EventSubmissionReview/></main>;
}
