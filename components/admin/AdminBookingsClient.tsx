"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FiDownload, FiExternalLink, FiEye, FiFileText, FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";

import {
  AdminAuditRow,
  AdminBookingRow,
  AdminInvoiceRow,
  AdminPayoutRow,
  AdminVoucherRow,
  getAdminBookingOperations,
  retryAdminInvoiceEmailAction,
  retryAdminVoucherEmailAction,
} from "@/app/actions/adminBookingActions";
import AdminTabs from "@/components/admin/AdminTabs";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import StatCard from "@/components/ui/StatCard";
import {
  EmptyTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonRows,
} from "@/components/ui/Table";
import Tooltip from "@/components/ui/Tooltip";
import { downloadCsv } from "@/lib/csv";
import { formatINR, formatISTDate, formatISTDateTime } from "@/lib/utils";

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
};

type Tab = "bookings" | "ownerInvoices" | "vouchers" | "payouts" | "failures" | "audit";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "bookings", label: "Bookings" },
  { key: "ownerInvoices", label: "Owner Invoices" },
  { key: "vouchers", label: "Receipts & Refunds" },
  { key: "payouts", label: "Payouts" },
  { key: "failures", label: "Failures" },
  { key: "audit", label: "Document Audit" },
];

function statusVariant(status: string) {
  if (["SUCCESS", "EMAIL_SENT", "STORED", "GENERATED"].includes(status)) return "success";
  if (["FAILED", "EMAIL_FAILED", "DELIVERY_BLOCKED"].includes(status)) return "destructive";
  return "warning";
}

function bookingStatus(booking: AdminBookingRow) {
  if (booking.paymentStatus === "FAILED") return { label: "Payment Failed", variant: "destructive" as const };
  if (booking.paymentStatus === "SUCCESS") return { label: "Paid Pending Approval", variant: "warning" as const };
  if (booking.paymentStatus === "NO_PAYMENT") return { label: "Payment Missing", variant: "secondary" as const };
  return { label: "Payment Pending", variant: "warning" as const };
}

function documentDelivery(document: { emailSentAt?: string | null; status: string }) {
  if (document.emailSentAt) return { label: "Sent", variant: "success" as const };
  if (document.status === "EMAIL_FAILED" || document.status === "DELIVERY_BLOCKED") return { label: "Failed", variant: "destructive" as const };
  if (document.status === "RETRYING") return { label: "Retrying", variant: "warning" as const };
  return { label: "Queued", variant: "warning" as const };
}

function gstModelLabel(value: AdminBookingRow["gstModel"]) {
  if (value === "GST_STUDIO_AGENT") return "GST Studio";
  if (value === "NON_GST_PRINCIPAL") return "Non-GST";
  return "Unknown";
}

function gstModelVariant(value: AdminBookingRow["gstModel"]) {
  if (value === "GST_STUDIO_AGENT") return "success";
  if (value === "NON_GST_PRINCIPAL") return "warning";
  return "secondary";
}

function invoiceTypeLabel(value: AdminInvoiceRow["documentType"]) {
  return value
    .replace("CUSTOMER_STUDIO_TAX_INVOICE", "Customer - Studio Tax")
    .replace("CUSTOMER_ARKANET_TAX_INVOICE", "Customer - Arkanet Tax")
    .replace("OWNER_MONTHLY_COMMISSION_INVOICE", "Owner - Commission")
    .replace("OWNER_MONTHLY_BILL_OF_SUPPLY", "Owner - Bill of Supply")
    .replace(/_/g, " ");
}

function voucherTypeLabel(value: AdminVoucherRow["voucherType"]) {
  return value === "REFUND_VOUCHER" ? "Refund Voucher" : "Receipt Voucher";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeAddons(value: unknown) {
  return asArray(value)
    .map((item) => {
      const record = asRecord(item);
      const name = typeof record.name === "string" ? record.name : "";
      if (!name) return null;
      return {
        name,
        qty: Number(record.qty || 1),
        price: Number(record.price || 0),
      };
    })
    .filter((item): item is { name: string; qty: number; price: number } => Boolean(item));
}

function formatDateTimeRange(booking: AdminBookingRow) {
  return `${formatISTDate(booking.startDate)} | ${booking.detail.startTime} - ${booking.detail.endTime}`;
}

function MutedDash({ title = "Unavailable" }: { title?: string }) {
  return (
    <Tooltip content={title}>
      <span className="cursor-default text-muted-foreground">
        -
      </span>
    </Tooltip>
  );
}

function CompactPill({
  label,
  variant,
  title,
}: {
  label: React.ReactNode;
  variant: React.ComponentProps<typeof Pill>["variant"];
  title?: string;
}) {
  const pill = (
    <Pill
      label={<span className="whitespace-nowrap">{label}</span>}
      variant={variant}
      size="xs"
      className="tracking-normal"
    />
  );
  if (title) {
    return <Tooltip content={title}>{pill}</Tooltip>;
  }
  return pill;
}

function InvoiceSummary({ booking }: { booking: AdminBookingRow }) {
  if (!booking.customerInvoiceNumber) {
    return <CompactPill label="Pending" variant="warning" />;
  }

  return (
    <div className="flex max-w-full items-center justify-center gap-2">
      <div className="min-w-0">
        <div className="truncate font-mono text-xs text-foreground">{booking.customerInvoiceNumber}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {booking.customerInvoiceStatus ? (
            <CompactPill label={booking.customerInvoiceStatus} variant={statusVariant(booking.customerInvoiceStatus)} />
          ) : null}
          <CompactPill
            label={booking.customerInvoiceEmailSentAt ? "Sent" : "Queued"}
            variant={booking.customerInvoiceEmailSentAt ? "success" : "warning"}
          />
        </div>
      </div>
      {booking.customerInvoiceUrl ? (
        <Button
          href={booking.customerInvoiceUrl}
          target="_blank"
          icon={FiEye}
          isIconOnly
          outline
          aria-label="View customer invoice"
          tooltip="View invoice PDF"
        />
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 min-h-5 wrap-break-word text-sm text-foreground">{value || <MutedDash />}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: AdminBookingRow | null;
  onClose: () => void;
}) {
  if (!booking) return null;

  const addons = normalizeAddons(booking.detail.selectedAddons);
  const pricingSnapshot = asRecord(booking.detail.pricingSnapshot);
  const hasPricingSnapshot = Object.keys(pricingSnapshot).length > 0;
  const status = bookingStatus(booking);

  return (
    <Modal
      isOpen={Boolean(booking)}
      onCloseAction={onClose}
      onSubmitAction={onClose}
      title="Booking Details"
      actionLabel="Close"
      customWidth="w-full max-w-5xl"
      customHeight="h-auto max-h-[92vh]"
      body={
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted-foreground">{booking.bookingId}</div>
              <div className="mt-1 truncate text-lg font-semibold text-foreground">{booking.studioName}</div>
              <div className="mt-1 text-sm text-muted-foreground">{formatDateTimeRange(booking)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CompactPill label={status.label} variant={status.variant} />
              <CompactPill label={gstModelLabel(booking.gstModel)} variant={gstModelVariant(booking.gstModel)} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DetailSection title="Parties & Studio Location">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Customer" value={booking.customerName} />
                <DetailItem label="Studio Host / Owner" value={booking.ownerName} />
                <DetailItem label="Studio Name" value={booking.studioName} />
                <DetailItem
                  label="Studio Location"
                  value={`${booking.detail.listing.locationValue}${booking.detail.listing.propertyStateCode ? ` (${booking.detail.listing.propertyStateCode})` : ""}`}
                />
              </div>
            </DetailSection>

            <DetailSection title="Payment & Invoicing">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Total Booking Value" value={<span className="font-semibold text-foreground">{formatINR(booking.amount)}</span>} />
                <DetailItem label="Payment Method" value={booking.detail.transaction?.paymentMethod || <MutedDash />} />
                <DetailItem label="Transaction Reference" value={booking.detail.transaction?.cfTxnRef || <MutedDash />} />
                <DetailItem
                  label="Customer Invoice"
                  value={booking.customerInvoiceNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{booking.customerInvoiceNumber}</span>
                      {booking.customerInvoiceStatus ? (
                        <CompactPill label={booking.customerInvoiceStatus} variant={statusVariant(booking.customerInvoiceStatus)} />
                      ) : null}
                      {booking.customerInvoiceUrl ? (
                        <Button
                          href={booking.customerInvoiceUrl}
                          target="_blank"
                          icon={FiEye}
                          isIconOnly
                          outline
                          size="sm"
                          aria-label="View invoice PDF"
                          tooltip="View invoice PDF"
                        />
                      ) : null}
                    </div>
                  ) : <CompactPill label="Pending" variant="warning" />}
                />
              </div>
            </DetailSection>
          </div>

          {/* Tax & GST Section - details moved from table column */}
          <DetailSection title="Tax & GST Information">
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailItem
                label="GST Model"
                value={
                  <div className="flex items-center gap-2">
                    <CompactPill label={gstModelLabel(booking.gstModel)} variant={gstModelVariant(booking.gstModel)} />
                    <span className="text-xs text-muted-foreground">
                      {booking.gstModel === "GST_STUDIO_AGENT" ? "Agent (18% platform fee)" : "Principal (Non-GST)"}
                    </span>
                  </div>
                }
              />
              <DetailItem label="Registered Tax Entity" value={booking.gstOwner || "ContCave Marketplace / Standard"} />
              <DetailItem label="Billing Company" value={booking.detail.billingCompany || <MutedDash title="No company provided" />} />
              <DetailItem label="Billing GSTIN" value={booking.detail.billingGstin || <MutedDash title="No GSTIN provided" />} />
              <div className="sm:col-span-2">
                <DetailItem label="Billing Address" value={booking.detail.billingAddress || <MutedDash title="No billing address provided" />} />
              </div>
            </div>
          </DetailSection>

          {/* Receipts & Refunds - details moved from table column */}
          <DetailSection title="Receipts & Refund Vouchers">
            {booking.vouchers.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Voucher #</th>
                      <th className="px-3 py-2">Document Type</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2">Issued</th>
                      <th className="px-3 py-2 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {booking.vouchers.map((voucher) => (
                      <tr key={voucher.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-foreground">{voucher.voucherNumber}</td>
                        <td className="px-3 py-2">{voucherTypeLabel(voucher.voucherType)}</td>
                        <td className="px-3 py-2 text-right font-medium text-foreground">{formatINR(voucher.amount)}</td>
                        <td className="px-3 py-2 text-center">
                          <CompactPill label={voucher.status} variant={statusVariant(voucher.status)} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {voucher.issuedAt ? formatISTDateTime(voucher.issuedAt) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {voucher.voucherUrl ? (
                            <Button
                              href={voucher.voucherUrl}
                              target="_blank"
                              icon={FiEye}
                              isIconOnly
                              outline
                              size="sm"
                              aria-label="View voucher PDF"
                              tooltip="View PDF"
                            />
                          ) : (
                            <MutedDash />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-2 text-sm text-muted-foreground">No payment vouchers or refunds issued for this booking.</div>
            )}
          </DetailSection>

          <DetailSection title="Booking Composition">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Package</div>
                {booking.detail.selectedPackage ? (
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <div className="font-medium text-foreground">{booking.detail.selectedPackage.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {booking.detail.selectedPackage.durationHours}h | {formatINR(booking.detail.selectedPackage.offeredPrice)}
                    </div>
                    {booking.detail.selectedPackage.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{booking.detail.selectedPackage.description}</p>
                    ) : null}
                    {booking.detail.selectedPackage.features.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {booking.detail.selectedPackage.features.map((feature) => (
                          <CompactPill key={feature} label={feature} variant="secondary" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">No package selected</div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Sets</div>
                {booking.detail.selectedSets.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {booking.detail.selectedSets.map((set) => (
                      <div key={set.id} className="rounded-lg border border-border p-3">
                        <div className="font-medium text-foreground">{set.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatINR(set.price)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {booking.detail.listing.hasSets ? "No set information stored" : "Full studio booking"}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Add-ons</div>
                {addons.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {addons.map((addon) => (
                      <div key={`${addon.name}-${addon.qty}`} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <span className="min-w-0 truncate text-sm font-medium" title={addon.name}>{addon.name}</span>
                        <span className="shrink-0 text-sm text-muted-foreground">{addon.qty} x {formatINR(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">No add-ons selected</div>
                )}
              </div>
            </div>
          </DetailSection>

          <div className="grid gap-4">
            <DetailSection title="Operational Notes & Pricing Snapshot">
              <div className="grid gap-3">
                {booking.detail.rejectReason ? <DetailItem label="Reject Reason" value={booking.detail.rejectReason} /> : null}
                {hasPricingSnapshot ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Pricing Snapshot</div>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                      {JSON.stringify(pricingSnapshot, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No additional operational notes.</div>
                )}
              </div>
            </DetailSection>
          </div>
        </div>
      }
    />
  );
}

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
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
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
      <div className="flex items-center justify-end">
        <Button
          label="Export CSV"
          icon={FiDownload}
          fit
          size="sm"
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
        items={TABS.map((item) => ({
          id: item.key,
          label: item.label,
          count: data.tabCounts[item.key],
          href: `/admin/dashboard/bookings?tab=${item.key}&page=1`,
        }))}
      />

      {optimisticTab === "bookings" && (
        data.bookings.length > 0 || isNavigating ? (
          <Table footer={paginationFooter}>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Studio</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Invoice</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isNavigating ? (
                <TableSkeletonRows rows={Math.min(data.operationPageSize, 10)} columns={9} />
              ) : (
                data.bookings.map((booking) => {
                  const status = bookingStatus(booking);

                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                        {booking.bookingId}
                      </TableCell>
                      <TableCell className="max-w-50">
                        <Tooltip content={booking.studioName}>
                          <div className="truncate font-medium text-foreground">{booking.studioName}</div>
                        </Tooltip>
                        <div className="truncate text-xs text-muted-foreground">{booking.detail.listing.locationValue}</div>
                      </TableCell>
                      <TableCell className="max-w-40">
                        <Tooltip content={booking.customerName}>
                          <div className="truncate font-medium text-foreground">{booking.customerName}</div>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-40">
                        <Tooltip content={booking.ownerName}>
                          <div className="truncate text-muted-foreground">{booking.ownerName}</div>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTimeRange(booking)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium text-foreground">
                        {formatINR(booking.amount)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <CompactPill label={status.label} variant={status.variant} />
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex justify-center">
                          <InvoiceSummary booking={booking} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end">
                          <Button
                            icon={FiExternalLink}
                            isIconOnly
                            outline
                            aria-label="View booking details"
                            tooltip="View details"
                            onClick={() => setSelectedBooking(booking)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : <EmptyTable label="No bookings found." />
      )}

      {(optimisticTab === "ownerInvoices" || optimisticTab === "failures") && (
        activeRows.length > 0 || isNavigating ? (
          <Table footer={paginationFooter}>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isNavigating ? (
                <TableSkeletonRows rows={Math.min(data.operationPageSize, 10)} columns={7} />
              ) : (
                (activeRows as AdminInvoiceRow[]).map((invoice) => {
                  const delivery = documentDelivery(invoice);
                  const retryDisabled = Boolean(invoice.emailSentAt) || (isPending && pendingInvoiceId !== invoice.id);

                  return (
                    <TableRow key={invoice.id} className="align-top">
                      <TableCell>
                        <div className="truncate font-mono text-xs" title={invoice.invoiceNumber}>{invoice.invoiceNumber}</div>
                        {invoice.bookingId ? <div className="mt-1 truncate text-xs text-muted-foreground">{invoice.bookingId}</div> : null}
                      </TableCell>
                      <TableCell>{invoiceTypeLabel(invoice.documentType)}</TableCell>
                      <TableCell>
                        <Tooltip content={invoice.recipientName}>
                          <div className="truncate">{invoice.recipientName}</div>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{invoice.issuedAt ? formatISTDateTime(invoice.issuedAt) : <MutedDash title="Invoice issue date unavailable" />}</TableCell>
                      <TableCell className="text-right">{formatINR(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1 text-center">
                          <CompactPill label={delivery.label} variant={delivery.variant} />
                          {invoice.emailError ? (
                            <Tooltip content={invoice.emailError}>
                              <span className="truncate max-w-30 text-xs text-destructive">{invoice.emailError}</span>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.invoiceUrl ? (
                            <Button
                              href={invoice.invoiceUrl}
                              target="_blank"
                              icon={FiEye}
                              isIconOnly
                              outline
                              aria-label="View invoice PDF"
                              tooltip="View PDF"
                            />
                          ) : null}
                          <Button
                            icon={FiRefreshCw}
                            isIconOnly
                            outline
                            aria-label={invoice.emailSentAt ? "Invoice email already sent" : "Retry invoice email"}
                            tooltip={invoice.emailSentAt ? "Already sent" : "Retry email"}
                            loading={isPending && pendingInvoiceId === invoice.id}
                            disabled={retryDisabled}
                            onClick={() => retryInvoice(invoice.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : <EmptyTable label="No invoices found for this view." />
      )}

      {optimisticTab === "vouchers" && (
        data.vouchers.length > 0 || isNavigating ? (
          <Table footer={paginationFooter}>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isNavigating ? (
                <TableSkeletonRows rows={Math.min(data.operationPageSize, 10)} columns={7} />
              ) : (
                data.vouchers.map((voucher) => {
                  const delivery = documentDelivery(voucher);
                  const retryDisabled = Boolean(voucher.emailSentAt) || (isPending && pendingVoucherId !== voucher.id);

                  return (
                    <TableRow key={voucher.id} className="align-top">
                      <TableCell>
                        <div className="truncate font-mono text-xs" title={voucher.voucherNumber}>{voucher.voucherNumber}</div>
                        {voucher.bookingId ? <div className="mt-1 truncate text-xs text-muted-foreground">{voucher.bookingId}</div> : null}
                      </TableCell>
                      <TableCell>{voucherTypeLabel(voucher.voucherType)}</TableCell>
                      <TableCell>
                        <Tooltip content={voucher.recipientName}>
                          <div className="truncate">{voucher.recipientName}</div>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{voucher.issuedAt ? formatISTDateTime(voucher.issuedAt) : <MutedDash title="Document issue date unavailable" />}</TableCell>
                      <TableCell className="text-right">{formatINR(voucher.amount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1 text-center">
                          <CompactPill label={delivery.label} variant={delivery.variant} />
                          {voucher.emailError ? (
                            <Tooltip content={voucher.emailError}>
                              <span className="truncate max-w-30 text-xs text-destructive">{voucher.emailError}</span>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {voucher.voucherUrl ? (
                            <Button
                              href={voucher.voucherUrl}
                              target="_blank"
                              icon={FiEye}
                              isIconOnly
                              outline
                              aria-label="View receipt/refund PDF"
                              tooltip="View PDF"
                            />
                          ) : null}
                          <Button
                            icon={FiRefreshCw}
                            isIconOnly
                            outline
                            aria-label={voucher.emailSentAt ? "Receipt/refund email already sent" : "Retry receipt/refund email"}
                            tooltip={voucher.emailSentAt ? "Already sent" : "Retry email"}
                            loading={isPending && pendingVoucherId === voucher.id}
                            disabled={retryDisabled}
                            onClick={() => retryVoucher(voucher.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : <EmptyTable label="No receipts or refunds found." />
      )}

      {optimisticTab === "payouts" && (
        data.payouts.length > 0 || isNavigating ? (
          <Table footer={paginationFooter}>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Studio</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead className="text-center">Split</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isNavigating ? (
                <TableSkeletonRows rows={Math.min(data.operationPageSize, 10)} columns={6} />
              ) : (
                data.payouts.map((payout) => (
                  <TableRow key={payout.id} className="align-top">
                    <TableCell className="font-mono text-xs">{payout.bookingId || payout.id}</TableCell>
                    <TableCell>
                      <Tooltip content={payout.ownerName}>
                        <div className="truncate">{payout.ownerName}</div>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip content={payout.studioName}>
                        <div className="truncate">{payout.studioName}</div>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-xs">{payout.vendorConfigured ? "Configured" : <MutedDash title="Vendor is not configured" />}</TableCell>
                    <TableCell className="text-right">{formatINR(payout.payoutAmount || 0)}</TableCell>
                    <TableCell className="text-center">
                      <CompactPill label={payout.payoutDoneAt ? "Done" : payout.payoutSplitAt ? "Split" : "Pending"} variant={payout.payoutDoneAt ? "success" : "warning"} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : <EmptyTable label="No payouts found." />
      )}

      {optimisticTab === "audit" && (
        data.audits.length > 0 || isNavigating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {isNavigating ? (
                Array.from({ length: Math.min(data.operationPageSize, 6) }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 animate-pulse">
                    <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-muted" />
                      <div className="h-3 w-64 rounded bg-muted" />
                    </div>
                  </div>
                ))
              ) : (
                data.audits.map((audit) => (
                  <div key={audit.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-neutral-50">
                      <FiFileText size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{audit.action}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatISTDateTime(audit.createdAt)} | {audit.resourceId || "No resource"}</div>
                      {audit.metadata ? <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted p-2 text-xs">{JSON.stringify(audit.metadata, null, 2)}</pre> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {paginationFooter}
            </div>
          </div>
        ) : <EmptyTable label="No document audit events found." />
      )}

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
