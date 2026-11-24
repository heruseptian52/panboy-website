import { requireAdminPage } from "../../../../lib/admin-auth";
import OtherExpensesClient from "./other-client";
export const dynamic="force-dynamic";
export default async function Page(){
 const admin=await requireAdminPage("/admin/keuangan/operasional");
 if(!admin.isOwner)return <main className="admin-shell"><div className="access-card"><h1>Hanya Admin Utama yang dapat membuka pengeluaran operasional khusus.</h1><a href="/admin">KEMBALI KE ADMIN</a></div></main>;
 return <main className="admin-shell"><div className="finance-admin"><a href="/admin/keuangan">← KEMBALI KE KEUANGAN</a><h1>PENGELUARAN LAIN / OPERASIONAL</h1><p>Pengembangan website dan kebutuhan Panboy di luar event dicatat di sini. Dana diambil dari kas operasional dan tidak masuk ke iuran bulanan atau laporan event member.</p><OtherExpensesClient/></div></main>;
}
