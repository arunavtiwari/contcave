import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getTransactions from "@/app/actions/getTransactions";
import EmptyState from "@/components/EmptyState";

import TransactionClient from "./TransactionClient";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transactions",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

import { Suspense } from "react";

import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";
import Heading from "@/components/ui/Heading";

const ProfileTransaction = () => {
  return (
    <div className="space-y-8">
      <Heading title="Transactions" subtitle="Your earnings and payouts" />
      <Suspense fallback={<BookingGridSkeleton count={6} />}>
        <TransactionContent />
      </Suspense>
    </div>
  );
};

async function TransactionContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <EmptyState title="Unauthorized" subtitle="Please login" />
    );
  }

  if (!currentUser.is_owner) {
    return (
      <EmptyState title="Owners only" subtitle="Transaction history is available for owner accounts." />
    );
  }

  const transactions = await getTransactions(currentUser.id, { ownerView: true });

  return (
    <TransactionClient currentUser={currentUser} transactions={transactions} />
  );
}

export default ProfileTransaction;
