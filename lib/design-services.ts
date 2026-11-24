import { env } from "cloudflare:workers";

export type DesignService = { id:number; name:string; description:string; icon:string; sortOrder:number; active:number };
export type DesignPortfolio = { id:number; title:string; description:string; category:string; imageUrl:string; sortOrder:number; active:number };
const services = [
  ["PEMBUATAN LOGO","Logo team esports, komunitas, event, brand, sponsor, redesign, emblem, dan maskot.","✦"],
  ["DESIGN EVENT","Poster event, banner, thumbnail, bracket, jadwal, leaderboard, sertifikat, dan konten Instagram.","▣"],
  ["DESIGN TEAM & BRANDING","Design jersey, edit foto pemasangan jersey, identitas visual, banner team, dan konten media sosial.","◈"],
  ["JASA HANDLE EVENT","Pendaftaran peserta, room, spectate, hitung poin, leaderboard, admin, rekap hasil, dan pendampingan event.","◆"],
  ["JASA LIVE STREAMING","Live YouTube, observer, overlay, scoreboard, sponsor, caster, replay, highlight, dan dual observer.","▶"],
];
export async function ensureDesignTables(){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS design_services (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,description TEXT NOT NULL,icon TEXT NOT NULL DEFAULT '✦',sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS design_portfolios (id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,image_url TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1)").run();
  const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM design_services").first<{n:number}>();
  if(!Number(count?.n)){for(let i=0;i<services.length;i++){const [name,description,icon]=services[i];await env.DB.prepare("INSERT INTO design_services(name,description,icon,sort_order) VALUES(?,?,?,?)").bind(name,description,icon,i).run();}}
}
export async function getDesignServices(){const r=await env.DB.prepare("SELECT MIN(id) AS id,name,MAX(description) AS description,MAX(icon) AS icon,MIN(sort_order) AS sortOrder,MAX(active) AS active FROM design_services WHERE active=1 GROUP BY name ORDER BY sortOrder,id").all<DesignService>();return r.results;}
export async function getDesignPortfolios(){const r=await env.DB.prepare("SELECT id,title,description,category,image_url AS imageUrl,sort_order AS sortOrder,active FROM design_portfolios WHERE active=1 ORDER BY sort_order,id DESC").all<DesignPortfolio>();return r.results;}
