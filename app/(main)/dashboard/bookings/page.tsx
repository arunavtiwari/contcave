import type { Metadata } from "next";
import { Suspense } from "react";

import BookingClient from "@/app/(main)/dashboard/bookings/BookingClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getReservationsPageAction } from "@/app/actions/reservationActions";
import EmptyState from "@/components/EmptyState";
import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";
import DashboardPagination from "@/components/ui/DashboardPagination";
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

const BookingPage = ({ searchParams }: { searchParams: Promise<{ page?: string }> }) => {
  return (
    <div className="space-y-8">
      <Heading title="My Bookings" subtitle="Spaces booked by you" />
      <Suspense fallback={<BookingGridSkeleton count={6} />}>
        <BookingContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

async function BookingContent({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const rawPage = Number((await searchParams).page || 1);
  const result = await getReservationsPageAction(
    { userId: currentUser.id },
    { page: Number.isFinite(rawPage) ? rawPage : 1, pageSize: 50 }
  );
  const { reservations, pagination } = result;

  if (reservations.length === 0) {
    return (
      <EmptyState
        title="No bookings found"
        subtitle="Looks like you haven't booked for any space."
      />
    );
  }

  return (
    <div className="space-y-6">
      <BookingClient reservations={reservations} currentUser={currentUser} />
      <DashboardPagination
        {...pagination}
        itemLabel="bookings"
        hrefForPage={(page) => `/dashboard/bookings?page=${page}`}
      />
    </div>
  );
}

export default BookingPage;
