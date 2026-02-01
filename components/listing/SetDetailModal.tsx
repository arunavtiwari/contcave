"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { IoCheckmark, IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}>
            <div
                className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-black/20 text-black md:text-white rounded-full transition backdrop-blur-md"
                >
                    <IoClose size={24} />
                </button>

                
                <div className="w-full md:w-3/5 bg-neutral-100 relative min-h-[300px] md:min-h-full group">
                    {set.images.length > 0 ? (
                        <>
                            <Image
                                src={set.images[currentImageIndex]}
                                alt={set.name}
                                fill
                                className="object-cover"
                                priority
                            />

                            {set.images.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white text-black rounded-full shadow-lg transition opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 duration-300"
                                    >
                                        <IoChevronBack size={20} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white text-black rounded-full shadow-lg transition opacity-0 group-hover:opacity-100 translate-x-[10px] group-hover:translate-x-0 duration-300"
                                    >
                                        <IoChevronForward size={20} />
                                    </button>

                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                        {set.images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? "bg-white w-6" : "bg-white/50 w-1.5"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-neutral-400 bg-neutral-50">
                            <span className="text-lg font-medium">No images available</span>
                        </div>
                    )}
                </div>

                
                <div className="w-full md:w-2/5 p-8 flex flex-col overflow-y-auto bg-white">
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h2 className="text-3xl font-bold text-neutral-900 leading-tight">{set.name}</h2>
                        </div>

                        <div className="inline-flex items-center px-3 py-1 bg-neutral-900 text-white rounded-full text-sm font-medium mb-6 shadow-sm">
                            {priceLabel}
                        </div>

                        <div className="prose prose-neutral text-neutral-600 mb-8 leading-relaxed">
                            <p>{set.description || "No description available for this set."}</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-neutral-100 space-y-4">
                        {!isAvailable && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm text-center font-medium border border-red-100">
                                Not available for the selected time
                            </div>
                        )}

                        {!isEligible && (
                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm text-center font-medium border border-yellow-100">
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
