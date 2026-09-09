"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";

import HeartButton from "@/components/listing/HeartButton";
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
    reservationLifecycleStatus?: string;
    totalPrice?: number;
    priority?: boolean;
    showListingBadge?: boolean;
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
    reservationLifecycleStatus,
    totalPrice,
    priority = false,
    showListingBadge = false,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const slideshowInterval = useRef<NodeJS.Timeout | null>(null);
    const touchStartX = useRef<number | null>(null);

    const clearSlideshow = () => {
        if (slideshowInterval.current) {
            clearInterval(slideshowInterval.current);
            slideshowInterval.current = null;
        }
    };

    const handleMouseEnter = () => {
        if (images.length <= 1) return;
        slideshowInterval.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 2800);
    };

    const handleMouseLeave = () => {
        clearSlideshow();
        setCurrentIndex(0);
    };

    const goToPrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (images.length <= 1) return;
        clearSlideshow();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (images.length <= 1) return;
        clearSlideshow();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || images.length <= 1) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const SWIPE_THRESHOLD = 40;
        if (deltaX > SWIPE_THRESHOLD) {
            setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        } else if (deltaX < -SWIPE_THRESHOLD) {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }
        touchStartX.current = null;
    };

    return (
        <div
            className="relative mb-3 overflow-hidden rounded-xl aspect-4/3 bg-neutral-100 border border-foreground/5"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <Link href={cardHref} className="block h-full w-full relative">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0"
                    >
                        <Image
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className={`object-cover h-full w-full transition-transform duration-400 ease-out ${allowScale ? "group-hover:scale-110" : ""}`}
                            src={images[currentIndex]}
                            alt={displayTitle}
                            priority={priority && currentIndex === 0}
                        />
                    </motion.div>
                </AnimatePresence>

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

                <div className="absolute inset-0 bg-linear-to-t from-foreground/20 via-transparent to-foreground/5 opacity-60 pointer-events-none z-10" />
            </Link>

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={goToPrev}
                        className="absolute left-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-background/40 bg-foreground/50 p-1.5 text-background backdrop-blur-md transition-all duration-200 active:scale-90 hover:bg-foreground/70 lg:hidden"
                    >
                        <HiOutlineChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        aria-label="Next photo"
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-background/40 bg-foreground/50 p-1.5 text-background backdrop-blur-md transition-all duration-200 active:scale-90 hover:bg-foreground/70 lg:hidden"
                    >
                        <HiOutlineChevronRight size={16} />
                    </button>
                </>
            )}

            {showListingBadge && !reservationLifecycleStatus && (listingType === "CURATED" || isVerified) && (
                <div className="absolute left-3 top-3 z-20">
                    {listingType === "CURATED" ? (
                        <Pill
                            label="Curated"
                            variant="curated-button"
                            size="xs"
                            className="bg-background/80 backdrop-blur-md text-[11px] font-semibold tracking-normal border border-warning/30 shadow-sm"
                        />
                    ) : (
                        <Pill
                            label="Verified"
                            variant="verified-button"
                            size="xs"
                            className="bg-background/80 backdrop-blur-md text-[11px] font-semibold tracking-normal border border-success/30 shadow-sm"
                        />
                    )}
                </div>
            )}

            {reservationLifecycleStatus && (
                <div className={`absolute left-3 top-3 z-20 transition-transform ${allowScale ? "group-hover:scale-110" : ""}`}>
                    <Pill
                        label={
                            reservationLifecycleStatus.replaceAll("_", " ")
                        }
                        variant={
                            reservationLifecycleStatus === "COMPLETED" || reservationLifecycleStatus === "CHECKED_IN" || reservationLifecycleStatus === "CONFIRMED" ? "success" :
                                reservationLifecycleStatus === "PENDING_APPROVAL" ? "warning" : "destructive"
                        }
                        size="xs"
                        className={`bg-background/80 backdrop-blur-md font-semibold text-[11px] px-3 border shadow-sm ${
                            reservationLifecycleStatus === "COMPLETED" || reservationLifecycleStatus === "CHECKED_IN" || reservationLifecycleStatus === "CONFIRMED" ? "text-success border-success/30" :
                                reservationLifecycleStatus === "PENDING_APPROVAL" ? "text-warning border-warning/30" : "text-destructive border-destructive/30"
                        }`}
                    />
                </div>
            )}

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
                <div className="absolute top-3 right-3 z-30">
                    <HeartButton listingId={listingId} currentUser={currentUser} />
                </div>
            )}

            {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 opacity-100 transition-all duration-300 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100">
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
