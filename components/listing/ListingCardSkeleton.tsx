import React from "react";

import Skeleton from "@/components/ui/Skeleton";

interface ListingCardSkeletonProps {
    hideActions?: boolean;
    showRating?: boolean;
    isReservation?: boolean;
}

const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({
    hideActions,
    showRating = true,
    isReservation = false
}) => (
    <div className="flex flex-col w-full">
        {/* Media shell matches rounded-2xl aspect-video */}
        <div className="relative mb-4 overflow-hidden rounded-2xl aspect-video bg-gray-200 border border-foreground/5">
            <Skeleton className="w-full h-full rounded-none" />

            {/* Status Pill Skeleton (Reservation) */}
            {isReservation && (
                <div className="absolute left-3 top-3 z-20">
                    <Skeleton className="h-6 w-20 rounded-full opacity-80" />
                </div>
            )}

            {/* Pricing Skeleton */}
            <div className="absolute bottom-3 right-3 z-20">
                <Skeleton className="h-7 w-16 rounded-full opacity-80" />
            </div>
        </div>

        <div className="px-0.5">
            {/* Title & Location/Date Row */}
            <div className="mb-2 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                </div>
                <div className="shrink-0">
                    <Skeleton className={`h-4 w-16 rounded-md ${isReservation ? "opacity-100" : "opacity-60"}`} />
                </div>
            </div>

            {/* Category & Rating Row */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                {showRating && <Skeleton className="h-5 w-12 rounded-full opacity-60" />}
            </div>

            {/* Action Buttons Row */}
            {!hideActions && (
                <div className="flex mt-4 gap-2">
                    <Skeleton className="h-10 flex-1 rounded-full" />
                    <Skeleton className="h-10 flex-1 rounded-full" />
                </div>
            )}
        </div>
    </div>
);

export default ListingCardSkeleton;
