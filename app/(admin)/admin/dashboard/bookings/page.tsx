import { redirect } from "next/navigation";

import { type AdminBookingTab, getAdminBookingOperations } from "@/app/actions/adminBookingActions";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminBookingsClient from "@/components/admin/AdminBookingsClient";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings",
};

const ADMIN_BOOKING_TABS = new Set<AdminBookingTab>([
  "bookings",
  "ownerInvoices",
  "vouchers",
  "payouts",
  "failures",
  "audit",
]);

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin");
  if (!isAdmin(currentUser.role)) redirect("/");

  const { page, tab: requestedTab } = await searchParams;
  const tab = ADMIN_BOOKING_TABS.has(requestedTab as AdminBookingTab)
    ? requestedTab as AdminBookingTab
    : "bookings";
  const data = await getAdminBookingOperations({ tab, page: Number(page) || 1, pageSize: 20 });
  const lastPage = Math.max(1, Math.ceil(data.operationTotal / data.operationPageSize));
  if (data.operationPage > lastPage) {
    redirect(`?tab=${tab}&page=${lastPage}`);
  }
  return <AdminBookingsClient {...data} />;
}
