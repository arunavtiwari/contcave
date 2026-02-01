import React, { useCallback, useEffect, useState } from 'react';

import useAddonModal from '@/hook/useAddonModal';
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
    const addonModal = useAddonModal();

    useEffect(() => {
        setSelectedAddons(initialSelectedAddons);
    }, [initialSelectedAddons]);

    useEffect(() => {
        const timer = setTimeout(() => {
            onSelectedAddonsChange(selectedAddons);
        }, 0);
        return () => clearTimeout(timer);
    }, [selectedAddons, onSelectedAddonsChange]);

    const handleCreateCustomAddon = useCallback(() => {
        addonModal.onOpen();
    }, [addonModal]);

    const handleAddonChange = (
        addonName: string,
        price?: number | string,
        qty?: number | string,
        checked?: boolean
    ) => {
        setSelectedAddons((prevSelected) => {
            const selectedIndex = prevSelected.findIndex((a) => a.name === addonName);
            const currentAddon =
                selectedIndex !== -1
                    ? prevSelected[selectedIndex]
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
                    newSelected = [...prevSelected];
                    newSelected[selectedIndex] = updatedAddon;
                } else {
                    newSelected = [...prevSelected, updatedAddon];
                }
            } else {
                newSelected = prevSelected.filter((a) => a.name !== addonName);
            }
            return newSelected;
        });
    };

    const availableAddons = addons.filter(
        (addon) => !selectedAddons.some((selected) => selected.name === addon.name)
    );

    return (
        <div className="space-y-8">
            
            {selectedAddons.length > 0 && (
                <div className='flex justify-start'>
                    <div>
                        <h2 className="text-lg font-semibold mb-5">Selected Addons</h2>
                        <div className={`grid ${rentModal ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-6`}>
                            {selectedAddons.map((addon) => (
                                <div
                                    key={addon.name}
                                    className="border border-solid border-gray-300 rounded-xl shadow-sm p-5 bg-gray-50 h-full"
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
            {rentModal && selectedAddons.length > 0 && <hr className="my-4" />}

            
            <div className='flex justify-start'>
                {availableAddons.length > 0 && (
                    <div>
                        {!rentModal && (
                            <h2 className="text-lg font-semibold mb-5">Available Addons</h2>
                        )}
                        <div className={`grid ${rentModal ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-6`}>
                            {availableAddons.map((addon) => (
                                <div
                                    key={addon.name}
                                    className="border border-solid border-gray-300 rounded-xl shadow-sm p-5 h-full"
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
