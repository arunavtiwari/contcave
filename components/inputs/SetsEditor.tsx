"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { IoAdd, IoClose, IoTrash } from "react-icons/io5";

import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/inputs/Input";
import Textarea from "@/components/inputs/Textarea";
import Button from "@/components/ui/Button";
import { AdditionalSetPricingType } from "@/types/set";

import FormField from "./FormField";

interface SetsEditorProps {
    sets: SetEditorItem[];
    onChange: (sets: SetEditorItem[]) => void;
    pricingType: AdditionalSetPricingType | null;
    disabled?: boolean;
    label?: string;
    description?: string;
    required?: boolean;
    variant?: "vertical" | "horizontal";
    error?: string;
    id?: string;
}

interface SetEditorItem {
    id?: string;
    tempId?: string;
    name: string;
    description?: string | null;
    images: string[];
    price: number | null;
    position: number;
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
    deferUpload = true,
    isPricingUniform = false,
    uniformPrice,
    onUniformPriceChange,
    label,
    description,
    required,
    variant = "vertical",
    error,
    id = "sets-editor",
}: SetsEditorProps & {
    deferUpload?: boolean;
    isPricingUniform?: boolean;
    uniformPrice?: number | null;
    onUniformPriceChange?: (price: number) => void;
}) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(
        sets.length === 0 ? null : 0
    );

    const addSet = useCallback(() => {
        const newSet: SetEditorItem = {
            tempId: Math.random().toString(36).substr(2, 9),
            name: "",
            description: "",
            images: [],
            price: isPricingUniform && uniformPrice ? uniformPrice : 0,
            position: sets.length,
        };
        onChange([...sets, newSet]);
        setExpandedIndex(sets.length);
    }, [sets, onChange, isPricingUniform, uniformPrice]);

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
        <FormField
            id={id}
            label={label}
            description={description}
            required={required}
            error={error}
            variant={variant}
        >
            <div className="space-y-4 w-full">

                {isPricingUniform && (
                    <div className="bg-muted p-4 rounded-xl border border-border">
                        <Input
                            id="uniform-price"
                            label={`${priceLabel} (?) - Applies to ALL sets`}
                            type="number"
                            value={uniformPrice || ""}
                            onNumberChange={(val) => {
                                if (onUniformPriceChange) onUniformPriceChange(val);
                                const updated = sets.map(s => ({ ...s, price: val }));
                                onChange(updated);
                            }}
                            disabled={disabled}
                            min={0}
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            This price will be used for every set you add.
                        </p>
                    </div>
                )}

                {sets.length > 0 && (
                    <div className="space-y-3">
                        {sets.map((set, index) => (
                            <div
                                key={set.id || set.tempId || `new-${index}`}
                                className="border border-border rounded-xl overflow-hidden bg-background"
                            >
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition"
                                    onClick={() =>
                                        setExpandedIndex(expandedIndex === index ? null : index)
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {set.name || `Set ${index + 1}`}
                                            </p>

                                            <p className="text-sm text-muted-foreground">
                                                {INR.format(set.price || 0)}
                                                {pricingType === "HOURLY" ? "/hr" : ""}
                                            </p>
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
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition disabled:opacity-50"
                                            aria-label="Remove set"
                                        >
                                            <IoTrash size={18} />
                                        </button>
                                    </div>
                                </div>

                                {expandedIndex === index && (
                                    <div className="border-t border-border p-4 space-y-4">
                                        <div>
                                            <Input
                                                id={`set-name-${index}`}
                                                label="Set Name *"
                                                type="text"
                                                value={set.name}
                                                onChange={(e) =>
                                                    updateSet(index, { name: e.target.value })
                                                }
                                                disabled={disabled}
                                                placeholder="e.g., Studio A, Main Hall"
                                            />
                                        </div>

                                        <div>
                                            <Textarea
                                                id={`set-desc-${index}`}
                                                label="Description"
                                                value={set.description || ""}
                                                onChange={(e) =>
                                                    updateSet(index, { description: e.target.value })
                                                }
                                                disabled={disabled}
                                                rows={3}
                                                className="resize-none"
                                                placeholder="Describe what's included in this set..."
                                            />
                                        </div>


                                        {!isPricingUniform && (

                                            <div>
                                                <Input
                                                    id={`set-price-${index}`}
                                                    label={`${priceLabel} (?)`}
                                                    type="number"
                                                    value={set.price === null ? "" : set.price}
                                                    onNumberChange={(val) => {
                                                        updateSet(index, {
                                                            price: val,
                                                        });
                                                    }}
                                                    disabled={disabled}
                                                    min={0}
                                                    placeholder="0"
                                                />
                                            </div>
                                        )}

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
                                                            unoptimized
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index, imgIndex)}
                                                            disabled={disabled}
                                                            className="absolute top-1 right-1 p-1 bg-foreground/50 text-background rounded-full opacity-0 group-hover:opacity-100 transition"
                                                        >
                                                            <IoClose size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <ImageUpload
                                                label="Set Images"
                                                uid={`set-upload-${index}`}
                                                onChange={(newUrls) => {
                                                    updateSet(index, { images: newUrls });
                                                }}
                                                values={set.images}
                                                deferUpload={deferUpload}
                                            />

                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    type="button"
                    onClick={addSet}
                    disabled={disabled || sets.length >= 50}
                    variant="outline"
                    label="Add Set"
                    icon={IoAdd}
                    className="w-full border-dashed"
                />

                {sets.length >= 50 && (
                    <p className="text-sm text-warning">Maximum 50 sets allowed</p>
                )}
            </div>
        </FormField>
    );
}

export type { SetEditorItem };

