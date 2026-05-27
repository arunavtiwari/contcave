import React from "react";

import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";
import Heading from "@/components/ui/Heading";

export default function ReservationsLoading() {
  return (
    <div className="space-y-8">
      <Heading title="Customer Reservations" subtitle="Bookings on your properties" />
      <BookingGridSkeleton count={6} />
    </div>
  );
}
