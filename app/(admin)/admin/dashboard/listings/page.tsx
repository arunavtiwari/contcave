import { getAdminListingReviews } from "@/app/actions/listingActions";
import AdminListingsClient from "@/components/admin/AdminListingsClient";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
    const listings = await getAdminListingReviews();

    return <AdminListingsClient listings={listings} />;
}
