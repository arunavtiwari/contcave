import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "../actions/getCurrentUser";
import getReservation from "../actions/getReservations";
import BookingClient from "./BookingClient";
import Container from "@/components/Container";
import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/seo";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `My Bookings | ${BRAND_NAME}`,
  description: "View and manage reservations you have made on ContCave.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

type Props = {};

const BookingPage = async (props: Props) => {
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
