import type { Metadata } from "next";
import React from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservation from "@/app/actions/getReservations";
import ClientOnly from "@/components/ClientOnly";
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
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  const reservations = await getReservation({
    userId: currentUser.id,
  });

  if (reservations.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No bookings found"
          subtitle="Looks like you haven&apos;t booked for any space."
        />
      </ClientOnly>
    );
  }

  return (

    <ClientOnly>
      <BookingClient reservations={reservations} currentUser={currentUser} />
    </ClientOnly>

  );
};

export default BookingPage;
