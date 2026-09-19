import { redirect } from "next/navigation";
import React, { Suspense } from "react";

import { type AdminOwnerTab, getAdminOwnersOperations } from "@/app/actions/adminOwnerActions";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminOwnersClient from "@/components/admin/AdminOwnersClient";
import Skeleton from "@/components/ui/Skeleton";
import { StatCardSkeleton } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonRows,
} from "@/components/ui/Table";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Space Owners",
};

const ADMIN_OWNER_TABS = new Set<AdminOwnerTab>([
  "all",
  "verified",
  "pending",
  "withListings",
  "gstRegistered",
]);

function OwnersSkeleton() {
  return (
    <div className="w-full space-y-6" aria-label="Loading space owners">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg" />
        ))}
      </div>

      <Table
        footer={
          <TablePagination
            page={1}
            pageSize={10}
            total={0}
            label="owners"
            className="opacity-50 pointer-events-none"
          />
        }
      >
        <TableHeader>
          <TableRow>
            <TableHead>Owner</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-center">Verification</TableHead>
            <TableHead className="text-center">Spaces</TableHead>
            <TableHead>Bank / Payout</TableHead>
            <TableHead className="text-center">GST Status</TableHead>
            <TableHead className="text-right">Bookings & GMV</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableSkeletonRows rows={10} columns={9} />
        </TableBody>
      </Table>
    </div>
  );
}

async function OwnersData({
  tab,
  page,
  pageSize,
  search,
}: {
  tab: AdminOwnerTab;
  page: number;
  pageSize: number;
  search?: string;
}) {
  const data = await getAdminOwnersOperations({ tab, page, pageSize, search });
  return <AdminOwnersClient {...data} searchQuery={search || ""} />;
}

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; pageSize?: string; q?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin");
  if (!isAdmin(currentUser.role)) redirect("/");

  const { page, tab: requestedTab, pageSize, q: search } = await searchParams;

  const tab = ADMIN_OWNER_TABS.has(requestedTab as AdminOwnerTab)
    ? (requestedTab as AdminOwnerTab)
    : "all";

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 10;

  return (
    <Suspense fallback={<OwnersSkeleton />}>
      <OwnersData
        tab={tab}
        page={currentPage}
        pageSize={currentPageSize}
        search={search}
      />
    </Suspense>
  );
}
