"use client";

import { useEffect, useState } from "react";

import SetSelector from "@/components/listing/SetSelector";
import Modal from "@/components/modals/Modal";
import { pluralize } from "@/lib/strings";
import { Package } from "@/types/package";
import { ListingSet } from "@/types/set";

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

    return (
        <Modal
            isOpen={isOpen}
            onCloseAction={onClose}
            title={`Select sets for ${packageItem.title}`}
            actionLabel="Confirm"
            onSubmitAction={handleSubmit}
            actionDisabled={!isValid}
            secondaryActionLabel="Cancel"
            secondaryActionAction={onClose}
            nestedModal
            body={(
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        {requiredCount > 0
                            ? `Please select exactly ${pluralize(requiredCount, "set")} for this package.`
                            : "Please select the sets you want to include in this package."}
                    </p>
                    <SetSelector
                        sets={sets}
                        selectedSetIds={selectedSetIds}
                        onSetToggle={handleSetToggle}
                        includedSetId={null}
                        pricingType={null}
                        selectedPackage={packageItem}
                        availableSetIds={availableSetIds}
                    />
                </div>
            )}
        />
    );
}
