"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IoCheckmark, IoCheckmarkCircle, IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import type { Swiper as SwiperClass } from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Button from "@/components/ui/Button";
import Dialog, { DialogTitle } from "@/components/ui/Dialog";
import Heading from "@/components/ui/Heading";
import MediaButton from "@/components/ui/MediaButton";
import Pill from "@/components/ui/Pill";
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
    const [justActed, setJustActed] = useState<"added" | "removed" | null>(null);
    const swiperRef = useRef<SwiperClass>(null);

    useEffect(() => {
        if (!isOpen) setJustActed(null);
    }, [isOpen]);

    if (!set) return null;

    const handleToggle = () => {
        setJustActed(isSelected ? "removed" : "added");
        onToggle();
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            overlayClassName="backdrop-blur-sm"
            className="flex h-[70vh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden rounded-3xl bg-background md:flex-row"
        >
                <MediaButton icon={IoClose} tone="dark" size="sm"
                    aria-label="Close set details"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20" />


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
                                                sizes="(max-width: 768px) 100vw, 540px"
                                                className="object-cover"
                                                priority={idx === 0}
                                            />
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>

                            {set.images.length > 1 && (
                                <>
                                    <MediaButton icon={IoChevronBack} tone="light" size="md"
                                        aria-label="Previous set photo"
                                        className="set-modal-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 transition duration-300 md:opacity-0 md:group-hover:opacity-100 md:-translate-x-2.5 md:group-hover:translate-x-0" />
                                    <MediaButton icon={IoChevronForward} tone="light" size="md"
                                        aria-label="Next set photo"
                                        className="set-modal-next absolute right-4 top-1/2 -translate-y-1/2 z-10 transition duration-300 md:opacity-0 md:group-hover:opacity-100 md:translate-x-2.5 md:group-hover:translate-x-0" />

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


                <div className="w-full md:w-2/5 p-8 flex flex-col overflow-y-auto bg-background gap-6">
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <DialogTitle asChild><div><Heading title={set.name} variant="h3" /></div></DialogTitle>
                        </div>

                        <div>
                            <Pill
                                label={priceLabel}
                                variant="solid"
                                size="md"
                            />
                        </div>

                        <div className="prose prose-neutral text-muted-foreground leading-relaxed mt-2">
                            <p>{set.description || "No description available for this set."}</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-neutral-100 flex flex-col gap-4">
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

                        {justActed && (
                            <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                                justActed === "added"
                                    ? "bg-success/10 text-success border border-success/20"
                                    : "bg-neutral-100 text-muted-foreground border border-border"
                            }`}>
                                <IoCheckmarkCircle size={16} />
                                {justActed === "added" ? "Added to your booking" : "Removed from your booking"}
                            </div>
                        )}

                        <Button
                            label={isSelected ? "Remove Set" : "Select Set"}
                            onClick={handleToggle}
                            disabled={!isAvailable || !isEligible}
                            outline={isSelected}
                            icon={isSelected ? undefined : IoCheckmark}
                        />
                    </div>
                </div>
        </Dialog>
    );
}
