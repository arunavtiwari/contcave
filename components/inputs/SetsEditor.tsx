"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { IoAdd, IoClose, IoTrash } from "react-icons/io5";

import ImageUpload from "@/components/inputs/ImageUpload";
import { AdditionalSetPricingType } from "@/types/set";

interface SetEditorItem {
    id?: string;
    name: string;
    description?: string | null;
    images: string[];
    price: number;
    position: number;
}

interface SetsEditorProps {
    sets: SetEditorItem[];
    onChange: (sets: SetEditorItem[]) => void;
    pricingType: AdditionalSetPricingType | null;
    disabled?: boolean;
}

const INR = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

export default function SetsEditor({
    sets,
    onChange,
    pricingType,
    disabled = false,
}: SetsEditorProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(
        sets.length === 0 ? null : 0
    );

    const addSet = useCallback(() => {
        const newSet: SetEditorItem = {
            name: "",
            description: "",
            images: [],
            price: 0,
            position: sets.length,
        };
        onChange([...sets, newSet]);
        setExpandedIndex(sets.length);
    }, [sets, onChange]);

    const removeSet = useCallback(
        (index: number) => {
            const updated = sets.filter((_, i) => i !== index);
            updated.forEach((s, i) => {
                s.position = i;
            });
            onChange(updated);
            if (expandedIndex === index) {
                setExpandedIndex(null);
            } else if (expandedIndex !== null && expandedIndex > index) {
                setExpandedIndex(expandedIndex - 1);
            }
        },
        [sets, onChange, expandedIndex]
    );

    const updateSet = useCallback(
        (index: number, updates: Partial<SetEditorItem>) => {
            const updated = sets.map((s, i) =>
                i === index ? { ...s, ...updates } : s
            );
            onChange(updated);
        },
        [sets, onChange]
    );

    const removeImage = useCallback(
        (setIndex: number, imgIndex: number) => {
            const updated = [...sets];
            updated[setIndex] = {
                ...updated[setIndex],
                images: updated[setIndex].images.filter((_, i) => i !== imgIndex),
            };
            onChange(updated);
        },
        [sets, onChange]
    );

    const priceLabel =
        pricingType === "HOURLY"
            ? "Additional set price per hour"
            : "Additional set price";

    return (
        <div className="space-y-4">
            {sets.length > 0 && (
                <div className="space-y-3">
                    {sets.map((set, index) => (
                        <div
                            key={set.id || `new-${index}`}
                            className="border border-neutral-200 rounded-xl overflow-hidden bg-white"
                        >
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 transition"
                                onClick={() =>
                                    setExpandedIndex(expandedIndex === index ? null : index)
                                }
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {set.name || `Set ${index + 1}`}
                                        </p>
                                        {set.price > 0 && (
                                            <p className="text-sm text-neutral-500">
                                                {INR.format(set.price)}
                                                {pricingType === "HOURLY" ? "/hr" : ""}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeSet(index);
                                        }}
                                        disabled={disabled}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                        aria-label="Remove set"
                                    >
                                        <IoTrash size={18} />
                                    </button>
                                </div>
                            </div>

                            {expandedIndex === index && (
                                <div className="border-t border-neutral-200 p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Set Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={set.name}
                                            onChange={(e) =>
                                                updateSet(index, { name: e.target.value })
                                            }
                                            disabled={disabled}
                                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
                                            placeholder="e.g., Studio A, Main Hall"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={set.description || ""}
                                            onChange={(e) =>
                                                updateSet(index, { description: e.target.value })
                                            }
                                            disabled={disabled}
                                            rows={3}
                                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 resize-none"
                                            placeholder="Describe what's included in this set..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {priceLabel} (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={set.price || ""}
                                            onChange={(e) =>
                                                updateSet(index, {
                                                    price: Math.max(
                                                        0,
                                                        parseInt(e.target.value || "0", 10)
                                                    ),
                                                })
                                            }
                                            disabled={disabled}
                                            min={0}
                                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-neutral-500 mt-1">
                                            {index === 0
                                                ? "The lowest-priced set is included in the base price"
                                                : pricingType === "HOURLY"
                                                    ? "This amount will be charged per hour for additional sets"
                                                    : "This is a flat add-on price for additional sets"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Images
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {set.images.map((img, imgIndex) => (
                                                <div
                                                    key={imgIndex}
                                                    className="relative w-20 h-20 rounded-lg overflow-hidden group"
                                                >
                                                    <Image
                                                        src={img}
                                                        alt={`Set ${index + 1} image ${imgIndex + 1}`}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index, imgIndex)}
                                                        disabled={disabled}
                                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        <IoClose size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {set.images.length < 10 && (
                                            <ImageUpload
                                                uid={`set-upload-${index}`}
                                                onChange={(newUrls) => {
                                                    if (newUrls.length > set.images.length) {
                                                        const addedImages = newUrls.slice(set.images.length);
                                                        updateSet(index, { images: [...set.images, ...addedImages] });
                                                    } else {
                                                        updateSet(index, { images: newUrls });
                                                    }
                                                }}
                                                values={set.images}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={addSet}
                disabled={disabled || sets.length >= 50}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-600 hover:border-neutral-400 hover:text-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <IoAdd size={20} />
                Add Set
            </button>

            {sets.length >= 50 && (
                <p className="text-sm text-amber-600">Maximum 50 sets allowed</p>
            )}
        </div>
    );
}

export type { SetEditorItem };
