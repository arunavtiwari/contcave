import React, { Suspense } from "react";

import { getAdminListingReviewPage } from "@/app/actions/listingActions";
import AdminListingsClient from "@/components/admin/AdminListingsClient";
import { AdminListingsPageSkeleton } from "@/components/admin/AdminListingSkeletonRows";
import { requireAdminPage } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

type SearchParams = { page?: string; pageSize?: string; status?: string; view?: string; q?: string; city?: string };

async function ListingsData({
    page,
    pageSize,
    selectedStatus,
    listingType,
    search,
    city,
}: {
    page: number;
    pageSize: number;
    selectedStatus: "ALL" | "PENDING" | "VERIFIED" | "REJECTED";
    listingType: "STANDARD" | "CURATED";
    search: string;
    city: string;
}) {
    const data = await getAdminListingReviewPage({
        page,
        pageSize,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        listingType,
        search,
        city,
    });

    return <AdminListingsClient {...data} selectedStatus={selectedStatus} listingType={listingType} />;
}

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    await requireAdminPage("listings.manage");

    const params = await searchParams;
    const selectedStatus = ["ALL", "PENDING", "VERIFIED", "REJECTED"].includes(params.status || "")
        ? (params.status as "ALL" | "PENDING" | "VERIFIED" | "REJECTED")
        : "PENDING";
    const listingType = params.view === "CURATED" ? "CURATED" : "STANDARD";
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 10;

    return (
        <Suspense fallback={<AdminListingsPageSkeleton />}>
            <ListingsData
                page={page}
                pageSize={pageSize}
                selectedStatus={selectedStatus}
                listingType={listingType}
                search={params.q?.trim() || ""}
                city={params.city?.trim() || ""}
            />
        </Suspense>
    );
}
