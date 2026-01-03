import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import { BRAND_NAME } from "@/lib/seo";

import ProfileTransactionClient from "./ProfileTransactionClient";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Transactions | ${BRAND_NAME}`,
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
  return (
    <Container>
      <ClientOnly>
        <ProfileTransactionClient />
      </ClientOnly>
    </Container>
  );
};

export default ProfileTransaction;
