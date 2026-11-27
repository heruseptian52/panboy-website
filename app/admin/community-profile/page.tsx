import { AdminHeaderLinks } from "../admin-nav";
import { requireAdminPage } from "../../../lib/admin-auth";
import CommunityProfileEditor from "./editor";
export const dynamic = "force-dynamic";
export default async function Page(){const a=await requireAdminPage("/admin/community-profile");if(!a.communityProfile)return <main className="admin-shell"><div className="access-card"><h1>Akses ditolak</h1><p>Akses Community Profile tidak tersedia.</p></div></main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>COMMUNITY PROFILE</small></span></a><AdminHeaderLinks><a href="/admin">EVENT</a>{a.members && <a href="/admin/member">MEMBER</a>}<a href="/admin/community-profile">COMMUNITY PROFILE</a><a href="/api/admin/auth/logout">KELUAR</a></AdminHeaderLinks></header><CommunityProfileEditor/></main>}
