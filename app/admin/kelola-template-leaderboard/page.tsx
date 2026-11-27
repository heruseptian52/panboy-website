import {requireAdminPage} from "../../../lib/admin-auth";
import {AdminHeaderLinks} from "../admin-nav";
import TemplateManager from "./template-manager";
export const dynamic="force-dynamic";
export default async function Page(){const a=await requireAdminPage("/admin/kelola-template-leaderboard");if(!a.isOwner)return <main className="admin-shell"><div className="access-card"><h1>Akses ditolak</h1></div></main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin/menu"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>KELOLA TEMPLATE</small></span></a><AdminHeaderLinks><a href="/admin/desain-leaderboard">TEMPLATE & EXPORT</a><a href="/admin/live-leaderboard">LIVE OBS</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><TemplateManager/></main>}
