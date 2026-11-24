import type {RosterOptions} from "./roster-options";

type Entry = {
  teamName: string;
  contactPhone?: string;
  zones?: string[];
  players: Array<{nick:string;playerId:string}>;
  logoUrl?: string;
  logoName?: string;
};
const escape = (value: string) => String(value ?? "").replace(/[&<>"']/g, character =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]!);

export function rosterPrintHtml(title: string, maxPlayers: number, entries: Entry[], options: RosterOptions) {
  const pages = Array.from({length: Math.max(1, Math.ceil(entries.length / 12))}, (_, page) => {
    const cards = entries.slice(page * 12, (page + 1) * 12).map(entry => {
      const logo = options.logoEnabled ? `<div class="logo">${entry.logoUrl
        ? `<img src="${escape(entry.logoUrl)}" alt="Logo ${escape(entry.teamName)}">`
        : "Logo belum tersedia"}</div>` : "";
      const phone = options.phoneEnabled ? `<div class="detail"><b>Nomor HP</b><span>${escape(entry.contactPhone || "—")}</span></div>` : "";
      const zones = options.zonesEnabled ? options.maps.map((map, i) =>
        `<div class="detail"><b>${escape(map)}</b><span>${escape(entry.zones?.[i] || "—")}</span></div>`).join("") : "";
      const players = options.playersEnabled ? `<table><thead><tr><th>NICK</th><th>ID PUBG MOBILE</th></tr></thead><tbody>${
        Array.from({length: Math.max(maxPlayers, entry.players.length)}, (_, i) =>
          `<tr><td>${escape(entry.players[i]?.nick || "")}</td><td>${escape(entry.players[i]?.playerId || "")}</td></tr>`).join("")
      }</tbody></table>` : "";
      return `<section class="team"><h2>${escape(entry.teamName)}</h2>${logo}${phone}${zones}${players}</section>`;
    }).join("");
    const count = options.playersEnabled ? ` · ${entries.reduce((sum, entry) => sum + entry.players.length, 0)} PLAYER` : "";
    return `<div class="page"><header><small>PANBOY COMMUNITY · DATA TEAM EVENT</small><h1>${escape(title)}</h1><p>${entries.length} TEAM${count} · HALAMAN ${page+1}</p></header><main class="grid">${cards || "<p>Belum ada data team.</p>"}</main><footer>Panboy Community · Data team event</footer></div>`;
  }).join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Data team - ${escape(title)}</title><style>
@page{size:A3 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#171717;margin:0}.page{break-after:page}.page:last-child{break-after:auto}header{text-align:center;border-bottom:2px solid #161616;padding:0 0 10px;margin-bottom:14px}header small{font-size:10px;letter-spacing:2px;font-weight:bold;color:#67521e}h1{font-size:20px;margin:5px 0;text-transform:uppercase}header p{margin:0;font-size:10px;color:#555}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(4,auto);grid-auto-flow:column;gap:13px 18px;align-items:start}.team{break-inside:avoid;min-width:0}.team h2{margin:0;background:#d7ae42;border:1px solid #222;padding:6px;font-size:11px;text-align:center;overflow-wrap:anywhere}.detail{display:grid;grid-template-columns:42% 58%;border:1px solid #222;border-top:0;padding:5px;font-size:10px;overflow-wrap:anywhere}.detail b{font-weight:700}.logo{border:1px solid #222;border-top:0;padding:5px;font-size:10px;text-align:center}.logo img{display:block;max-height:40px;max-width:100%;margin:auto;object-fit:contain}.team table{width:100%;border-collapse:collapse;table-layout:fixed}.team th,.team td{border:1px solid #222;padding:5px;height:20px;overflow-wrap:anywhere;font-size:10px}.team th{background:#e6c46c}.team td:last-child{white-space:nowrap}footer{margin-top:16px;padding-top:7px;border-top:1px solid #999;font-size:9px;color:#555;text-align:center}@media(max-width:600px){.grid{grid-template-columns:1fr;grid-template-rows:none;grid-auto-flow:row}}@media print{.grid{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(4,auto);grid-auto-flow:column}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${pages}<script>window.onload=()=>window.print()<\/script></body></html>`;
}
