import { redirect } from "next/navigation";

import { adminHomeFor } from "@/constants/adminNav";
import { requireAdminPage } from "@/lib/admin/guard";

export default async function AdminDashboardPage() {
  const currentUser = await requireAdminPage();
  redirect(adminHomeFor(currentUser.role));
}
