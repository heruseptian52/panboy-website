import { requireAdminPage } from "../../../lib/admin-auth";
import { menuGroups } from "../menu-data";
import MenuShell from "./menu-shell";
export const dynamic = "force-dynamic";
export default async function Page() {
  const admin = await requireAdminPage("/admin/menu");
  return <MenuShell groups={menuGroups(admin)} />;
}
