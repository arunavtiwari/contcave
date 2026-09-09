import type { Metadata } from "next";

import PostBookingPaymentClient from "@/components/payments/PostBookingPaymentClient";
import EmptyState from "@/components/shared/EmptyState";
import { PostBookingService } from "@/lib/post-booking/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ChargePaymentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token = "" } = await searchParams;
  const charge = token ? await PostBookingService.getChargePayment(id, token) : null;

  if (!charge) {
    return <EmptyState title="Payment link unavailable" subtitle="This charge payment link is invalid or expired." />;
  }

  const txn = charge.transactions[0];
  const items = Array.isArray(charge.items) ? charge.items as Array<{ name: string; qty: number; unitPrice: number }> : [];
  return (
    <PostBookingPaymentClient
      title={charge.type === "DAMAGE" ? "Damage Charge" : "Additional Services"}
      subtitle={`${charge.reservation.listing.title} - booking ${charge.reservation.bookingId}`}
      amount={charge.totalAmount}
      paymentSessionId={txn?.cfPaymentSessionId}
      mode={(process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox"}
      status={charge.status}
      items={items}
      rejectUrl={`/api/pay/charge/${charge.id}/reject?token=${encodeURIComponent(token)}`}
    />
  );
}
