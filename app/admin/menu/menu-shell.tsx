import AdminNav from "../admin-nav";
import type { MenuGroup } from "../menu-data";
import MenuContent from "./menu-content";

export default function MenuShell({ groups, selectedId }: { groups: MenuGroup[]; selectedId?: string }) {
  return <main className="admin-shell admin-menu-page">
    <header className="admin-header"><a className="brand" href="/"><img src="/panboy-logo.png" alt="Panboy" /><span>PANBOY<small>ADMIN PANEL</small></span></a>
      <AdminNav><a href="/admin/menu">SEMUA MENU</a>{groups.map(group => <a key={group.id} href={`/admin/menu/${group.id}`}>{group.label.toLocaleUpperCase("id")}</a>)}<a href="/api/admin/auth/logout">KELUAR</a></AdminNav>
    </header>
    <MenuContent groups={groups} selectedId={selectedId} />
  </main>;
}
