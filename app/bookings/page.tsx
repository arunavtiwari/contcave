import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservation from "@/app/actions/getReservations";
import EmptyState from "@/components/EmptyState";

import BookingClient from "./BookingClient";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "View and manage reservations you have made on ContCave.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const BookingPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const reservations = await getReservation({
    userId: currentUser.id,
  });

  if (reservations.length === 0) {
    return (
      <EmptyState
        title="No bookings found"
        subtitle="Looks like you haven&apos;t booked for any space."
      />
    );
  }

  return <BookingClient reservations={reservations} currentUser={currentUser} />;
};

export default BookingPage;
