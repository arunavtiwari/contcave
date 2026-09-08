import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getAdminListingReviewPage } from "@/app/actions/listingActions";
import AdminListingsClient from "@/components/admin/AdminListingsClient";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

type SearchParams = { page?: string; status?: string; view?: string };

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/admin");
    if (!isAdmin(currentUser.role)) redirect("/");

    const params = await searchParams;
    const selectedStatus = ["ALL", "PENDING", "VERIFIED", "REJECTED"].includes(params.status || "")
        ? params.status as "ALL" | "PENDING" | "VERIFIED" | "REJECTED"
        : "PENDING";
    const listingType = params.view === "CURATED" ? "CURATED" : "STANDARD";
    const page = Number(params.page) || 1;
    const data = await getAdminListingReviewPage({ page, pageSize: 20, status: selectedStatus === "ALL" ? undefined : selectedStatus, listingType });

    return <AdminListingsClient {...data} selectedStatus={selectedStatus} listingType={listingType} />;
}
