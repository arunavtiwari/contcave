import React from "react";

import PaymentDetailsSkeleton from "@/components/profile/ManagePayments/PaymentDetailsSkeleton";
import PaymentTabsSkeleton from "@/components/profile/ManagePayments/PaymentTabsSkeleton";
import Heading from "@/components/ui/Heading";

export default function PaymentsLoading() {
  return (
    <div className="flex flex-col w-full gap-8">
      <Heading
        title="Manage Payments"
        subtitle="View your payment details and past transactions."
      />
      <PaymentTabsSkeleton />
      <PaymentDetailsSkeleton />
    </div>
  );
}

