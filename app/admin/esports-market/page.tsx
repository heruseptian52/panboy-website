import {requireAdminPage} from "../../../lib/admin-auth";
import {AdminHeaderLinks} from "../admin-nav";
import MarketAdmin from "./market-admin";
import "../../esports-market/market.css";
export const dynamic="force-dynamic";
export default async function Page(){const a=await requireAdminPage("/admin/esports-market");if(!a.market)return <main className="admin-shell">Akses ditolak.</main>;return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/admin/menu">PANBOY<small>ESPORTS MARKET</small></a><AdminHeaderLinks><a href="/admin/esports-market">ESPORTS MARKET</a><a href="/esports-market">LIHAT MARKET</a></AdminHeaderLinks></header><MarketAdmin/></main>}
