import React from "react";

import Heading from "@/components/ui/Heading";
import Skeleton from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col w-full gap-8">
      <Heading title="Settings" subtitle="Manage your account settings." />
      <div className="flex flex-col gap-8">
        <div className="pl-4 space-y-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-3">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <div className="pl-4 space-y-2">
                <Skeleton className="h-4 w-64 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Danger Zone Card skeleton */}
        <div className="bg-destructive/5 p-6 rounded-2xl border border-destructive/10 space-y-4">
          <Skeleton className="h-7 w-32 bg-destructive/10 rounded-lg" />
          <Skeleton className="h-5 w-28 bg-destructive/10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </div>
          <Skeleton className="h-11 w-36 bg-destructive/20 rounded-xl mt-2" />
        </div>
      </div>
    </div>
  );
}
