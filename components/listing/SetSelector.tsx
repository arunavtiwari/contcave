"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import { useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import type { Swiper as SwiperClass } from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { IoInformationCircleOutline } from "react-icons/io5";

import Checkbox from "@/components/inputs/Checkbox";
import SetDetailModal from "@/components/listing/SetDetailModal";
import Heading from "@/components/ui/Heading";
import { Package } from "@/types/package";
import { ListingSet } from "@/types/set";

interface SetSelectorProps {
    sets: ListingSet[];
    selectedSetIds: string[];
    onSetToggle: (setId: string) => void;
    onSelectAll?: () => void;
    includedSetId: string | null;
    pricingType: "FIXED" | "HOURLY" | null;
    hours?: number;

    disabled?: boolean;
    selectedPackage?: Package | null;
    availableSetIds?: string[];
    isEntireStudioBooked?: boolean;
}

const INR = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

export default function SetSelector({
    sets,
    selectedSetIds,
    onSetToggle,
    onSelectAll,
    includedSetId,
    pricingType,
    hours = 1,

    disabled = false,
    selectedPackage,
    availableSetIds = [],
    isEntireStudioBooked = false,
}: SetSelectorProps) {
    const [modalSet, setModalSet] = useState<ListingSet | null>(null);
    const [isBeginning, setIsBeginning] = useState(true);
    const [isEnd, setIsEnd] = useState(false);
    const swiperRef = useRef<SwiperClass>(null);

    const getSetPrice = (set: ListingSet) => {
        if (set.id === includedSetId) {
            return { label: "Included", amount: 0 };
        }

        if (selectedPackage) {
            return { label: "Package pricing", amount: 0 };
        }

        if (pricingType === "HOURLY") {
            const total = set.price * hours;
            return {
                label: `+${INR.format(set.price)}/hr`,
                amount: total,
            };
        }

        return {
            label: `+${INR.format(set.price)}`,
            amount: set.price,
        };
    };

    const handleToggle = (setId: string) => {
        if (!isEntireStudioBooked) onSetToggle(setId);
    };

    const handleSwiperUpdate = (swiper: SwiperClass) => {
        setIsBeginning(swiper.isBeginning);
        setIsEnd(swiper.isEnd);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Heading
                    title="Select Sets"
                    variant="h5"
                />
                {onSelectAll && !selectedPackage && (
                    <button
                        onClick={onSelectAll}
                        disabled={disabled && !isEntireStudioBooked}
                        className={`text-sm font-medium px-4 py-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed
                            ${isEntireStudioBooked
                                ? "bg-muted text-foreground hover:bg-muted/80 shadow-sm"
                                : "bg-foreground text-background hover:bg-neutral-800 shadow-sm hover:shadow-md"
                            }`}
                    >
                        {isEntireStudioBooked ? "Clear Selection" : "Book the Entire Studio"}
                    </button>
                )}
            </div>

            <div className="relative overflow-hidden">
                {/* Left navigation arrow */}
                {!isBeginning && (
                    <button
                        onClick={() => swiperRef.current?.slidePrev()}
                        aria-label="Scroll left"
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 bg-background rounded-full border border-border  hover:scale-105 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <HiOutlineChevronLeft className="text-muted-foreground" size={16} />
                    </button>
                )}

                {/* Right navigation arrow */}
                {!isEnd && sets.length >= 3 && (
                    <button
                        onClick={() => swiperRef.current?.slideNext()}
                        aria-label="Scroll right"
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 bg-background rounded-full border border-border  hover:scale-105 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <HiOutlineChevronRight className="text-muted-foreground" size={16} />
                    </button>
                )}

                <Swiper
                    modules={[Navigation]}
                    slidesPerView="auto"
                    spaceBetween={16}
                    slidesPerGroup={1}
                    breakpoints={{
                        768: { slidesPerGroup: 2 },
                    }}
                    slidesOffsetBefore={4}
                    slidesOffsetAfter={4}
                    speed={400}
                    onSwiper={(swiper: SwiperClass) => {
                        swiperRef.current = swiper;
                        handleSwiperUpdate(swiper);
                    }}
                    onSlideChange={handleSwiperUpdate}
                    onReachBeginning={() => setIsBeginning(true)}
                    onReachEnd={() => setIsEnd(true)}
                    onFromEdge={(swiper: SwiperClass) => {
                        setIsBeginning(swiper.isBeginning);
                        setIsEnd(swiper.isEnd);
                    }}
                    className="overflow-visible!"
                >
                    {sets.map((set) => {
                        const isSelected = selectedSetIds.includes(set.id);

                        const isEligible = !selectedPackage ||
                            !selectedPackage.eligibleSetIds ||
                            selectedPackage.eligibleSetIds.length === 0 ||
                            selectedPackage.eligibleSetIds.includes(set.id);

                        const isAvailable = availableSetIds.length === 0 || availableSetIds.includes(set.id);

                        const isDisabled = !isAvailable || !isEligible || disabled || isEntireStudioBooked;

                        return (
                            <SwiperSlide key={set.id} style={{ width: "256px" }}>
                                <div className="py-2">
                                    <div
                                        onClick={() => !isDisabled && handleToggle(set.id)}
                                        className={`
                                            relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer group transition-all
                                            ${isSelected ? "ring-2 ring-foreground ring-offset-2" : ""}
                                            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                                        `}
                                    >
                                        {set.images.length > 1 ? (
                                            <div className="absolute inset-0 z-0">
                                                <Swiper loop speed={500} className="h-full w-full">
                                                    {set.images.map((img, idx) => (
                                                        <SwiperSlide key={idx}>
                                                            <div className="relative w-full h-full aspect-video">
                                                                <Image src={img} alt={`${set.name} image ${idx + 1}`} fill sizes="220px" className="object-cover transition group-hover:scale-105" />
                                                            </div>
                                                        </SwiperSlide>
                                                    ))}
                                                </Swiper>
                                            </div>
                                        ) : set.images.length === 1 ? (
                                            <Image src={set.images[0]} alt={set.name} fill sizes="220px" className="object-cover transition group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <span className="text-xs text-muted-foreground">No Image</span>
                                            </div>
                                        )}

                                        {/* Selection overlay (no text — name shown below card) */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-foreground/30" />
                                        )}

                                        {/* Checkbox top-right */}
                                        <div className="absolute top-2 right-2 z-10" onClick={(e) => { e.stopPropagation(); if (!isDisabled) handleToggle(set.id); }}>
                                            <Checkbox
                                                checked={isSelected}
                                                className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                                            />
                                        </div>

                                        {/* Info icon bottom-left → opens detail modal */}
                                        {(set.description || set.images.length > 1) && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setModalSet(set); }}
                                                className="absolute bottom-2 left-2 z-10 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                                                aria-label="View set details"
                                            >
                                                <IoInformationCircleOutline size={14} className="text-foreground" />
                                            </button>
                                        )}

                                        {!isAvailable && (
                                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                                                <span className="text-xs font-bold text-destructive bg-background/80 px-2 py-1 rounded-md">Unavailable</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Name + price below card */}
                                    <div className="mt-1.5 px-0.5 flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-foreground truncate">{set.name}</p>
                                        <p className="text-xs text-muted-foreground shrink-0">{getSetPrice(set).label}</p>
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>

            {sets.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    No sets available for this listing
                </p>
            )}

            <SetDetailModal
                isOpen={!!modalSet}
                onClose={() => setModalSet(null)}
                set={modalSet}
                isSelected={modalSet ? selectedSetIds.includes(modalSet.id) : false}
                onToggle={() => modalSet && handleToggle(modalSet.id)}
                priceLabel={modalSet ? getSetPrice(modalSet).label : ""}
                isAvailable={modalSet ? (availableSetIds.length === 0 || availableSetIds.includes(modalSet.id)) : false}
                isEligible={modalSet ? (!selectedPackage || !selectedPackage.eligibleSetIds || selectedPackage.eligibleSetIds.length === 0 || selectedPackage.eligibleSetIds.includes(modalSet.id)) : false}
            />
        </div>
    );
}


