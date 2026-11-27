import {requireAdminPage} from "../../../../lib/admin-auth";
import {getSettings} from "../../../../lib/settings";
import RequirementsAdmin from "./requirements-admin";
export const dynamic="force-dynamic";
export default async function RequirementsPage(){
  const a=await requireAdminPage("/admin/topup/requirements");
  if(!a.topup)return <main className="admin-shell"><div className="access-card"><h1>Akses ditolak</h1></div></main>;
  const s=await getSettings();
  return <main className="admin-shell"><section className="admin-content topup-admin"><div className="admin-title"><div><small>DIGITAL STORE</small><h1>KEBUTUHAN INPUT</h1><p>Atur data tujuan yang diminta dari pelanggan per kategori.</p></div><a href="/admin/topup">← TOP UP</a></div><RequirementsAdmin initial={s.topupInputRequirementsJson||"{}"}/></section></main>;
}
