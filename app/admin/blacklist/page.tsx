import {requireAdminPage} from "../../../lib/admin-auth";
import {AdminHeaderLinks} from "../admin-nav";
import BlacklistAdmin from "./reviewer";
export const dynamic="force-dynamic";
export default async function Page(){const admin=await requireAdminPage("/admin/blacklist");if(!admin.blacklist)return <main className="admin-shell"><h1>Akses tidak tersedia</h1><a href="/admin">Kembali</a></main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>BLACKLIST PLAYER</small></span></a><AdminHeaderLinks><a href="/admin">EVENT</a>{admin.members && <a href="/admin/member">MEMBER</a>}<a href="/admin/blacklist">BLACKLIST PLAYER</a><a href="/blacklist-player" target="_blank" rel="noreferrer">LIHAT PUBLIK</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><BlacklistAdmin/></main>}
