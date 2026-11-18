import { FiDownload } from "react-icons/fi";

import type { AdminBookingRow, AdminVoucherRow } from "@/app/actions/adminBookingActions";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import Tooltip from "@/components/ui/Tooltip";

export function DownloadPdfButton({ href, label, size }: { href: string; label: string; size?: "sm" }) {
  return (
    <Button
      href={`${href}?download=1`}
      icon={FiDownload}
      isIconOnly
      outline
      size={size}
      aria-label={`Download ${label} PDF`}
      tooltip={`Download ${label} PDF`}
    />
  );
}

export function bookingStatus(booking: AdminBookingRow) {
  // 1. Check reservation lifecycle status
  if (booking.lifecycleStatus === "CONFIRMED") {
    return { label: "Confirmed", variant: "success" as const };
  }
  if (booking.lifecycleStatus === "CHECKED_IN") {
    return { label: "Checked In", variant: "success" as const };
  }
  if (booking.lifecycleStatus === "COMPLETED") {
    return { label: "Completed", variant: "success" as const };
  }
  if (booking.lifecycleStatus === "CANCELLED") {
    return { label: "Cancelled", variant: "destructive" as const };
  }
  if (booking.lifecycleStatus === "REFUNDED") {
    return { label: "Refunded", variant: "destructive" as const };
  }
  if (booking.lifecycleStatus === "PARTIALLY_REFUNDED") {
    return { label: "Partially Refunded", variant: "warning" as const };
  }
  if (booking.lifecycleStatus === "NO_SHOW") {
    return { label: "No Show", variant: "destructive" as const };
  }

  // 2. Pending approval states
  if (booking.lifecycleStatus === "PENDING_APPROVAL") {
    if (booking.paymentStatus === "SUCCESS") {
      return { label: "Paid Pending Approval", variant: "warning" as const };
    }
    if (booking.paymentStatus === "FAILED") {
      return { label: "Payment Failed", variant: "destructive" as const };
    }
    if (booking.paymentStatus === "NO_PAYMENT") {
      return { label: "Payment Missing", variant: "secondary" as const };
    }
    return { label: "Payment Pending", variant: "warning" as const };
  }

  // 3. Fallback based on payment status
  if (booking.paymentStatus === "FAILED") return { label: "Payment Failed", variant: "destructive" as const };
  if (booking.paymentStatus === "SUCCESS") return { label: "Paid", variant: "success" as const };
  if (booking.paymentStatus === "NO_PAYMENT") return { label: "Payment Missing", variant: "secondary" as const };
  return { label: "Payment Pending", variant: "warning" as const };
}

export function documentDelivery(document: { emailSentAt?: string | null; status: string }) {
  if (document.emailSentAt) return { label: "Sent", variant: "success" as const };
  if (document.status === "EMAIL_FAILED" || document.status === "DELIVERY_BLOCKED") return { label: "Failed", variant: "destructive" as const };
  if (document.status === "RETRYING") return { label: "Retrying", variant: "warning" as const };
  return { label: "Queued", variant: "warning" as const };
}

export function voucherTypeLabel(value: AdminVoucherRow["voucherType"]) {
  return value === "REFUND_VOUCHER" ? "Refund Voucher" : "Receipt Voucher";
}

export function MutedDash({ title = "Unavailable" }: { title?: string }) {
  return (
    <Tooltip content={title}>
      <span className="cursor-default text-muted-foreground">
        -
      </span>
    </Tooltip>
  );
}

export function CompactPill({
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
