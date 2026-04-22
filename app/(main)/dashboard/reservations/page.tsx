import type { Metadata } from "next";

import ReservationsClient from "@/app/(main)/dashboard/reservations/ReservationsClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getReservations } from "@/app/actions/reservationActions";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Reservations",
  description: "Track and manage upcoming reservations across your ContCave listings.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

import { Suspense } from "react";

import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";
import Heading from "@/components/ui/Heading";

const ReservationsPage = () => {
  return (
    <div className="space-y-8">
      <Heading title="Customer Reservations" subtitle="Bookings on your properties" />
      <Suspense fallback={<BookingGridSkeleton count={6} />}>
        <ReservationsContent />
      </Suspense>
    </div>
  );
};

async function ReservationsContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const reservations = await getReservations({
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
}

export default ReservationsPage;
