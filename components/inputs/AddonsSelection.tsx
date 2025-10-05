import React, { useCallback, useState, useEffect } from 'react';
import ImageCheckbox from './ImageCheckbox';
import useAddonModal from '@/hook/useAddonModal';

export interface Addon {
    name: string;
    price: number;
    imageUrl: string;
    qty: number;
}

interface AddonsCheckboxProps {
    addons: Addon[];
    initialSelectedAddons: Addon[];
    onSelectedAddonsChange: (selectedAddons: Addon[]) => void;
}

const AddonsSelection: React.FC<AddonsCheckboxProps> = ({
    addons,
    initialSelectedAddons,
    onSelectedAddonsChange,
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
            {/* Selected Addons Section */}
            {selectedAddons.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-5">Selected Addons</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 place-items-center">
                        {selectedAddons.map((addon) => (
                            <div
                                key={addon.name}
                                className="border border-solid border-gray-300 rounded-xl shadow-md p-5 bg-gray-50"
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
                            <div className="flex justify-center">
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
            )}

            {/* Available Addons Section */}
            {availableAddons.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-5">Available Addons</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 place-items-center">
                        {availableAddons.map((addon) => (
                            <div
                                key={addon.name}
                                className="border border-solid border-gray-300 rounded-xl shadow-md p-5"
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
                        {/* Custom Addon Option */}
                        <div className="flex justify-center">
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
    );
};

export default AddonsSelection;