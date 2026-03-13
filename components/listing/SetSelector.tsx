"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import { useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import type { Swiper as SwiperClass } from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Checkbox from "@/components/ui/Checkbox";
import { Package } from "@/types/package";
import { ListingSet } from "@/types/set";

import SetDetailModal from "./SetDetailModal";

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

    const handleCardClick = (set: ListingSet) => {
        setModalSet(set);
    };

    const handleToggle = (setId: string) => {
        onSetToggle(setId);
    };

    const handleSwiperUpdate = (swiper: SwiperClass) => {
        setIsBeginning(swiper.isBeginning);
        setIsEnd(swiper.isEnd);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Select Sets</h3>
                {onSelectAll && !selectedPackage && (
                    <button
                        onClick={onSelectAll}
                        disabled={disabled && !isEntireStudioBooked}
                        className={`text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed
                            ${isEntireStudioBooked
                                ? "bg-neutral-200 text-black hover:bg-neutral-300"
                                : "bg-black text-white hover:bg-neutral-800"
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
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 bg-white rounded-full border border-neutral-300 shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                    >
                        <HiOutlineChevronLeft className="text-neutral-700" size={16} />
                    </button>
                )}

                {/* Right navigation arrow */}
                {!isEnd && sets.length > 3 && (
                    <button
                        onClick={() => swiperRef.current?.slideNext()}
                        aria-label="Scroll right"
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 bg-white rounded-full border border-neutral-300 shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                    >
                        <HiOutlineChevronRight className="text-neutral-700" size={16} />
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
                                        onClick={() => !isDisabled && handleCardClick(set)}
                                        className={`
                                            relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer group transition-all
                                            ${isSelected ? "ring-2 ring-black ring-offset-2" : ""}
                                            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                                        `}
                                    >

                                        {set.images.length > 1 ? (
                                            <div className="absolute inset-0 z-0">
                                                <Swiper
                                                    loop={true}
                                                    speed={500}
                                                    className="h-full w-full"
                                                >
                                                    {set.images.map((img, idx) => (
                                                        <SwiperSlide key={idx}>
                                                            <div className="relative w-full h-full aspect-video">
                                                                <Image
                                                                    src={img}
                                                                    alt={`${set.name} image ${idx + 1}`}
                                                                    fill
                                                                    className="object-cover transition group-hover:scale-105"
                                                                />
                                                            </div>
                                                        </SwiperSlide>
                                                    ))}
                                                </Swiper>
                                            </div>
                                        ) : set.images.length === 1 ? (
                                            <Image
                                                src={set.images[0]}
                                                alt={set.name}
                                                fill
                                                className="object-cover transition group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                                                <span className="text-xs text-neutral-500">No Image</span>
                                            </div>
                                        )}


                                        <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center p-2 text-center
                                            ${isSelected ? "bg-black/40" : "bg-black/0 group-hover:bg-black/40"}
                                        `}>
                                            <h4 className={`font-bold text-white text-lg drop-shadow-md leading-tight transition-opacity duration-300
                                                ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                                            `}>
                                                {set.name}
                                            </h4>
                                        </div>


                                        <div className="absolute top-2 right-2 z-10">
                                            <Checkbox
                                                checked={isSelected}
                                                readOnly
                                                className="pointer-events-none data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                            />
                                        </div>

                                        {!isAvailable && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                                                <span className="text-xs font-bold text-red-600 bg-white/80 px-2 py-1 rounded-md shadow-sm">
                                                    Unavailable
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>

            {sets.length === 0 && (
                <p className="text-center text-neutral-500 py-8">
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
