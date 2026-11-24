import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import DesignAdmin from "./design-admin";
import "./design-admin.css";
export const dynamic="force-dynamic";
export default async function Page(){const a=await requireAdminPage("/admin/jasa-design");if(!a.services)return <main className="admin-shell"><div className="access-card"><h1>Akses ditolak</h1></div></main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>ADMIN PANEL</small></span></a><AdminHeaderLinks><a href="/admin">EVENT</a><a href="/admin/jasa-design">JASA DESIGN</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><DesignAdmin/></main>}
