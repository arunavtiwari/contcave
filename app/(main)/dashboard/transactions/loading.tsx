import React from "react";

import BookingGridSkeleton from "@/components/listing/BookingGridSkeleton";
import Heading from "@/components/ui/Heading";

export default function TransactionsLoading() {
  return (
    <div className="space-y-8">
      <Heading title="Transactions" subtitle="Your earnings and payouts" />
      <BookingGridSkeleton count={6} />
    </div>
  );
}
