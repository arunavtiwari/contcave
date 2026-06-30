import React from "react";

import Heading from "@/components/ui/Heading";
import Skeleton from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col w-full gap-8">
      <Heading title="My Profile" subtitle="Manage your profile information." />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-background rounded-2xl border border-border overflow-hidden">
            {/* Banner placeholder */}
            <div className="relative h-24 bg-foreground/5 animate-shimmer">
              <div className="absolute -bottom-12 left-8">
                <div className="w-24 h-24 rounded-full border-4 border-background bg-foreground/5 animate-shimmer" />
              </div>
            </div>

            {/* Profile info block */}
            <div className="pt-14 py-6 px-8">
              <div className="flex justify-between mb-6 gap-8 items-center">
                <Skeleton className="h-8 w-48 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
              <div className="space-y-2 mb-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>

          {/* Personal Details skeleton */}
          <div className="bg-background rounded-2xl border border-border p-8">
            <Skeleton className="h-7 w-40 mb-6 rounded-lg" />
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28 rounded-lg" />
                  <Skeleton className="h-5 w-44 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Verification Status Card skeleton */}
        <div className="space-y-6">
          <div className="bg-background border border-border rounded-2xl p-6">
            <div className="text-center space-y-4">
              <Skeleton className="w-12 h-12 rounded-full mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 mx-auto rounded-lg" />
                <Skeleton className="h-4 w-56 mx-auto rounded-lg" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
