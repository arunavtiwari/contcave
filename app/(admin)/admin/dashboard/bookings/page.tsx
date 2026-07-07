import { getAdminBookingOperations } from "@/app/actions/adminBookingActions";
import AdminBookingsClient from "@/components/admin/AdminBookingsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings",
};

export default async function AdminBookingsPage() {
  const data = await getAdminBookingOperations();
  return <AdminBookingsClient {...data} />;
}
