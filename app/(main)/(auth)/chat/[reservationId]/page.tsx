import type { Metadata } from "next";

import ChatClient from "@/app/(main)/(auth)/chat/ChatClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import { getAuthorizedChatReservation } from "@/lib/chat/reservation";

export const metadata: Metadata = {
  title: "Reservation Chat",
  description: "Coordinate with guests and hosts in a secure ContCave chat room for this reservation.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

interface IParams {
  reservationId: string;
}

const Profile = async (props: { params: Promise<IParams> }) => {
  const { reservationId } = await props.params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  const booking = await getAuthorizedChatReservation(reservationId, currentUser.id);

  if (!booking) {
    return (
      <ClientOnly>
        <EmptyState title="Reservation unavailable" subtitle="This chat could not be loaded." />
      </ClientOnly>
    );
  }

  return (
    <div className="mt-5">
      <Container>
        <ChatClient profile={currentUser} reservationId={reservationId} initialBooking={booking} />
      </Container>
    </div>
  );
};

export default Profile;
