import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import ChatClient from "@/app/chat/ChatClient";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";


export const metadata: Metadata = {
  title: "Reservation Chat",
  description: "Coordinate with guests and hosts in a secure ContCave chat room for this reservation.",
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
