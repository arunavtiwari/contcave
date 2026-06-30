"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useRef, useState } from "react";

import HeartButton from "@/components/HeartButton";
import Pill from "@/components/ui/Pill";
import { SafeUser } from "@/types/user";

interface ListingCardMediaProps {
    images: string[];
    displayTitle: string;
    cardHref: string;
    isVerified?: boolean;
    listingType?: "STANDARD" | "CURATED";
    priceRangeMin?: number;
    priceRangeMax?: number;
    formattedPrice: number;
    hasSets?: boolean;
    isReservation?: boolean;
    showHeart?: boolean;
    listingId: string;
    currentUser?: SafeUser | null;
    onEdit?: boolean;
    allowScale?: boolean;
    reservationStatus?: number;
    totalPrice?: number;
    priority?: boolean;
}

const ListingCardMedia: React.FC<ListingCardMediaProps> = ({
    images,
    displayTitle,
    cardHref,
    isVerified,
    listingType = "STANDARD",
    priceRangeMin,
    priceRangeMax,
    formattedPrice,
    hasSets,
    isReservation,
    showHeart,
    listingId,
    currentUser,
    onEdit,
    allowScale = true,
    reservationStatus,
    totalPrice,
    priority = false,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const slideshowInterval = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (images.length <= 1) return;
        slideshowInterval.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 2800);
    };

    const handleMouseLeave = () => {
        if (images.length > 1 && slideshowInterval.current) {
            clearInterval(slideshowInterval.current);
            slideshowInterval.current = null;
        }
        setCurrentIndex(0);
    };

    return (
        <div
            className="relative mb-2 overflow-hidden rounded-xl aspect-4/3 bg-neutral-100 border border-foreground/5"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Link href={cardHref} className="block h-full w-full relative">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        <Image
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className={`object-cover h-full w-full transition-transform duration-700 ease-out ${allowScale ? "group-hover:scale-110" : ""}`}
                            src={images[currentIndex]}
                            alt={displayTitle}
                            priority={priority && currentIndex === 0}
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Hidden Preloading for Next Image */}
                {images.length > 1 && (
                    <div className="hidden">
                        <Image
                            src={images[(currentIndex + 1) % images.length]}
                            alt="preload"
                            width={10}
                            height={10}
                        />
                    </div>
                )}

                {/* Soft Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-foreground/20 via-transparent to-foreground/5 opacity-60 pointer-events-none z-10" />
            </Link>

            {/* Listing Type / Verified Badge */}
            {!reservationStatus && (listingType === "CURATED" || isVerified) && (
                <div className="absolute left-3.5 top-3.5 z-20">
                    {listingType === "CURATED" ? (
                        <Pill
                            label="Curated"
                            variant="curated-button"
                            size="xs"
                            className="text-[11px] font-semibold tracking-normal border border-warning/30"
                        />
                    ) : (
                        <Pill
                            label="Verified"
                            variant="verified-button"
                            size="xs"
                            className="text-[11px] font-semibold tracking-normal border border-success/30"
                        />
                    )}
                </div>
            )}

            {/* Status Badge (Reservation) */}
            {reservationStatus !== undefined && (
                <div className={`absolute left-3.5 top-3.5 z-20 transition-transform ${allowScale ? "group-hover:scale-110" : ""}`}>
                    <Pill
                        label={
                            reservationStatus === 1 ? "Approved" :
                                reservationStatus === 0 ? "Pending" :
                                    reservationStatus === 2 ? "Rejected" : "Cancelled"
                        }
                        variant={
                            reservationStatus === 1 ? "success" :
                                reservationStatus === 0 ? "warning" : "destructive"
                        }
                        size="xs"
                        className={`font-semibold text-[11px] px-3 border ${
                            reservationStatus === 1 ? "border-success/30" :
                                reservationStatus === 0 ? "border-warning/30" : "border-destructive/30"
                        }`}
                    />
                </div>
            )}

            {/* Pricing Backdrop */}
            <Pill
                label={
                    <div className="flex gap-1 items-center font-medium">
                        {listingType === "CURATED" ? (
                            priceRangeMin && priceRangeMax ? (
                                <>
                                    <span className="text-[10px] opacity-70">Est.</span>
                                    <span className="text-xs">₹{priceRangeMin.toLocaleString("en-IN")}–{priceRangeMax.toLocaleString("en-IN")}</span>
                                    <span className="text-[10px] opacity-70">/ hr</span>
                                </>
                            ) : (
                                <span className="text-xs">Price on Demand</span>
                            )
                        ) : (
                            <>
                                {hasSets && !isReservation && <span className="text-[10px] opacity-70">From</span>}
                                <span className="text-xs">₹{(totalPrice ?? formattedPrice).toLocaleString("en-IN")}</span>
                                {!isReservation && <span className="text-[10px] opacity-70">/ hr</span>}
                            </>
                        )}
                    </div>
                }
                variant="glass"
                size="sm"
                className="absolute bottom-3 right-3 z-20"
            />

            {!onEdit && showHeart && (
                <div className="absolute top-2.5 right-3 z-30">
                    <HeartButton listingId={listingId} currentUser={currentUser} />
                </div>
            )}

            {/* Slideshow Progress Indicators */}
            {images.length > 1 && (
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {images.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? "bg-white w-4" : "bg-white/40 w-1"
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(ListingCardMedia);
