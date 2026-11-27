import {requireAdminPage} from "../../../lib/admin-auth";
import {AdminHeaderLinks} from "../admin-nav";
import ShowcaseAdmin from "./showcase-admin";
export const dynamic="force-dynamic";
export default async function Page(){const a=await requireAdminPage("/admin/showcase");if(!a.appearance)return <main className="admin-shell"><div className="access-card"><h1>Akses ditolak</h1></div></main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin/menu"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>SHOWCASE</small></span></a><AdminHeaderLinks><a href="/admin/media">MEDIA</a><a href="/admin/showcase">SHOWCASE</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><ShowcaseAdmin/></main>}
