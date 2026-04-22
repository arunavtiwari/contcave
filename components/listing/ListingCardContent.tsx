"use client";

import Link from "next/link";
import React from "react";
import { AiFillStar } from "react-icons/ai";

import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";

interface ListingCardContentProps {
    displayTitle: string;
    cardHref: string;
    locationLabel: string;
    category?: string;
    ratingValue?: number;
    reviewCount?: number;
    showRating?: boolean;
    reservationDate?: string;
    reservationTime?: string;
}

const ListingCardContent: React.FC<ListingCardContentProps> = ({
    displayTitle,
    cardHref,
    locationLabel,
    category,
    ratingValue,
    reviewCount,
    showRating,
    reservationDate,
    reservationTime,
}) => {
    return (
        <div>
            <div className="mb-2 flex items-start justify-between gap-4">
                <Link href={cardHref} className="min-w-0 flex-1">
                    <Heading
                        title={displayTitle}
                        variant="h6"
                        className="text-sm leading-tight truncate"
                    />
                </Link>
                {reservationDate ? (
                    <p className="shrink-0 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-100">
                        {reservationDate} {reservationTime && `• ${reservationTime}`}
                    </p>
                ) : (
                    <p className="shrink-0 text-xs font-semibold text-muted-foreground/80 uppercase">
                        {locationLabel}
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between">
                <Pill
                    label={category || "Creative Space"}
                    variant="card-category"
                    size="xs"
                />

                {ratingValue != null && showRating && (
                    <Pill
                        label={
                            <span className="text-[11px] font-extrabold flex items-center gap-1">
                                {ratingValue.toFixed(1)}
                                {reviewCount !== undefined && reviewCount > 0 && (
                                    <span className="font-medium text-muted-foreground opacity-60 tracking-tighter">
                                        ({reviewCount})
                                    </span>
                                )}
                            </span>
                        }
                        icon={AiFillStar}
                        variant="card-rating"
                        size="xs"
                    />
                )}
            </div>
        </div>
    );
};

export default React.memo(ListingCardContent);
