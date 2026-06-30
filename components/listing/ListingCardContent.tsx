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
    return (
        <div className="px-0.5 pt-1 flex flex-col gap-0.5">
            {/* Top Row: Title/Heading (Left) & Rating (Right) */}
            <div className="flex items-start justify-between gap-3">
                <Link href={cardHref} className="block flex-1">
                    <Heading
                        title={displayTitle}
                        variant="h6"
                        className="text-[14px] font-semibold leading-snug line-clamp-1 text-foreground/90 group-hover:text-primary transition-colors"
                    />
                </Link>

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
                        className="shrink-0"
                    />
                )}
            </div>

            {/* Second Row: Location and specifications */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-[13px] text-muted-foreground font-normal">
                    {locationLine}
                </p>

                {chips.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {chips.map((chip) => (
                            <Pill
                                key={chip.key}
                                label={chip.label}
                                variant="outline"
                                size="xs"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(ListingCardContent);