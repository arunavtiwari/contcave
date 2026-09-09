import type { Metadata } from "next";

import TransactionClient from "@/app/(main)/dashboard/transactions/TransactionClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getTransactionsPage } from "@/app/actions/getTransactions";
import EmptyState from "@/components/ui/EmptyState";
import { isOwner } from "@/lib/user/permissions";
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

const ProfileTransaction = ({ searchParams }: { searchParams: Promise<{ page?: string }> }) => {
  return (
    <div className="space-y-8">
      <Heading title="Transactions" subtitle="Your earnings and payouts" />
      <Suspense fallback={<BookingGridSkeleton count={6} />}>
        <TransactionContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

async function TransactionContent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <EmptyState title="Unauthorized" subtitle="Please login" />
    );
  }

  if (!isOwner(currentUser.role)) {
    return (
      <EmptyState title="Owners only" subtitle="Transaction history is available for owner accounts." />
    );
  }

  const rawPage = Number((await searchParams).page || 1);
  const result = await getTransactionsPage(currentUser.id, {
    ownerView: true,
    page: Number.isFinite(rawPage) ? rawPage : 1,
    limit: 50,
  });

  return (
    <TransactionClient currentUser={currentUser} transactions={result.transactions} pagination={result.pagination} />
  );
}

export default ProfileTransaction;
