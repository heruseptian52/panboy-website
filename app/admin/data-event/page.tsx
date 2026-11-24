import {requireAdminPage} from "../../../lib/admin-auth";
import {AdminHeaderLinks} from "../admin-nav";
import RosterAdmin from "./roster-admin";
export const dynamic="force-dynamic";
export default async function Page(){const admin=await requireAdminPage("/admin/data-event");if(!admin.events)return <main className="admin-shell"><h1>Akses tidak tersedia</h1></main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>DATA PLAYER EVENT</small></span></a><AdminHeaderLinks><a href="/admin">EVENT</a><a href="/admin/data-event">DATA PLAYER EVENT</a><a href="/data-event" target="_blank">FORM PLAYER</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><RosterAdmin/></main>}
