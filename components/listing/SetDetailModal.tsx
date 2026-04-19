"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import { useRef, useState } from "react";
import { IoCheckmark, IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import type { Swiper as SwiperClass } from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Button from "@/components/ui/Button";
import { ListingSet } from "@/types/set";

interface SetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    set: ListingSet | null;
    isSelected: boolean;
    onToggle: () => void;
    priceLabel: string;
    isAvailable: boolean;
    isEligible: boolean;
}

export default function SetDetailModal({
    isOpen,
    onClose,
    set,
    isSelected,
    onToggle,
    priceLabel,
    isAvailable,
    isEligible,
}: SetDetailModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const swiperRef = useRef<SwiperClass>(null);

    if (!isOpen || !set) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}>
            <div
                className="relative w-full max-w-4xl bg-background rounded-3xl overflow-hidden  flex flex-col md:flex-row h-[70vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-foreground/40 hover:bg-foreground/60 text-background rounded-full transition backdrop-blur-md "
                >
                    <IoClose size={18} />
                </button>


                <div className="w-full md:w-3/5 bg-neutral-100 relative min-h-75 md:min-h-full group">
                    {set.images.length > 0 ? (
                        <>
                            <Swiper
                                modules={[Navigation]}
                                loop={set.images.length > 1}
                                speed={400}
                                navigation={{
                                    nextEl: ".set-modal-next",
                                    prevEl: ".set-modal-prev",
                                }}
                                onSlideChange={(swiper) => setCurrentImageIndex(swiper.realIndex)}
                                onSwiper={(swiper: SwiperClass) => { swiperRef.current = swiper; }}
                                className="h-full w-full"
                            >
                                {set.images.map((img, idx) => (
                                    <SwiperSlide key={idx}>
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={img}
                                                alt={`${set.name} image ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                                priority={idx === 0}
                                            />
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>

                            {set.images.length > 1 && (
                                <>
                                    <button
                                        className="set-modal-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-background/80 hover:bg-background text-foreground rounded-full  transition md:opacity-0 md:group-hover:opacity-100 md:-translate-x-2.5 md:group-hover:translate-x-0 duration-300 cursor-pointer"
                                    >
                                        <IoChevronBack size={20} />
                                    </button>
                                    <button
                                        className="set-modal-next absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-background/80 hover:bg-background text-foreground rounded-full  transition md:opacity-0 md:group-hover:opacity-100 md:translate-x-2.5 md:group-hover:translate-x-0 duration-300 cursor-pointer"
                                    >
                                        <IoChevronForward size={20} />
                                    </button>

                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-foreground/20 px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
                                        {set.images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? "bg-background w-6" : "bg-background/50 w-1.5"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted">
                            <span className="text-lg font-medium">No images available</span>
                        </div>
                    )}
                </div>


                <div className="w-full md:w-2/5 p-8 flex flex-col overflow-y-auto bg-background">
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h2 className="text-3xl font-bold text-foreground leading-tight">{set.name}</h2>
                        </div>

                        <div className="inline-flex items-center px-4 py-2 bg-foreground text-background rounded-xl text-sm font-bold mb-6 shadow-lg shadow-foreground/10">
                            {priceLabel}
                        </div>

                        <div className="prose prose-neutral text-muted-foreground mb-8 leading-relaxed">
                            <p>{set.description || "No description available for this set."}</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-neutral-100 space-y-4">
                        {!isAvailable && (
                            <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm text-center font-medium border border-destructive/20">
                                Not available for the selected time
                            </div>
                        )}

                        {!isEligible && (
                            <div className="p-4 bg-warning/10 text-warning rounded-xl text-sm text-center font-bold border border-warning/20">
                                Not eligible for the selected package
                            </div>
                        )}

                        <Button
                            label={isSelected ? "Selected" : "Select Set"}
                            onClick={() => {
                                onToggle();
                                onClose();
                            }}
                            disabled={!isAvailable || !isEligible}
                            outline={isSelected}
                            icon={isSelected ? IoCheckmark : undefined}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

