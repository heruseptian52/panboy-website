import { notFound } from "next/navigation";
import { requireAdminPage } from "../../../../lib/admin-auth";
import { menuGroups } from "../../menu-data";
import MenuShell from "../menu-shell";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const admin = await requireAdminPage(`/admin/menu/${category}`);
  const groups = menuGroups(admin);
  if (!groups.some(group => group.id === category)) notFound();
  return <MenuShell groups={groups} selectedId={category} />;
}
