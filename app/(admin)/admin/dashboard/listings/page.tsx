import { redirect } from "next/navigation";
import React, { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getAdminListingReviewPage } from "@/app/actions/listingActions";
import AdminListingsClient from "@/components/admin/AdminListingsClient";
import { AdminListingsPageSkeleton } from "@/components/admin/AdminListingSkeletonRows";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

type SearchParams = { page?: string; pageSize?: string; status?: string; view?: string };

async function ListingsData({
    page,
    pageSize,
    selectedStatus,
    listingType,
}: {
    page: number;
    pageSize: number;
    selectedStatus: "ALL" | "PENDING" | "VERIFIED" | "REJECTED";
    listingType: "STANDARD" | "CURATED";
}) {
    const data = await getAdminListingReviewPage({
        page,
        pageSize,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        listingType,
    });

    return <AdminListingsClient {...data} selectedStatus={selectedStatus} listingType={listingType} />;
}

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/admin");
    if (!isAdmin(currentUser.role)) redirect("/");

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
            />
        </Suspense>
    );
}
