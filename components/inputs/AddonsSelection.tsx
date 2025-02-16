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

const AddonsSelection: React.FC<AddonsCheckboxProps> = ({ addons, initialSelectedAddons, onSelectedAddonsChange }) => {
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>(initialSelectedAddons);
    const addonModal = useAddonModal();

    useEffect(() => {
        setSelectedAddons(initialSelectedAddons);
    }, [initialSelectedAddons]);

    const handleCreateCustomAddon = useCallback(() => {
        addonModal.onOpen();
    }, [addonModal]);

    const handleAddonChange = (index: number, price?: number, qty?: number, checked?: boolean) => {
        setSelectedAddons((prevSelected) => {
            const addonToUpdate = { ...addons[index], price: price ?? addons[index].price, qty: qty ?? addons[index].qty };
            let updatedAddons = prevSelected.filter((addon) => addon.name !== addonToUpdate.name);

            if (checked) {
                updatedAddons = [...updatedAddons, addonToUpdate];
            }

            onSelectedAddonsChange(updatedAddons);
            return updatedAddons;
        });
    };

    return (
        <div className="space-y-8">
            {/* Selected Addons Section */}
            {selectedAddons.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold">Selected Addons</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 place-items-center">
                        {selectedAddons.map((addon) => {
                            const originalIndex = addons.findIndex((a) => a.name === addon.name);
                            return (
                                <div
                                    key={addon.name}
                                    className="border border-solid border-gray-300 rounded-xl shadow-md p-5 bg-gray-50"
                                >
                                    <ImageCheckbox
                                        addon={addon}
                                        imageUrl={addon.imageUrl}
                                        label={addon.name}
                                        onChange={(item) =>
                                            handleAddonChange(
                                                originalIndex,
                                                item.price,
                                                item.qty,
                                                item.checked
                                            )
                                        }
                                        checked={true}
                                    />
                                </div>
                            );
                        })}
                        {/* Custom Addon Option*/}
                        {addons.filter((addon) => !selectedAddons.some((selected) => selected.name === addon.name))
                            .length == 0 && (<div className="flex justify-center">
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
            {addons.filter((addon) => !selectedAddons.some((selected) => selected.name === addon.name))
                .length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold">Available Addons</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 place-items-center">
                            {addons
                                .filter(
                                    (addon) =>
                                        !selectedAddons.some((selected) => selected.name === addon.name)
                                )
                                .map((addon) => {
                                    // Find the original index of the available addon
                                    const originalIndex = addons.findIndex((a) => a.name === addon.name);
                                    return (
                                        <div
                                            key={addon.name}
                                            className="border border-solid border-gray-300 rounded-xl shadow-md p-5"
                                        >
                                            <ImageCheckbox
                                                addon={addon}
                                                imageUrl={addon.imageUrl}
                                                label={addon.name}
                                                onChange={(item) =>
                                                    handleAddonChange(
                                                        originalIndex,
                                                        item.price,
                                                        item.qty,
                                                        item.checked
                                                    )
                                                }
                                                checked={false}
                                            />
                                        </div>
                                    );
                                })}
                            {/* Custom Addon Option*/}
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
