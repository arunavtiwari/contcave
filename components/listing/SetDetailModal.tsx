"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { IoCheckmark, IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";

import Button from "@/components/Button";
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

    const handleNextImage = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!set) return;
        setCurrentImageIndex((prev) => (prev + 1) % set.images.length);
    }, [set]);

    const handlePrevImage = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!set) return;
        setCurrentImageIndex((prev) => (prev - 1 + set.images.length) % set.images.length);
    }, [set]);

    if (!isOpen || !set) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
                >
                    <IoClose size={20} />
                </button>

                {/* Image Section */}
                <div className="w-full md:w-1/2 bg-neutral-100 relative min-h-[300px] md:min-h-full">
                    {set.images.length > 0 ? (
                        <>
                            <Image
                                src={set.images[currentImageIndex]}
                                alt={set.name}
                                fill
                                className="object-cover"
                            />

                            {set.images.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition"
                                    >
                                        <IoChevronBack size={20} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition"
                                    >
                                        <IoChevronForward size={20} />
                                    </button>

                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {set.images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-white w-4" : "bg-white/50"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-neutral-400">
                            No images available
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">{set.name}</h2>
                        <div className="inline-block px-3 py-1 bg-neutral-100 rounded-full text-sm font-medium text-neutral-800 mb-6">
                            {priceLabel}
                        </div>

                        <div className="prose prose-sm text-neutral-600 mb-8">
                            <p>{set.description || "No description available for this set."}</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-neutral-100 space-y-3">
                        {!isAvailable && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center font-medium">
                                Not available for the selected time
                            </div>
                        )}

                        {!isEligible && (
                            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm text-center font-medium">
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
