import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ChatClient from "../ChatClient";
import Container from "@/components/Container";
import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Reservation Chat | ${BRAND_NAME}`,
  description: "Coordinate with guests and hosts in a secure ContCave chat room for this reservation.",
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
    <div className="mt-5">
      <Container>
        <ClientOnly>
          <ChatClient profile={currentUser} />
        </ClientOnly>
      </Container>
    </div>
  );
};

export default Profile;
