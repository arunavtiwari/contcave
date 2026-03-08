import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getTransactions from "@/app/actions/getTransactions";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";

import ProfileTransactionClient from "./ProfileTransactionClient";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transactions",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const ProfileTransaction = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }
  const transactions = await getTransactions(currentUser.id);

  return (
    <Container>
      <ClientOnly>
        <ProfileTransactionClient currentUser={currentUser} transactions={transactions} />
      </ClientOnly>
    </Container>
  );
};

export default ProfileTransaction;
