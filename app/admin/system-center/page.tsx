import { notFound } from "next/navigation";
import { requireAdminPage } from "../../../lib/admin-auth";
import CapacityPanel from "./capacity-panel";
import PanboyIcon, {type IconName} from "../../panboy-icon";
import Builder from "./builder";
import Notifications from "./notifications";
import Inventory from "./inventory";
import "./system-center.css";
export const dynamic = "force-dynamic";
const modules: {label:string; icon:IconName; href?:string; description:string}[] = [
 {label:"Website Control Center",icon:"settings",href:"#builder",description:"Susun section, menu, preview dan riwayat perubahan."},
 {label:"Database & Storage",icon:"database",href:"#capacity",description:"Kapasitas, jumlah file dan data per tabel."},
 {label:"Smart Cleanup",icon:"trash",href:"#inventory",description:"Tinjau ukuran dan umur file sebelum membersihkan."},
 {label:"Backup & Restore",icon:"sync",description:"Memerlukan dukungan pemulihan penyedia."},
 {label:"Recycle Bin",icon:"trash",href:"/admin/sampah",description:"Data event yang sudah dipindahkan ke sampah."},
 {label:"System Health",icon:"live",href:"#health",description:"Ukur respons database dan storage."},
 {label:"Error Monitoring",icon:"audit",description:"Pencatatan error lintas fitur belum tersedia."},
 {label:"Activity Log",icon:"audit",href:"/admin/audit",description:"Riwayat tindakan admin yang tercatat."},
 {label:"Feature Manager",icon:"settings",href:"/admin/fitur",description:"Pengaturan fitur yang tersedia."},
 {label:"Media Library",icon:"media",href:"#inventory",description:"Inventaris file storage dan pencarian."},
 {label:"Security Center",icon:"admin",description:"Pengelolaan sesi dan keamanan belum tersedia."},
 {label:"Maintenance Mode",icon:"handle",description:"Pengaturan maintenance belum tersedia."},
 {label:"Notification Center",icon:"registration",href:"#notifications",description:"Pengajuan dan data yang memerlukan tindakan."},
 {label:"Website Analytics",icon:"analytics",href:"/admin/analitik",description:"Statistik kunjungan website."},
 {label:"Admin Permission",icon:"management",href:"/admin/akses",description:"Kelola akses admin yang tersedia."},
 {label:"Data Archive",icon:"database",description:"Pengarsipan data belum tersedia."},
];
export default async function Page() {
 const admin=await requireAdminPage("/admin/system-center");
 if(!admin.isOwner)notFound();
 return <main className="sc-shell"><header className="sc-header"><a href="/admin/menu"><img src="/panboy-logo.png" alt="Panboy"/> PANBOY ID</a><a className="sc-button" href="/admin/menu">← Menu Admin</a></header>
 <div className="sc-content"><div className="sc-hero"><span>ADMIN UTAMA / PENGELOLAAN SISTEM</span><h1>System Center</h1><p>Pantau kapasitas, kesehatan sistem, dan pengelolaan website dari satu tempat.</p></div>
 <nav className="sc-grid" aria-label="Modul System Center">{modules.map(m=>{
 const content=<><div className="sc-card-top"><span className="sc-icon"><PanboyIcon name={m.icon}/></span><span className={m.href?"sc-ready":"sc-pending"}>{m.href?"Tersedia":"Belum tersedia"}</span></div><h2>{m.label}</h2><p>{m.description}</p>{m.href&&<span className="sc-arrow">Buka modul ↗</span>}</>;
 return m.href?<a className="sc-card" key={m.label} href={m.href}>{content}</a>:<article className="sc-card sc-disabled" key={m.label}>{content}</article>;
 })}</nav><CapacityPanel/><Notifications/><Builder/><Inventory/></div></main>;
}
