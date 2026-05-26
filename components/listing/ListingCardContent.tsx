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
    carpetArea?: number;
    maximumPax?: number;
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
    carpetArea,
    maximumPax,
    ratingValue,
    reviewCount,
    showRating,
    reservationDate,
    reservationTime,
}) => {
    const locationLine = reservationDate
        ? `${reservationDate}${reservationTime ? ` • ${reservationTime}` : ""}`
        : locationLabel;

    const chips: { label: string; key: string }[] = [];
    if (carpetArea && carpetArea > 0) chips.push({ key: "area", label: `${carpetArea.toLocaleString("en-IN")} sq ft` });
    if (maximumPax && maximumPax > 0) chips.push({ key: "pax", label: `${maximumPax} pax` });

    const hasChips = chips.length > 0 || (ratingValue != null && showRating);

    return (
        <div className="px-1 pt-1 pb-1">
            <div className="flex items-start justify-between gap-3">

                    {hasChips && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {chips.map((chip) => (
                                <Pill
                                    key={chip.key}
                                    label={chip.label}
                                    variant="outline"
                                    size="xs"
                                />
                            ))}

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
                    )}

                    <p className="mt-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider leading-none">
                        {locationLine}
                    </p>
                </div>

            <Link href={cardHref} className="block mt-2">
                <Heading
                    title={displayTitle}
                    variant="h6"
                    className="text-sm leading-snug line-clamp-2"
                />
            </Link>

        </div>
    );
};

export default React.memo(ListingCardContent);