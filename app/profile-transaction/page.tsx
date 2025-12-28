import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import ProfileTransactionClient from "./ProfileTransactionClient";
import Container from "@/components/Container";
import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/seo";
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
