import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getTransactions from "@/app/actions/getTransactions";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import { getPaymentDetailsSafe } from "@/lib/payment-details";
import { PaymentProfile } from "@/types/payment";

import ProfileClient from "./ProfileClient";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const Profile = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }
  const [paymentDetailsResult, transactions] = await Promise.all([
    getPaymentDetailsSafe(currentUser.id),
    getTransactions(currentUser.id),
  ]);

  const paymentDetails = paymentDetailsResult.success ? (paymentDetailsResult.data as unknown as PaymentProfile) : null;

  return (
    <Container>
      <ClientOnly>
        <ProfileClient
          profile={currentUser}
          initialPaymentDetails={paymentDetails}
          initialTransactions={transactions}
        />
      </ClientOnly>
    </Container>
  );
};

export default Profile;
