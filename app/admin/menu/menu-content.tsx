"use client";

import { useState } from "react";
import PanboyIcon from "../../panboy-icon";
import { useMemberAlerts } from "../admin-nav";
import type { MenuGroup } from "../menu-data";

export default function MenuContent({ groups, selectedId }: { groups: MenuGroup[]; selectedId?: string }) {
  const [search, setSearch] = useState("");
  const alerts = useMemberAlerts();
  const shown = groups.filter(group => !selectedId || group.id === selectedId);
  const query = search.trim().toLocaleLowerCase("id");
  return <div className="admin-menu-main">
    <div className="admin-menu-intro">
      <span className="admin-menu-eyebrow">PANBOY COMMUNITY · ADMIN PANEL</span>
      <h1>{selectedId ? shown[0]?.label : "Menu Admin"}</h1>
      <p>{selectedId ? shown[0]?.description : "Pilih kategori, lalu buka pengaturan yang ingin dikelola."}</p>
      <div className="admin-menu-actions">
        {selectedId && <a className="admin-menu-back" href="/admin/menu">← Semua kategori</a>}
        <label className="admin-menu-search"><span>Cari menu</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari pengaturan..." type="search" /></label>
      </div>
    </div>
    <div className="admin-menu-groups">
      {shown.map(group => {
        const items = group.items.filter(item => !query || `${group.label} ${item.label} ${item.description}`.toLocaleLowerCase("id").includes(query));
        if (!items.length) return null;
        const groupCount = group.items.reduce((sum, item) => sum + (item.alert ? alerts[item.alert] : 0), 0);
        return <section className="admin-menu-group" key={group.id} aria-labelledby={`group-${group.id}`}>
          <div className="admin-menu-group-head"><PanboyIcon name={group.icon} /><div><h2 id={`group-${group.id}`}>{group.label}</h2><p>{group.description}</p></div>{groupCount > 0 && <span className="admin-menu-count" aria-label={`${groupCount} pemberitahuan menunggu`}>{groupCount > 99 ? "99+" : groupCount}</span>}{!selectedId && <a href={`/admin/menu/${group.id}`} className="admin-menu-open">Lihat kategori →</a>}</div>
          <div className="admin-menu-cards">{items.map(item => {
            const count = item.alert ? alerts[item.alert] : 0;
            return <a href={item.href} className="admin-menu-card" key={item.href} aria-label={`${item.label}${count ? `, ${count} menunggu tindakan` : ""}`}>
              <span className="admin-menu-card-icon"><PanboyIcon name={item.icon} />{count > 0 && <span className="admin-member-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span>}</span>
              <strong>{item.label}</strong><span className="admin-menu-description">{item.description}</span><span className="admin-menu-card-arrow" aria-hidden="true">↗</span>
            </a>;
          })}</div>
        </section>;
      })}
      {query && !shown.some(group => group.items.some(item => `${group.label} ${item.label} ${item.description}`.toLocaleLowerCase("id").includes(query))) && <p className="admin-menu-empty">Menu tidak ditemukan.</p>}
    </div>
  </div>;
}
