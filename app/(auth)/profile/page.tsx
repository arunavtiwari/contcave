import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getTransactions from "@/app/actions/getTransactions";
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
      <EmptyState title="Unauthorized" subtitle="Please login" />
    );
  }
  const isOwner = currentUser.is_owner === true;

  const [paymentDetailsResult, transactions] = await Promise.all([
    getPaymentDetailsSafe(currentUser.id),
    isOwner
      ? getTransactions(currentUser.id, { ownerView: true })
      : Promise.resolve([]),
  ]);

  const paymentDetails = paymentDetailsResult.success ? (paymentDetailsResult.data as unknown as PaymentProfile) : null;

  return (
    <Container>
      <ProfileClient
        profile={currentUser}
        initialPaymentDetails={paymentDetails}
        initialTransactions={transactions}
      />
    </Container>
  );
};

export default Profile;
