import { notFound } from "next/navigation";
import { requireAdminPage } from "../../../lib/admin-auth";
import CapacityPanel from "./capacity-panel";
export const dynamic = "force-dynamic";
export default async function Page() {
  const admin = await requireAdminPage("/admin/system-center");
  if (!admin.isOwner) notFound();
  return <main className="admin-shell"><header className="admin-header"><h1>System Center</h1><a href="/admin/menu">Menu Admin</a></header>
    <CapacityPanel/>
    <nav aria-label="Pengelolaan website" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
    {Object.entries({audit:"Activity Log",akses:"Hak Akses Admin",analitik:"Website Analytics",fitur:"Feature Manager",sampah:"Sampah Event",media:"Media Beranda"}).map(([path,label])=><a className="admin-card" key={path} href={'/admin/'+path}>{label}</a>)}</nav></main>;
}
