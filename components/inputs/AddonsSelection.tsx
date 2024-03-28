import React, { useEffect, useState } from 'react';
import ImageCheckbox from './ImageCheckbox';

export interface Addon {
  name: string;
  price: number;
  imageUrl: string;
}

interface AddonsCheckboxProps {
  addons: Addon[];
  onSelectedAddonsChange: (selectedAddons: Addon[]) => void; // Callback function to send the selected addons to the parent component
}

const AddonsSelection: React.FC<AddonsCheckboxProps> = ({ addons, onSelectedAddonsChange }) => {
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
    
    useEffect(() => {
        // Initially, no addons are selected
        setSelectedAddons([]);
    }, [addons]);

    const handleAddonChange = (index: number,price?: any,checked?:boolean ) => {
        console.log(price)
        setSelectedAddons((prevSelectedAddons) => {
            const addonToUpdate = addons[index];
            
            // Create a copy of the addon with the updated price.
            const addonCopy = { ...addonToUpdate, price };
        
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
        <div className='flex flex-wrap gap-6'>
            {addons.map((addon, index) => (
                <div key={addon.name} className='addon-box border-0 rounded shadow-lg w-30'>
                    <ImageCheckbox
                        imageUrl={addon.imageUrl}
                        label={addon.name}
                        onChange={(item) => handleAddonChange(index,item.price,item.checked)}
                        checked={selectedAddons.includes(addon)}
                    />
                </div>
            ))}
        </div>
    );
};

export default AddonsSelection;
