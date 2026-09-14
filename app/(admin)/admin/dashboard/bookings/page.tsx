import { redirect } from "next/navigation";
import React, { Suspense } from "react";

import { type AdminBookingTab, getAdminBookingOperations } from "@/app/actions/adminBookingActions";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminBookingsClient from "@/components/admin/AdminBookingsClient";
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

function BookingsSkeleton() {
  return (
    <div className="w-full space-y-6" aria-label="Loading bookings operations">
      <div className="flex items-center justify-end">
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

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
}: {
  tab: AdminBookingTab;
  page: number;
  pageSize: number;
}) {
  const data = await getAdminBookingOperations({ tab, page, pageSize });
  return <AdminBookingsClient {...data} />;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; pageSize?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin");
  if (!isAdmin(currentUser.role)) redirect("/");

  const { page, tab: requestedTab, pageSize } = await searchParams;
  if (requestedTab === "jobLogs") {
    redirect("/admin/dashboard/logs");
  }
  const tab = ADMIN_BOOKING_TABS.has(requestedTab as AdminBookingTab)
    ? (requestedTab as AdminBookingTab)
    : "bookings";

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 10;

  return (
    <Suspense fallback={<BookingsSkeleton />}>
      <BookingsData tab={tab} page={currentPage} pageSize={currentPageSize} />
    </Suspense>
  );
}
