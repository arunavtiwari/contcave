import React from "react";

import Heading from "@/components/ui/Heading";
import Skeleton from "@/components/ui/Skeleton";

export default function ReferralLoading() {
  return (
    <div className="flex flex-col w-full gap-8">
      <Heading
        title="Share with Friends and Earn Rewards"
        subtitle="Refer your friends to ContCave and both of you can earn rewards"
      />

      {/* How it works skeleton */}
      <div className="bg-muted/30 rounded-2xl p-6 border border-foreground/10 space-y-4">
        <Skeleton className="h-7 w-36 rounded-lg" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <Skeleton className="h-5 w-5/6 rounded-md" />
          </div>
        </div>
      </div>

      {/* Referral Link box skeleton */}
      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
          <div className="bg-muted/30 rounded-lg p-4 border border-border flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-5 w-2/3 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Promote & Earn skeleton */}
      <div className="bg-info/5 rounded-2xl p-6 border border-info/10 flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-background rounded-2xl p-6 border border-border space-y-4">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-background rounded-2xl p-6 border border-border space-y-4">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
