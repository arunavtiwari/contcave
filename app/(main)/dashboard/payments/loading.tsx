import React from "react";

import Heading from "@/components/ui/Heading";
import Skeleton from "@/components/ui/Skeleton";

export default function PaymentsLoading() {
  return (
    <div className="flex flex-col w-full gap-8">
      <Heading
        title="Manage Payments"
        subtitle="View your payment details and past transactions."
      />

      {/* Tabs navigation skeleton */}
      <div className="bg-muted rounded-full p-1 w-fit self-center border border-border flex gap-2">
        <Skeleton className="h-12 w-44 rounded-full" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>

      {/* Content panel skeleton */}
      <div className="bg-background rounded-2xl border border-border p-8 space-y-6">
        <Skeleton className="h-7 w-48 rounded-lg" />
        
        {/* Form fields skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <Skeleton className="h-11 w-32 rounded-xl mt-4" />
      </div>
    </div>
  );
}
