import type { ReactElement } from "react";
import { requireAdminPage } from "../../lib/admin-auth";
import AdminClient from "./admin-client";
import AdminNav from "./admin-nav";
import { menuGroups } from "./menu-data";
import MenuShell from "./menu/menu-shell";

export const dynamic = "force-dynamic";

export default async function Page(): Promise<ReactElement> {
  const admin = await requireAdminPage("/admin");
  const groups = menuGroups(admin);

  if (!admin.events) return <MenuShell groups={groups} />;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <img src="/panboy-logo.png" alt="Panboy" />
          <span>PANBOY<small>ADMIN PANEL</small></span>
        </a>
        <AdminNav>
          <a href="/admin/menu">SEMUA MENU</a>
          <a href="/admin/pengajuan-event">PENGAJUAN EVENT</a>
          {groups.map(group => <a key={group.id} href={`/admin/menu/${group.id}`}>{group.label.toLocaleUpperCase("id")}</a>)}
          <a href="/api/admin/auth/logout">KELUAR</a>
        </AdminNav>
      </header>
      <AdminClient isOwner={admin.isOwner} />
    </main>
  );
}
