import { redirect } from "next/navigation";
import React, { Suspense } from "react";

import { getAdminBookingOperations } from "@/app/actions/adminBookingActions";
import AdminBookingsClient from "@/components/admin/AdminBookingsClient";
import Skeleton from "@/components/ui/Skeleton";
import { StatCardSkeleton, StatGrid } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonRows,
} from "@/components/ui/Table";
import { type AdminBookingTab, bookingTabFor } from "@/lib/admin/bookingTabs";
import { requireAdminPage } from "@/lib/admin/guard";
import { can } from "@/lib/user/permissions";
import type { UserRole } from "@/types/user";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings",
};

function BookingsSkeleton() {
  return (
    <div className="w-full space-y-6" aria-label="Loading bookings operations">
      <div className="flex items-center justify-end">
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <StatGrid columns={6}>
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </StatGrid>

      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      <Table
        footer={
          <TablePagination
            page={1}
            pageSize={10}
            total={0}
            label="bookings"
            className="opacity-50 pointer-events-none"
          />
        }
      >
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Studio</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-center">GST</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Invoice</TableHead>
            <TableHead className="text-center">Receipts & Refunds</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableSkeletonRows rows={10} columns={11} />
        </TableBody>
      </Table>
    </div>
  );
}

async function BookingsData({
  tab,
  page,
  pageSize,
  role,
}: {
  tab: AdminBookingTab;
  page: number;
  pageSize: number;
  role: UserRole;
}) {
  const data = await getAdminBookingOperations({ tab, page, pageSize });
  return <AdminBookingsClient {...data} role={role} canManage={can(role, "bookings.manage")} />;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; pageSize?: string }>;
}) {
  const currentUser = await requireAdminPage("bookings.view");

  const { page, tab: requestedTab, pageSize } = await searchParams;
  if (requestedTab === "jobLogs") {
    redirect("/admin/dashboard/logs");
  }
  const tab = bookingTabFor(currentUser.role, requestedTab);

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 10;

  return (
    <Suspense fallback={<BookingsSkeleton />}>
      <BookingsData tab={tab} page={currentPage} pageSize={currentPageSize} role={currentUser.role} />
    </Suspense>
  );
}
