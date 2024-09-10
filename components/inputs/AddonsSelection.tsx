import React, { useCallback, useEffect, useState } from 'react';
import ImageCheckbox from './ImageCheckbox';
import CustomAddonModal from '../models/CustomAddonModal';
import useAddonModal from '@/hook/useAddonModal';

export interface Addon {
    name: string;
    price: number;
    imageUrl: string;
    qty:number;
}

interface AddonsCheckboxProps {
    addons: Addon[];
    onSelectedAddonsChange: (selectedAddons: Addon[]) => void; // Callback function to send the selected addons to the parent component
}

const AddonsSelection: React.FC<AddonsCheckboxProps> = ({ addons, onSelectedAddonsChange }) => {
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
    const addonModal = useAddonModal();

    useEffect(() => {
        // Initially, no addons are selected
        setSelectedAddons([]);
    }, [addons]);

    const onCreation = useCallback(() => {


        addonModal.onOpen();
    }, [CustomAddonModal]);
    const handleAddonChange = (index: number, price?: any, qty?:number, checked?: boolean) => {
        setSelectedAddons((prevSelectedAddons) => {
            const addonToUpdate = addons[index];

            // Create a copy of the addon with the updated price.
            let addonCopy = { ...addonToUpdate};
            if(qty){
                addonCopy.qty = qty;
            }
            if(price) {
                addonCopy.price = price;
            }
            // Create a new array for the selected addons.
            let newSelectedAddons = prevSelectedAddons.filter(a => a.name !== addonCopy.name);

            // If the addon is checked, add it to the selected addons.
            if (checked) {
                newSelectedAddons = [...newSelectedAddons, addonCopy];
            }

            // Communicate the change back to the parent component.
            onSelectedAddonsChange(newSelectedAddons);
            return newSelectedAddons;
        });
    };

    return (
        <>
        <div className='flex flex-wrap gap-6'>
            {addons.map((addon, index) => (
                <div key={addon.name} className='addon-box border-0 rounded shadow-lg w-30'>
                    <ImageCheckbox
                         addon={addon}
                        imageUrl={addon.imageUrl}
                        label={addon.name}
                        onChange={(item) => handleAddonChange(index, item.price, item.qty, item.checked)}
                        checked={selectedAddons.includes(addon)} />
                </div>
            ))}
            <ImageCheckbox
                imageUrl={"https://cdn-icons-png.flaticon.com/512/992/992651.png"}
                label="Create your own"
                hideCheckbox={true}
                hideInputFields={true}
                onChange={onCreation}
                onClickChange={onCreation} />
        </div>
        </>
    );
};

export default AddonsSelection;
