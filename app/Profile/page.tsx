import ClientOnly from "@/components/ClientOnly";
import ProfileClient from "./ProfileClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import Container from "@/components/Container";
import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/seo";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Profile | ${BRAND_NAME}`,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

type Props = {};

const Profile = async (props: Props) => {
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
        <ProfileClient profile={currentUser} />
      </ClientOnly>
    </Container>
  );
};

export default Profile;
