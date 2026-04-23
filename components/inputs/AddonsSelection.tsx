import React, { useCallback, useEffect, useState } from 'react';

import useUIStore from '@/hooks/useUIStore';
import { Addon } from "@/types/addon";

import ImageCheckbox from './ImageCheckbox';

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

        // 1. Update internal state
        setSelectedAddons(newSelected);
        // 2. Notify parent (now safe because it's after/outside functional update calculations)
        onSelectedAddonsChange(newSelected);
    };

    // Deduplicate addons based on name
    const uniqueAddons = Array.from(new Map(addons.map(item => [item.name, item])).values());
    const availableAddons = uniqueAddons.filter(
        (addon) => !selectedAddons.some((selected) => selected.name === addon.name)
    );

    return (
        <div className="space-y-8">

            {selectedAddons.length > 0 && (
                <div className='flex justify-start'>
                    <div>
                        <h2 className="text-lg font-semibold mb-5">Selected Addons</h2>
                        <div className={`grid ${rentModal ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-6`}>
                            {selectedAddons.map((addon) => (
                                <div
                                    key={addon.name}
                                    className="border border-solid border-border rounded-xl  p-5 bg-muted h-full"
                                >
                                    <ImageCheckbox
                                        addon={addon}
                                        imageUrl={addon.imageUrl}
                                        label={addon.name}
                                        onChange={(item) =>
                                            handleAddonChange(addon.name, item.price, item.qty, item.checked)
                                        }
                                        checked={true}
                                    />
                                </div>
                            ))}
                            {availableAddons.length === 0 && (
                                <div className="flex justify-center h-full">
                                    <ImageCheckbox
                                        imageUrl="https://cdn-icons-png.flaticon.com/512/992/992651.png"
                                        label="Create your own"
                                        hideCheckbox
                                        hideInputFields
                                        onClickChange={handleCreateCustomAddon}
                                        onChange={handleCreateCustomAddon}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {rentModal && selectedAddons.length > 0 && <hr className="my-4 border-border" />}


            <div className='flex justify-start'>
                {availableAddons.length > 0 && (
                    <div>
                        {!rentModal && (
                            <h2 className="text-lg font-semibold mb-5">Available Addons</h2>
                        )}
                        <div className={`grid ${rentModal ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-6`}>
                            {availableAddons.map((addon) => (
                                <div
                                    key={addon.name}
                                    className="border border-solid border-border rounded-xl  p-5 h-full"
                                >
                                    <ImageCheckbox
                                        addon={addon}
                                        imageUrl={addon.imageUrl}
                                        label={addon.name}
                                        onChange={(item) =>
                                            handleAddonChange(addon.name, item.price, item.qty, item.checked)
                                        }
                                        checked={false}
                                    />
                                </div>
                            ))}

                            <div className="flex justify-center h-full">
                                <ImageCheckbox
                                    imageUrl="https://cdn-icons-png.flaticon.com/512/992/992651.png"
                                    label="Create your own"
                                    hideCheckbox
                                    hideInputFields
                                    onClickChange={handleCreateCustomAddon}
                                    onChange={handleCreateCustomAddon}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddonsSelection;
