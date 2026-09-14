import type { Metadata } from "next";

import PostBookingPaymentClient from "@/components/payments/PostBookingPaymentClient";
import EmptyState from "@/components/ui/EmptyState";
import { PostBookingService } from "@/lib/post-booking/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ExtensionPaymentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token = "" } = await searchParams;
  const extension = token ? await PostBookingService.getExtensionPayment(id, token) : null;

  if (!extension) {
    return <EmptyState title="Payment link unavailable" subtitle="This extension payment link is invalid or expired." />;
  }

  const txn = extension.transactions[0];
  return (
    <PostBookingPaymentClient
      title="Session Extension"
      subtitle={`${extension.reservation.listing.title} extension until ${extension.requestedEndTime}`}
      amount={extension.extraAmount}
      paymentSessionId={txn?.cfPaymentSessionId}
      mode={(process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox"}
      status={extension.status}
    />
  );
}
