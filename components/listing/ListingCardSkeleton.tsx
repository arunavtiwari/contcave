import React from "react";

import Skeleton from "@/components/ui/Skeleton";

interface ListingCardSkeletonProps {
    hideActions?: boolean;
    showRating?: boolean;
    isReservation?: boolean;
    isHost?: boolean;
}

const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({
    hideActions,
    showRating = true,
    isReservation = false,
    isHost = false
}) => (
    <div className="flex flex-col w-full">
        {/* Media shell matches rounded-xl aspect-[4/3] mb-3 bg-neutral-100 border border-foreground/5 */}
        <div className="relative mb-3 overflow-hidden rounded-xl aspect-[4/3] bg-neutral-100 border border-foreground/5">
            <Skeleton className="w-full h-full rounded-none" />

            {/* Status Pill Skeleton (Reservation) */}
            {isReservation && (
                <div className="absolute left-3 top-3 z-20">
                    <Skeleton className="h-6 w-20 rounded-full opacity-80" />
                </div>
            )}

            {/* Pricing Skeleton */}
            <div className="absolute bottom-3 right-3 z-20">
                <Skeleton className="h-7.5 w-16 rounded-full opacity-80" />
            </div>
        </div>

        <div className="px-1 pt-1 pb-1">
            {/* Chips & Location Line Row */}
            <div className="flex items-start justify-between gap-3">
                {/* Simulated Chips on the left */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* We render 2 chips: carpet area + pax */}
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                    {showRating && <Skeleton className="h-5 w-11 rounded-full opacity-60" />}
                </div>

                {/* Location/Date label on the right */}
                <div className="mt-2 shrink-0">
                    <Skeleton className="h-3.5 w-16 rounded-md opacity-60" />
                </div>
            </div>

            {/* Title (matches Heading variant="h6" className="text-sm mt-2") */}
            <div className="mt-2.5">
                <Skeleton className="h-4.5 w-3/4 rounded-md" />
                <Skeleton className="h-4.5 w-1/2 rounded-md mt-1.5" />
            </div>

            {/* Action Buttons Row */}
            {!hideActions && (
                <div className="flex mt-4 pt-1 gap-2">
                    {isReservation && (
                        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    )}
                    <div className="flex gap-2 flex-1">
                        <Skeleton className="h-9 flex-1 rounded-xl" />
                        {(isReservation || !hideActions) && <Skeleton className="h-9 flex-1 rounded-xl" />}
                        {isReservation && isHost && <Skeleton className="h-9 flex-1 rounded-xl" />}
                    </div>
                </div>
            )}
        </div>
    </div>
);

export default ListingCardSkeleton;
