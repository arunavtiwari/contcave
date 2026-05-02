'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';

import ImageCheckbox from '@/components/inputs/ImageCheckbox';
import Heading from '@/components/ui/Heading';
import useUIStore from '@/hooks/useUIStore';
import { Addon } from "@/types/addon";
import { cn } from '@/lib/utils';

interface AddonsCheckboxProps {
    addons: Addon[];
    initialSelectedAddons: Addon[];
    onSelectedAddonsChange: (selectedAddons: Addon[]) => void;
    rentModal?: boolean;
}

const AddonsSelection: React.FC<AddonsCheckboxProps> = ({
    addons,
    initialSelectedAddons,
    onSelectedAddonsChange,
    rentModal = false,
}) => {
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>(initialSelectedAddons);
    const uiStore = useUIStore();

    useEffect(() => {
        const uniqueSelected = Array.from(new Map(initialSelectedAddons.map(item => [item.name, item])).values());
        setSelectedAddons(uniqueSelected);
    }, [initialSelectedAddons]);

    const handleCreateCustomAddon = useCallback(() => {
        uiStore.onOpen("addon");
    }, [uiStore]);

    const handleAddonChange = (
        addonName: string,
        price?: number | string,
        qty?: number | string,
        checked?: boolean
    ) => {
        const selectedIndex = selectedAddons.findIndex((a) => a.name === addonName);
        const currentAddon =
            selectedIndex !== -1
                ? selectedAddons[selectedIndex]
                : addons.find((a) => a.name === addonName) || {
                    name: addonName,
                    price: 0,
                    qty: 0,
                    imageUrl: '',
                };

        const updatedAddon: Addon = {
            ...currentAddon,
            price: price === undefined || price === '' ? currentAddon.price : Number(price),
            qty: qty === undefined || qty === '' ? currentAddon.qty : Number(qty),
        };

        let newSelected: Addon[];
        if (checked) {
            if (selectedIndex !== -1) {
                newSelected = [...selectedAddons];
                newSelected[selectedIndex] = updatedAddon;
            } else {
                newSelected = [...selectedAddons, updatedAddon];
            }
        } else {
            newSelected = selectedAddons.filter((a) => a.name !== addonName);
        }

        setSelectedAddons(newSelected);
        onSelectedAddonsChange(newSelected);
    };

    const uniqueAddons = useMemo(() =>
        Array.from(new Map(addons.map(item => [item.name, item])).values()),
        [addons]);

    const availableAddons = useMemo(() =>
        uniqueAddons.filter(
            (addon) => !selectedAddons.some((selected) => selected.name === addon.name)
        ),
        [uniqueAddons, selectedAddons]);

    const renderCustomAddonCard = () => (
        <ImageCheckbox
            icon={FiPlus}
            label="Create your own"
            hideCheckbox
            hideInputFields
            onClickChange={handleCreateCustomAddon}
            onChange={() => { }}
            className="border-dashed h-full"
        />
    );

    return (
        <div className="space-y-12">
            {selectedAddons.length > 0 && (
                <div className="space-y-6">
                    <Heading title="Selected Addons" variant="h6" />
                    <div className={cn(
                        "grid gap-6",
                        rentModal ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                    )}>
                        {selectedAddons.map((addon) => (
                            <ImageCheckbox
                                key={addon.name}
                                addon={addon}
                                imageUrl={addon.imageUrl}
                                label={addon.name}
                                onChange={(item) =>
                                    handleAddonChange(addon.name, item.price, item.qty, item.checked)
                                }
                                checked={true}
                            />
                        ))}
                        {availableAddons.length === 0 && renderCustomAddonCard()}
                    </div>
                </div>
            )}

            {rentModal && selectedAddons.length > 0 && availableAddons.length > 0 && <hr className="border-border/50" />}

            {availableAddons.length > 0 && (
                <div className="space-y-6">
                    {!rentModal && (
                        <Heading title="Available Addons" variant="h6" />
                    )}
                    <div className={cn(
                        "grid gap-6",
                        rentModal ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                    )}>
                        {availableAddons.map((addon) => (
                            <ImageCheckbox
                                key={addon.name}
                                addon={addon}
                                imageUrl={addon.imageUrl}
                                label={addon.name}
                                onChange={(item) =>
                                    handleAddonChange(addon.name, item.price, item.qty, item.checked)
                                }
                                checked={false}
                            />
                        ))}
                        {renderCustomAddonCard()}
                    </div>
                </div>
            )}

            {selectedAddons.length === 0 && availableAddons.length === 0 && (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl bg-muted/5 gap-4">
                    <div className="p-4 rounded-full bg-muted">
                        <FiPlus size={32} className="text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold">No Addons Available</p>
                        <p className="text-xs text-muted-foreground">Start by creating your own custom addons</p>
                    </div>
                    <button
                        onClick={handleCreateCustomAddon}
                        className="mt-2 text-xs font-bold uppercase tracking-widest px-6 py-2 bg-foreground text-background rounded-full hover:opacity-90 transition-all"
                    >
                        Create Custom Addon
                    </button>
                </div>
            )}
        </div>
    );
};

export default AddonsSelection;
