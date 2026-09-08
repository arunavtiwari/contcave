import type { Metadata } from "next";

import ReservationsClient from "@/app/(main)/dashboard/reservations/ReservationsClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getReservationsPageAction } from "@/app/actions/reservationActions";
import EmptyState from "@/components/EmptyState";
import DashboardPagination from "@/components/ui/DashboardPagination";
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

const ReservationsPage = ({ searchParams }: { searchParams: Promise<{ page?: string }> }) => {
  return (
    <div className="space-y-8">
      <Heading title="Customer Reservations" subtitle="Bookings on your properties" />
      <Suspense fallback={<BookingGridSkeleton count={6} />}>
        <ReservationsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

async function ReservationsContent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const rawPage = Number((await searchParams).page || 1);
  const result = await getReservationsPageAction(
    { authorId: currentUser.id },
    { page: Number.isFinite(rawPage) ? rawPage : 1, pageSize: 50 }
  );
  const { reservations, pagination } = result;

  if (reservations.length === 0) {
    return (
      <EmptyState
        title="No Reservation found"
        subtitle="Looks like you have no reservations on your properties."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ReservationsClient reservations={reservations} currentUser={currentUser} />
      <DashboardPagination
        {...pagination}
        itemLabel="reservations"
        hrefForPage={(page) => `/dashboard/reservations?page=${page}`}
      />
    </div>
  );
}

export default ReservationsPage;
