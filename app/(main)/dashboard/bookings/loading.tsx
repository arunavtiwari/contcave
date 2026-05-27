import React from "react";

import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";
import Heading from "@/components/ui/Heading";

export default function BookingsLoading() {
  return (
    <div className="space-y-8">
      <Heading title="My Bookings" subtitle="Spaces booked by you" />
      <BookingGridSkeleton count={6} />
    </div>
  );
}
