import { FiEye } from "react-icons/fi";

import type { AdminBookingDetail, AdminBookingRow } from "@/app/actions/adminBookingActions";
import { bookingStatus, CompactPill, DownloadPdfButton, MutedDash, voucherTypeLabel } from "@/components/admin/bookings/shared";
import PayoutBreakdownTable from "@/components/admin/PayoutBreakdownTable";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import type { PayoutBreakdown } from "@/lib/payout/breakdown";
import { cn, formatINR, formatISTDate, formatISTDateTime } from "@/lib/utils";

function statusVariant(status: string) {
  if (["SUCCESS", "EMAIL_SENT", "STORED", "GENERATED"].includes(status)) return "success";
  if (["FAILED", "EMAIL_FAILED", "DELIVERY_BLOCKED"].includes(status)) return "destructive";
  return "warning";
}

function formatDateTimeRange(booking: AdminBookingRow) {
  return `${formatISTDate(booking.startDate)} | ${booking.startTime} - ${booking.endTime}`;
}

function gstModelLabel(value: AdminBookingDetail["gstModel"]) {
  if (value === "GST_STUDIO_AGENT") return "GST Studio";
  if (value === "NON_GST_PRINCIPAL") return "Non-GST";
  return "Unknown";
}

function gstModelVariant(value: AdminBookingDetail["gstModel"]) {
  if (value === "GST_STUDIO_AGENT") return "success";
  if (value === "NON_GST_PRINCIPAL") return "warning";
  return "secondary";
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

/**
 * Lays out the same sections as the loaded drawer — and keeps the header real, since the
 * table row already has those values — so the dialog doesn't reflow when the rest lands.
 */
function BookingDetailSkeleton({ booking }: { booking: AdminBookingRow }) {
  const status = bookingStatus(booking);

  return (
    <div className="space-y-4" aria-label="Loading booking details">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground">{booking.bookingId}</div>
          <div className="mt-1 truncate text-lg font-semibold text-foreground">{booking.studioName}</div>
          <div className="mt-1 text-sm text-muted-foreground">{formatDateTimeRange(booking)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CompactPill label={status.label} variant={status.variant} />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Parties & studio location / Payment & invoicing */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, section) => (
          <SkeletonDetailSection key={section} fields={4} columns="sm:grid-cols-2" />
        ))}
      </div>

      {/* Tax & GST information */}
      <SkeletonDetailSection fields={3} columns="sm:grid-cols-3" />

      {/* Receipts & refund vouchers */}
      <SkeletonDetailSection>
        <Skeleton className="h-24 w-full rounded-lg" />
      </SkeletonDetailSection>

      {/* Booking composition: package / sets / add-ons */}
      <SkeletonDetailSection>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2.5 w-16 rounded" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </SkeletonDetailSection>

      {/* Operational notes & pricing snapshot */}
      <SkeletonDetailSection>
        <Skeleton className="h-28 w-full rounded-lg" />
      </SkeletonDetailSection>
    </div>
  );
}

function SkeletonDetailSection({
  fields,
  columns,
  children,
}: {
  fields?: number;
  columns?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <Skeleton className="h-4 w-40 rounded-md" />
      <div className="mt-3">
        {children ?? (
          <div className={cn("grid gap-3", columns)}>
            {Array.from({ length: fields ?? 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-24 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function BookingDetailModal({
  booking,
  detail,
  onClose,
}: {
  booking: AdminBookingRow | null;
  detail: AdminBookingDetail | null;
  onClose: () => void;
}) {
  if (!booking) return null;

  // The drawer payload is fetched when the row is opened, so the shell renders first and
  // fills in once it lands.
  if (!detail) {
    return (
      <Modal
        isOpen
        onCloseAction={onClose}
        title="Booking Details"
        customWidth="max-w-5xl"
        customHeight="h-auto max-h-[92vh]"
        body={<BookingDetailSkeleton booking={booking} />}
      />
    );
  }

  const addons = normalizeAddons(detail.selectedAddons);
  const pricingSnapshot = asRecord(detail.pricingSnapshot);
  const hasPricingSnapshot = Object.keys(pricingSnapshot).length > 0;
  // Stored on offline bookings at creation; it is the payout and tax record for those bookings.
  const storedBreakdown = asRecord(pricingSnapshot.payoutBreakdown);
  const payoutBreakdown = typeof storedBreakdown.model === "string" && typeof storedBreakdown.payout === "number"
    ? (storedBreakdown as unknown as PayoutBreakdown)
    : null;
  const status = bookingStatus(booking);

  return (
    <Modal
      isOpen={Boolean(booking)}
      onCloseAction={onClose}
      title="Booking Details"
      customWidth="max-w-5xl"
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
              <CompactPill label={gstModelLabel(detail.gstModel)} variant={gstModelVariant(detail.gstModel)} />
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
                  value={`${detail.listing.locationValue}${detail.listing.propertyStateCode ? ` (${detail.listing.propertyStateCode})` : ""}`}
                />
              </div>
            </DetailSection>

            <DetailSection title="Payment & Invoicing">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Total Booking Value" value={<span className="font-semibold text-foreground">{formatINR(booking.amount)}</span>} />
                <DetailItem label="Payment Method" value={detail.transaction?.paymentMethod || <MutedDash />} />
                <DetailItem label="Transaction Reference" value={detail.transaction?.cfTxnRef || <MutedDash />} />
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
                      {booking.customerInvoiceUrl ? <DownloadPdfButton href={booking.customerInvoiceUrl} label="invoice" size="sm" /> : null}
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
                    <CompactPill label={gstModelLabel(detail.gstModel)} variant={gstModelVariant(detail.gstModel)} />
                    <span className="text-xs text-muted-foreground">
                      {detail.gstModel === "GST_STUDIO_AGENT" ? "Agent (18% platform fee)" : "Principal (Non-GST)"}
                    </span>
                  </div>
                }
              />
              <DetailItem label="Registered Tax Entity" value={detail.gstOwner || "ContCave Marketplace / Standard"} />
              <DetailItem label="Billing Company" value={detail.billingCompany || <MutedDash title="No company provided" />} />
              <DetailItem label="Billing GSTIN" value={detail.billingGstin || <MutedDash title="No GSTIN provided" />} />
              <div className="sm:col-span-2">
                <DetailItem label="Billing Address" value={detail.billingAddress || <MutedDash title="No billing address provided" />} />
              </div>
            </div>
          </DetailSection>

          {/* Receipts & Refunds - details moved from table column */}
          <DetailSection title="Receipts & Refund Vouchers">
            {detail.vouchers.length > 0 ? (
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
                    {detail.vouchers.map((voucher) => (
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

          {payoutBreakdown ? (
            <DetailSection title="Payout Breakdown">
              <PayoutBreakdownTable breakdown={payoutBreakdown} />
            </DetailSection>
          ) : null}

          <DetailSection title="Booking Composition">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Package</div>
                {detail.selectedPackage ? (
                  <div className="mt-2 rounded-lg border border-border p-3">
                    <div className="font-medium text-foreground">{detail.selectedPackage.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {detail.selectedPackage.durationHours}h | {formatINR(detail.selectedPackage.offeredPrice)}
                    </div>
                    {detail.selectedPackage.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{detail.selectedPackage.description}</p>
                    ) : null}
                    {detail.selectedPackage.features.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {detail.selectedPackage.features.map((feature) => (
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
                {detail.selectedSets.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {detail.selectedSets.map((set) => (
                      <div key={set.id} className="rounded-lg border border-border p-3">
                        <div className="font-medium text-foreground">{set.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatINR(set.price)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {detail.listing.hasSets ? "No set information stored" : "Full studio booking"}
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
                {detail.rejectReason ? <DetailItem label="Reject Reason" value={detail.rejectReason} /> : null}
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
