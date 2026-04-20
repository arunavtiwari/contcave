import type { Metadata } from "next";
import { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getReservations } from "@/app/actions/reservationActions";
import EmptyState from "@/components/EmptyState";
import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";

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

import Heading from "@/components/ui/Heading";

const BookingPage = () => {
  return (
    <div className="space-y-8">
      <Heading title="My Bookings" subtitle="Spaces booked by you" />
      <Suspense fallback={<BookingGridSkeleton count={6} />}>
        <BookingContent />
      </Suspense>
    </div>
  );
};

async function BookingContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const reservations = await getReservations({
    userId: currentUser.id,
  });

  if (reservations.length === 0) {
    return (
      <EmptyState
        title="No bookings found"
        subtitle="Looks like you haven't booked for any space."
      />
    );
  }

  return <BookingClient reservations={reservations} currentUser={currentUser} />;
}

export default BookingPage;
