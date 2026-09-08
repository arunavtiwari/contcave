import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdmin } from "@/lib/user/permissions";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin");
  if (!isAdmin(currentUser.role)) redirect("/");
  redirect("/admin/dashboard/listings");
}
