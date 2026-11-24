import BlacklistBrowser from "./viewer";
import "./style.css";
export const dynamic="force-dynamic";
export const metadata={title:"Blacklist Player | Panboy Community",description:"Daftar player yang telah diperiksa oleh admin Panboy Community."};
export default function Page(){return <main className="blacklist-page"><header><a href="/">← BERANDA</a><strong>BLACKLIST PLAYER</strong><a href="/member">MEMBER</a></header><div className="blacklist-wrap"><h1>BLACKLIST PLAYER</h1><p>Daftar berikut ditampilkan setelah pengajuan member disetujui admin.</p><BlacklistBrowser/></div></main>}
