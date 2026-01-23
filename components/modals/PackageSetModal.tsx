"use client";

import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";

import Button from "@/components/ui/Button";
import { Package } from "@/types/package";
import { ListingSet } from "@/types/set";

import SetSelector from "../listing/SetSelector";

interface PackageSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (setIds: string[]) => void;
    sets: ListingSet[];
    packageItem: Package;
    availableSetIds: string[];
}

export default function PackageSetModal({
    isOpen,
    onClose,
    onConfirm,
    sets,
    packageItem,
    availableSetIds,
}: PackageSetModalProps) {
    const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);

    // Reset selection when modal opens or package changes
    useEffect(() => {
        if (isOpen) {
            setSelectedSetIds([]);
        }
    }, [isOpen, packageItem]);

    const handleSetToggle = (setId: string) => {
        setSelectedSetIds((prev) => {
            if (prev.includes(setId)) {
                return prev.filter((id) => id !== setId);
            }
            return [...prev, setId];
        });
    };

    const requiredCount = packageItem.requiredSetCount || 0;
    const isValid = requiredCount > 0 ? selectedSetIds.length === requiredCount : selectedSetIds.length > 0;

    const handleSubmit = () => {
        if (isValid) {
            onConfirm(selectedSetIds);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">
                        Select Sets for {packageItem.title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-neutral-100 rounded-full transition"
                    >
                        <IoClose size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <div className="mb-4">
                        <p className="text-neutral-600">
                            {requiredCount > 0
                                ? `Please select exactly ${requiredCount} set${requiredCount === 1 ? "" : "s"} for this package.`
                                : "Please select the sets you want to include in this package."}
                        </p>
                    </div>

                    <SetSelector
                        sets={sets}
                        selectedSetIds={selectedSetIds}
                        onSetToggle={handleSetToggle}
                        includedSetId={null}
                        pricingType={null} // Package pricing overrides set pricing
                        selectedPackage={packageItem}
                        availableSetIds={availableSetIds}
                        // Disable "Book Entire Studio" inside the modal as it's package specific
                        onSelectAll={undefined}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-neutral-50 flex justify-end gap-3">
                    <Button
                        label="Cancel"
                        onClick={onClose}
                        outline
                        small
                    />
                    <Button
                        label="Confirm Selection"
                        onClick={handleSubmit}
                        disabled={!isValid}
                        small
                    />
                </div>
            </div>
        </div>
    );
}
