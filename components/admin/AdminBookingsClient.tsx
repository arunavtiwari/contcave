"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FiDownload, FiPlus } from "react-icons/fi";
import { toast } from "sonner";

import {
  AdminAuditRow,
  AdminBookingDetail,
  AdminBookingRow,
  AdminInvoiceRow,
  AdminPayoutRow,
  AdminVoucherRow,
  getAdminBookingDetailAction,
  getAdminBookingOperations,
  markPayoutPaidManuallyAction,
  retryAdminInvoiceEmailAction,
  retryAdminVoucherEmailAction,
} from "@/app/actions/adminBookingActions";
import AdminTabs from "@/components/admin/AdminTabs";
import AuditTable from "@/components/admin/bookings/AuditTable";
import BookingDetailModal from "@/components/admin/bookings/BookingDetailModal";
import BookingsTable from "@/components/admin/bookings/BookingsTable";
import InvoicesTable from "@/components/admin/bookings/InvoicesTable";
import PayoutsTable from "@/components/admin/bookings/PayoutsTable";
import VouchersTable from "@/components/admin/bookings/VouchersTable";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatCard from "@/components/ui/StatCard";
import { TablePagination } from "@/components/ui/Table";
import { type AdminBookingTab, bookingTabsFor } from "@/lib/admin/bookingTabs";
import { downloadCsv } from "@/lib/csv";
import { formatINR } from "@/lib/utils";
import type { UserRole } from "@/types/user";

// Form-heavy and only reachable behind a button, so its bundle stays out of the initial
// page load rather than shipping with every bookings table render.
const CreateOfflineBookingModal = dynamic(
  () => import("@/components/admin/CreateOfflineBookingModal"),
  { ssr: false }
);

type Props = {
  bookings: AdminBookingRow[];
  bookingTotal: number;
  activeTab: Tab;
  operationPage: number;
  operationPageSize: number;
  operationTotal: number;
  tabCounts: Record<Tab, number>;
  customerInvoiceTotal: number;
  pendingCustomerInvoiceTotal: number;
  ownerInvoices: AdminInvoiceRow[];
  vouchers: AdminVoucherRow[];
  failures: AdminInvoiceRow[];
  payouts: AdminPayoutRow[];
  audits: AdminAuditRow[];
  role: UserRole;
  /** Retry emails, mark payouts paid and create bookings; finance staff only view. */
  canManage: boolean;
};

type Tab = AdminBookingTab;

export default function AdminBookingsClient({
  bookings,
  activeTab: tab,
  operationPage,
  operationPageSize,
  operationTotal,
  tabCounts,
  customerInvoiceTotal,
  pendingCustomerInvoiceTotal,
  ownerInvoices,
  vouchers,
  failures,
  payouts,
  audits,
  role,
  canManage,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState({
    bookings,
    bookingTotal: bookings.length,
    activeTab: tab,
    operationPage,
    operationPageSize,
    operationTotal,
    tabCounts,
    customerInvoiceTotal,
    pendingCustomerInvoiceTotal,
    ownerInvoices,
    vouchers,
    failures,
    payouts,
    audits,
  });

  const [prevProps, setPrevProps] = useState({
    bookings,
    activeTab: tab,
    operationPage,
    operationPageSize,
    operationTotal,
  });

  if (
    bookings !== prevProps.bookings ||
    tab !== prevProps.activeTab ||
    operationPage !== prevProps.operationPage ||
    operationPageSize !== prevProps.operationPageSize ||
    operationTotal !== prevProps.operationTotal
  ) {
    setPrevProps({
      bookings,
      activeTab: tab,
      operationPage,
      operationPageSize,
      operationTotal,
    });
    setData({
      bookings,
      bookingTotal: bookings.length,
      activeTab: tab,
      operationPage,
      operationPageSize,
      operationTotal,
      tabCounts,
      customerInvoiceTotal,
      pendingCustomerInvoiceTotal,
      ownerInvoices,
      vouchers,
      failures,
      payouts,
      audits,
    });
  }

  const [optimisticTab, setOptimisticTab] = useState<Tab>(tab);
  const [prevTab, setPrevTab] = useState<Tab>(tab);
  if (tab !== prevTab) {
    setPrevTab(tab);
    setOptimisticTab(tab);
  }

  const [isNavigating, startNavTransition] = useTransition();
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [pendingVoucherId, setPendingVoucherId] = useState<string | null>(null);
  const [manualPayout, setManualPayout] = useState<AdminPayoutRow | null>(null);
  const [manualPayoutReference, setManualPayoutReference] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
  const [bookingDetail, setBookingDetail] = useState<AdminBookingDetail | null>(null);
  const [isCreateOfflineBookingModalOpen, setIsCreateOfflineBookingModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const navigateTab = (
    nextTab: Tab,
    nextPage = 1,
    nextPageSize = data.operationPageSize
  ) => {
    setOptimisticTab(nextTab);
    const search = new URLSearchParams({
      tab: nextTab,
      page: String(nextPage),
      pageSize: String(nextPageSize),
    });
    window.history.pushState(null, "", `/admin/dashboard/bookings?${search.toString()}`);

    startNavTransition(async () => {
      try {
        const res = await getAdminBookingOperations({
          tab: nextTab,
          page: nextPage,
          pageSize: nextPageSize,
        });
        setData(res);
      } catch {
        toast.error("Failed to load booking operations");
      }
    });
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const t = (params.get("tab") as Tab) || "bookings";
      const p = Number(params.get("page")) || 1;
      const ps = Number(params.get("pageSize")) || data.operationPageSize;
      setOptimisticTab(t);
      startNavTransition(async () => {
        try {
          const res = await getAdminBookingOperations({ tab: t, page: p, pageSize: ps });
          setData(res);
        } catch {
          toast.error("Failed to load booking operations");
        }
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [data.operationPageSize]);

  const activeRows = useMemo(() => {
    if (optimisticTab === "bookings") return data.bookings;
    if (optimisticTab === "ownerInvoices") return data.ownerInvoices;
    if (optimisticTab === "vouchers") return data.vouchers;
    if (optimisticTab === "payouts") return data.payouts;
    if (optimisticTab === "failures") return data.failures;
    return data.audits;
  }, [data.audits, data.bookings, data.failures, data.ownerInvoices, data.payouts, data.vouchers, optimisticTab]);

  const retryInvoice = (invoiceId: string) => {
    setPendingInvoiceId(invoiceId);
    startTransition(async () => {
      const res = await retryAdminInvoiceEmailAction({ invoiceId });
      setPendingInvoiceId(null);
      if (!res.success) {
        toast.error(res.error || "Invoice retry failed");
        return;
      }
      toast.success("Invoice email retry queued");
      router.refresh();
    });
  };

  const confirmManualPayout = () => {
    if (!manualPayout) return;
    const payout = manualPayout;
    startTransition(async () => {
      const res = await markPayoutPaidManuallyAction({
        transactionId: payout.id,
        reference: manualPayoutReference.trim() || undefined,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "Couldn't mark the payout as paid");
        return;
      }
      const paidAt = res.data.paidAt;
      setData((current) => ({
        ...current,
        payouts: current.payouts.map((row) => (row.id === payout.id ? { ...row, payoutSplitAt: paidAt, payoutDoneAt: paidAt } : row)),
      }));
      setManualPayout(null);
      setManualPayoutReference("");
      toast.success("Payout marked as paid. It won't be paid out automatically.");
      router.refresh();
    });
  };

  const retryVoucher = (voucherId: string) => {
    setPendingVoucherId(voucherId);
    startTransition(async () => {
      const res = await retryAdminVoucherEmailAction({ voucherId });
      setPendingVoucherId(null);
      if (!res.success) {
        toast.error(res.error || "Receipt/refund retry failed");
        return;
      }
      toast.success("Receipt/refund email retry queued");
      router.refresh();
    });
  };

  // Tracks which booking the open drawer is for, so a slow response for a row the admin
  // has already navigated away from is discarded instead of overwriting the current one.
  const openBookingIdRef = useRef<string | null>(null);

  const openBookingDetail = useCallback(async (booking: AdminBookingRow) => {
    openBookingIdRef.current = booking.id;
    setSelectedBooking(booking);
    setBookingDetail(null);

    const res = await getAdminBookingDetailAction({ reservationId: booking.id });
    if (openBookingIdRef.current !== booking.id) return;

    if (!res.success || !res.data) {
      toast.error(res.error || "Failed to load booking details");
      openBookingIdRef.current = null;
      setSelectedBooking(null);
      return;
    }

    setBookingDetail(res.data as AdminBookingDetail);
  }, []);

  const closeBookingDetail = useCallback(() => {
    openBookingIdRef.current = null;
    setSelectedBooking(null);
    setBookingDetail(null);
  }, []);

  const paginationFooter = (
    <TablePagination
      page={data.operationPage}
      pageSize={data.operationPageSize}
      total={data.operationTotal}
      pageSizeOptions={[10, 20, 50]}
      label={optimisticTab === "bookings" ? "bookings" : optimisticTab === "payouts" ? "payouts" : "records"}
      hrefForPage={(page, size) => `/admin/dashboard/bookings?tab=${optimisticTab}&page=${page}&pageSize=${size || data.operationPageSize}`}
      onPageSizeChange={(newSize) => navigateTab(optimisticTab, 1, newSize)}
      onPageChange={(page) => navigateTab(optimisticTab, page, data.operationPageSize)}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        {canManage && (
          <Button
            label="Create Booking"
            icon={FiPlus}
            fit
            size="sm"
            onClick={() => setIsCreateOfflineBookingModalOpen(true)}
          />
        )}
        <Button
          label="Export CSV"
          icon={FiDownload}
          fit
          size="sm"
          outline
          onClick={() => downloadCsv(`contcave-${optimisticTab}.csv`, activeRows as Array<Record<string, unknown>>)}
          disabled={activeRows.length === 0 || isNavigating}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Bookings" value={data.tabCounts.bookings} />
        <StatCard label="Customer Invoices" value={data.customerInvoiceTotal} />
        <StatCard label="Pending Invoices" value={data.pendingCustomerInvoiceTotal} />
        <StatCard label="Owner Invoices" value={data.tabCounts.ownerInvoices} />
        <StatCard label="Receipts & Refunds" value={data.tabCounts.vouchers} />
        <StatCard label="Payouts" value={data.tabCounts.payouts} />
      </div>

      <AdminTabs
        activeId={optimisticTab}
        ariaLabel="Booking operations views"
        onSelect={(nextTab) => navigateTab(nextTab as Tab, 1, data.operationPageSize)}
        items={bookingTabsFor(role).map((item) => ({
          id: item.key,
          label: item.label,
          count: data.tabCounts[item.key],
          href: `/admin/dashboard/bookings?tab=${item.key}&page=1`,
        }))}
      />

      {optimisticTab === "bookings" && (
        <BookingsTable
          rows={data.bookings}
          footer={paginationFooter}
          isLoading={isNavigating}
          pageSize={data.operationPageSize}
          onOpenDetail={openBookingDetail}
        />
      )}

      {(optimisticTab === "ownerInvoices" || optimisticTab === "failures") && (
        <InvoicesTable
          rows={activeRows as AdminInvoiceRow[]}
          footer={paginationFooter}
          isLoading={isNavigating}
          pageSize={data.operationPageSize}
          canManage={canManage}
          isPending={isPending}
          pendingId={pendingInvoiceId}
          onRetry={retryInvoice}
        />
      )}

      {optimisticTab === "vouchers" && (
        <VouchersTable
          rows={data.vouchers}
          footer={paginationFooter}
          isLoading={isNavigating}
          pageSize={data.operationPageSize}
          canManage={canManage}
          isPending={isPending}
          pendingId={pendingVoucherId}
          onRetry={retryVoucher}
        />
      )}

      {optimisticTab === "payouts" && (
        <PayoutsTable
          rows={data.payouts}
          footer={paginationFooter}
          isLoading={isNavigating}
          pageSize={data.operationPageSize}
          canManage={canManage}
          onMarkPaid={(payout) => { setManualPayout(payout); setManualPayoutReference(""); }}
        />
      )}

      <Modal
        isOpen={Boolean(manualPayout)}
        onCloseAction={() => !isPending && setManualPayout(null)}
        onSubmitAction={confirmManualPayout}
        title="Mark payout as paid"
        actionLabel={isPending ? "Saving..." : "Mark as paid"}
        secondaryActionLabel="Cancel"
        secondaryActionAction={() => setManualPayout(null)}
        disabled={isPending}
        body={
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-muted-foreground">
              Use this after you&apos;ve paid the studio yourself, for example with a manual Cashfree transfer.
              {" "}<span className="font-medium text-foreground">{formatINR(manualPayout?.payoutAmount || 0)}</span> for booking{" "}
              <span className="font-mono text-foreground">{manualPayout?.bookingId || manualPayout?.id}</span> ({manualPayout?.studioName}) will be
              recorded as paid and never paid out automatically.
            </p>
            <Input
              id="manual-payout-reference"
              label="Transfer reference (optional)"
              placeholder="Cashfree transfer ID or UTR"
              maxLength={120}
              value={manualPayoutReference}
              onChange={(event) => setManualPayoutReference(event.target.value)}
            />
          </div>
        }
      />

      {optimisticTab === "audit" && (
        <AuditTable
          rows={data.audits}
          footer={paginationFooter}
          isLoading={isNavigating}
          pageSize={data.operationPageSize}
        />
      )}

      <BookingDetailModal
        booking={selectedBooking}
        detail={bookingDetail}
        onClose={closeBookingDetail}
      />

      <CreateOfflineBookingModal
        isOpen={isCreateOfflineBookingModalOpen}
        onClose={() => setIsCreateOfflineBookingModalOpen(false)}
        onSuccess={() => {
          setIsCreateOfflineBookingModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
