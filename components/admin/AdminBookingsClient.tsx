"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FiDownload, FiExternalLink, FiEye, FiFileText, FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";

import {
  AdminAuditRow,
  AdminBookingRow,
  AdminInvoiceRow,
  AdminPayoutRow,
  AdminVoucherRow,
  retryAdminInvoiceEmailAction,
  retryAdminVoucherEmailAction,
} from "@/app/actions/adminBookingActions";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import AdminTabs from "@/components/admin/AdminTabs";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
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
  { key: "audit", label: "Audit" },
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

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyTable({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function MutedDash({ title = "Unavailable" }: { title?: string }) {
  return (
    <span title={title} className="text-muted-foreground">
      -
    </span>
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
  return (
    <Pill
      label={<span className="whitespace-nowrap">{label}</span>}
      variant={variant}
      size="xs"
      title={title}
      className="tracking-normal"
    />
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
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
          tooltip="View invoice"
        />
      ) : null}
    </div>
  );
}

function ReceiptRefundSummary({ booking }: { booking: AdminBookingRow }) {
  if (booking.vouchers.length === 0) {
    return <CompactPill label="None" variant="secondary" />;
  }

  return (
    <div className="flex flex-col gap-1">
      {booking.vouchers.slice(0, 2).map((voucher) => (
        <div key={voucher.id} className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-xs">{voucher.voucherNumber}</span>
          <CompactPill label={voucher.voucherType === "REFUND_VOUCHER" ? "Refund" : "Receipt"} variant={statusVariant(voucher.status)} />
        </div>
      ))}
      {booking.vouchers.length > 2 ? <span className="text-xs text-muted-foreground">+{booking.vouchers.length - 2} more</span> : null}
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
              <div className="mt-1 truncate text-lg font-semibold text-foreground" title={booking.studioName}>{booking.studioName}</div>
              <div className="mt-1 text-sm text-muted-foreground">{formatDateTimeRange(booking)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CompactPill label={status.label} variant={status.variant} />
              <CompactPill label={gstModelLabel(booking.gstModel)} variant={gstModelVariant(booking.gstModel)} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DetailSection title="Parties">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Customer" value={booking.customerName} />
                <DetailItem label="Owner" value={booking.ownerName} />
                <DetailItem label="Location" value={`${booking.detail.listing.locationValue}${booking.detail.listing.propertyStateCode ? ` (${booking.detail.listing.propertyStateCode})` : ""}`} />
              </div>
            </DetailSection>

            <DetailSection title="Payment & Documents">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Total" value={formatINR(booking.amount)} />
                <DetailItem label="Payment Method" value={booking.detail.transaction?.paymentMethod || <MutedDash />} />
                <DetailItem label="Transaction Ref" value={booking.detail.transaction?.cfTxnRef || <MutedDash />} />
                <DetailItem
                  label="Customer Invoice"
                  value={booking.customerInvoiceNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{booking.customerInvoiceNumber}</span>
                      {booking.customerInvoiceStatus ? <CompactPill label={booking.customerInvoiceStatus} variant={statusVariant(booking.customerInvoiceStatus)} /> : null}
                    </div>
                  ) : <CompactPill label="Pending" variant="warning" />}
                />
                <DetailItem label="Receipts & Refunds" value={<ReceiptRefundSummary booking={booking} />} />
              </div>
            </DetailSection>
          </div>

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
            <DetailSection title="Billing & Operational Notes">
              <div className="grid gap-3">
                <DetailItem label="Billing Company" value={booking.detail.billingCompany || <MutedDash />} />
                <DetailItem label="Billing GSTIN" value={booking.detail.billingGstin || <MutedDash />} />
                <DetailItem label="Billing Address" value={booking.detail.billingAddress || <MutedDash />} />
                {booking.detail.rejectReason ? <DetailItem label="Reject Reason" value={booking.detail.rejectReason} /> : null}
                {hasPricingSnapshot ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Pricing Snapshot</div>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                      {JSON.stringify(pricingSnapshot, null, 2)}
                    </pre>
                  </div>
                ) : null}
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
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [pendingVoucherId, setPendingVoucherId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeRows = useMemo(() => {
    if (tab === "bookings") return bookings;
    if (tab === "ownerInvoices") return ownerInvoices;
    if (tab === "vouchers") return vouchers;
    if (tab === "payouts") return payouts;
    if (tab === "failures") return failures;
    return audits;
  }, [audits, bookings, failures, ownerInvoices, payouts, tab, vouchers]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Bookings Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor bookings, document delivery, payouts, and document audit history.
          </p>
        </div>
        <Button
          label="Export CSV"
          icon={FiDownload}
          fit
          size="sm"
          onClick={() => downloadCsv(`contcave-${tab}.csv`, activeRows as Array<Record<string, unknown>>)}
          disabled={activeRows.length === 0}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Bookings" value={tabCounts.bookings} />
        <Stat label="Customer Invoices" value={customerInvoiceTotal} />
        <Stat label="Pending Invoices" value={pendingCustomerInvoiceTotal} />
        <Stat label="Owner Invoices" value={tabCounts.ownerInvoices} />
        <Stat label="Receipts & Refunds" value={tabCounts.vouchers} />
        <Stat label="Payouts" value={tabCounts.payouts} />
      </div>

      <AdminTabs
        activeId={tab}
        ariaLabel="Booking operations views"
        items={TABS.map((item) => ({
          id: item.key,
          label: item.label,
          count: tabCounts[item.key],
          href: `/admin/dashboard/bookings?tab=${item.key}&page=1`,
        }))}
      />

      {tab === "bookings" && (
        bookings.length ? (
          <TableShell>
            <table className="min-w-[1240px] table-fixed divide-y divide-border text-[13px] xl:min-w-full">
              <colgroup>
                <col className="w-[105px]" />
                <col className="w-[240px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
                <col className="w-[85px]" />
                <col className="w-[95px]" />
                <col className="w-[95px]" />
                <col className="w-[130px]" />
                <col className="w-[135px]" />
                <col className="w-[150px]" />
                <col className="w-[55px]" />
              </colgroup>
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Booking</th>
                  <th className="px-3 py-3">Studio</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Owner</th>
                  <th className="px-3 py-3 text-center">GST</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Invoice</th>
                  <th className="px-3 py-3 text-center">Receipts & Refunds</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((booking) => {
                  const status = bookingStatus(booking);

                  return (
                    <tr key={booking.id} className="align-middle hover:bg-muted/20">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] leading-5">{booking.bookingId}</td>
                      <td className="px-3 py-3">
                        <div className="truncate font-medium" title={booking.studioName}>{booking.studioName}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="truncate" title={booking.customerName}>{booking.customerName}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="truncate" title={booking.ownerName}>{booking.ownerName}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <CompactPill label={gstModelLabel(booking.gstModel)} variant={gstModelVariant(booking.gstModel)} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">{formatISTDate(booking.startDate)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{formatINR(booking.amount)}</td>
                      <td className="px-3 py-3 text-center">
                        <CompactPill label={status.label} variant={status.variant} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <InvoiceSummary booking={booking} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <ReceiptRefundSummary booking={booking} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <Button
                            icon={FiExternalLink}
                            isIconOnly
                            outline
                            aria-label="Open booking details"
                            tooltip="Open details"
                            onClick={() => setSelectedBooking(booking)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        ) : <EmptyTable label="No bookings found." />
      )}

      {(tab === "ownerInvoices" || tab === "failures") && (
        activeRows.length ? (
          <TableShell>
            <table className="min-w-[980px] table-fixed divide-y divide-border text-sm">
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[190px]" />
                <col className="w-[190px]" />
                <col className="w-[160px]" />
                <col className="w-[120px]" />
                <col className="w-[170px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Delivery</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(activeRows as AdminInvoiceRow[]).map((invoice) => {
                  const delivery = documentDelivery(invoice);
                  const retryDisabled = Boolean(invoice.emailSentAt) || (isPending && pendingInvoiceId !== invoice.id);

                  return (
                    <tr key={invoice.id} className="align-top hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="truncate font-mono text-xs" title={invoice.invoiceNumber}>{invoice.invoiceNumber}</div>
                        {invoice.bookingId ? <div className="mt-1 truncate text-xs text-muted-foreground">{invoice.bookingId}</div> : null}
                      </td>
                      <td className="px-4 py-3">{invoiceTypeLabel(invoice.documentType)}</td>
                      <td className="px-4 py-3">
                        <div className="truncate" title={invoice.recipientName}>{invoice.recipientName}</div>
                      </td>
                      <td className="px-4 py-3">{invoice.issuedAt ? formatISTDateTime(invoice.issuedAt) : <MutedDash title="Invoice issue date unavailable" />}</td>
                      <td className="px-4 py-3 text-right">{formatINR(invoice.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1 text-center">
                          <CompactPill label={delivery.label} variant={delivery.variant} />
                          {invoice.emailError ? <span className="truncate text-xs text-destructive" title={invoice.emailError}>{invoice.emailError}</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        ) : <EmptyTable label="No invoices found for this view." />
      )}

      {tab === "vouchers" && (
        vouchers.length ? (
          <TableShell>
            <table className="min-w-[880px] table-fixed divide-y divide-border text-sm">
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[160px]" />
                <col className="w-[190px]" />
                <col className="w-[160px]" />
                <col className="w-[120px]" />
                <col className="w-[170px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Delivery</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vouchers.map((voucher) => {
                  const delivery = documentDelivery(voucher);
                  const retryDisabled = Boolean(voucher.emailSentAt) || (isPending && pendingVoucherId !== voucher.id);

                  return (
                    <tr key={voucher.id} className="align-top hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="truncate font-mono text-xs" title={voucher.voucherNumber}>{voucher.voucherNumber}</div>
                        {voucher.bookingId ? <div className="mt-1 truncate text-xs text-muted-foreground">{voucher.bookingId}</div> : null}
                      </td>
                      <td className="px-4 py-3">{voucherTypeLabel(voucher.voucherType)}</td>
                      <td className="px-4 py-3">
                        <div className="truncate" title={voucher.recipientName}>{voucher.recipientName}</div>
                      </td>
                      <td className="px-4 py-3">{voucher.issuedAt ? formatISTDateTime(voucher.issuedAt) : <MutedDash title="Document issue date unavailable" />}</td>
                      <td className="px-4 py-3 text-right">{formatINR(voucher.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1 text-center">
                          <CompactPill label={delivery.label} variant={delivery.variant} />
                          {voucher.emailError ? <span className="truncate text-xs text-destructive" title={voucher.emailError}>{voucher.emailError}</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        ) : <EmptyTable label="No receipts or refunds found." />
      )}

      {tab === "payouts" && (
        payouts.length ? (
          <TableShell>
            <table className="min-w-[860px] table-fixed divide-y divide-border text-sm">
              <colgroup>
                <col className="w-[160px]" />
                <col className="w-[180px]" />
                <col className="w-[240px]" />
                <col className="w-[150px]" />
                <col className="w-[120px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Studio</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                  <th className="px-4 py-3 text-center">Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="align-top hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{payout.bookingId || payout.id}</td>
                    <td className="px-4 py-3"><div className="truncate" title={payout.ownerName}>{payout.ownerName}</div></td>
                    <td className="px-4 py-3"><div className="truncate" title={payout.studioName}>{payout.studioName}</div></td>
                    <td className="px-4 py-3 text-xs">{payout.vendorConfigured ? "Configured" : <MutedDash title="Vendor is not configured" />}</td>
                    <td className="px-4 py-3 text-right">{formatINR(payout.payoutAmount || 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <CompactPill label={payout.payoutDoneAt ? "Done" : payout.payoutSplitAt ? "Split" : "Pending"} variant={payout.payoutDoneAt ? "success" : "warning"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        ) : <EmptyTable label="No payouts found." />
      )}

      {tab === "audit" && (
        audits.length ? (
          <div className="space-y-2">
            {audits.map((audit) => (
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
            ))}
          </div>
        ) : <EmptyTable label="No document audit events found." />
      )}

      <AdminTablePagination
        page={operationPage}
        pageSize={operationPageSize}
        total={operationTotal}
        hrefForPage={(page) => `/admin/dashboard/bookings?tab=${tab}&page=${page}`}
      />

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
