"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useRef, useState } from "react";
import { MdVerified } from "react-icons/md";

import HeartButton from "@/components/HeartButton";
import Pill from "@/components/ui/Pill";
import { SafeUser } from "@/types/user";

interface ListingCardMediaProps {
    images: string[];
    displayTitle: string;
    cardHref: string;
    isVerified?: boolean;
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
}

const ListingCardMedia: React.FC<ListingCardMediaProps> = ({
    images,
    displayTitle,
    cardHref,
    isVerified,
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
            className="relative mb-3 overflow-hidden rounded-2xl aspect-video bg-neutral-100 border border-foreground/5"
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
                            priority={currentIndex === 0}
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
                            priority
                        />
                    </div>
                )}

                {/* Soft Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-foreground/20 via-transparent to-foreground/5 opacity-60 pointer-events-none z-10" />
            </Link>

            {/* Verification Badge */}
            {isVerified && (
                <div className={`absolute left-3 top-3.5 z-20 rounded-full bg-foreground/20 backdrop-blur-md transition-transform ${allowScale ? "group-hover:scale-110" : ""}`}>
                    <MdVerified className="text-white" size={20} />
                </div>
            )}

            {/* Status Badge (Reservation) */}
            {reservationStatus !== undefined && (
                <div className={`absolute left-3 top-3 z-20 transition-transform ${allowScale ? "group-hover:scale-110" : ""}`}>
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
                        className="font-bold uppercase tracking-wider text-[10px] px-3 border border-white/20 shadow-md"
                    />
                </div>
            )}

            {/* Pricing Backdrop */}
            <Pill
                label={
                    <div className="flex gap-1 items-center font-medium">
                        {hasSets && !isReservation && <span className="text-[10px] opacity-70">From</span>}
                        <span className="text-xs">₹{(totalPrice ?? formattedPrice).toLocaleString("en-IN")}</span>
                        {!isReservation && <span className="text-[10px] opacity-70">/ Hr</span>}
                    </div>
                }
                variant="glass"
                size="sm"
                className="absolute bottom-3 right-3 z-20"
            />

            {!onEdit && showHeart && (
                <div className={`absolute top-2.5 right-3 z-30 transition-transform ${allowScale ? "group-hover:scale-110" : ""}`}>
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
