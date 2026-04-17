import type { Metadata } from "next";

import ReservationsClient from "@/app/(main)/(auth)/reservations/ReservationsClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservation from "@/app/actions/getReservations";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guest Reservations",
  description: "Track and manage upcoming reservations across your ContCave listings.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const ReservationsPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const reservations = await getReservation({
    authorId: currentUser.id,
  });

  if (reservations.length === 0) {
    return (
      <EmptyState
        title="No Reservation found"
        subtitle="Looks like you have no reservations on your properties."
      />
    );
  }

  return (
    <ReservationsClient
      reservations={reservations}
      currentUser={currentUser}
    />
  );
};

export default ReservationsPage;
