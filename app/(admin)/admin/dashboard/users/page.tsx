import { getAdminUsers } from "@/app/actions/adminUserActions";
import AdminUsersClient from "@/components/admin/AdminUsersClient";
import { requireAdminPage } from "@/lib/admin/guard";
import { userRoleTabOf } from "@/lib/admin/userRoles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Users",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; pageSize?: string; q?: string }>;
}) {
  const currentUser = await requireAdminPage("users.manage");
  const { tab, page, pageSize, q } = await searchParams;
  const data = await getAdminUsers({ tab: userRoleTabOf(tab), page: Number(page), pageSize: Number(pageSize), search: q });

  return <AdminUsersClient {...data} search={q?.trim() ?? ""} currentUserId={currentUser.id} />;
}
