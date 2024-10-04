"use client";

import getAddons from '@/app/actions/getAddons';
import getAmenities from '@/app/actions/getAmenities';
import getCurrentUser from '@/app/actions/getCurrentUser';
import ClientOnly from '@/components/ClientOnly';
import EmptyState from '@/components/EmptyState';
import AmenitiesCheckbox from '@/components/inputs/AmenityCheckbox';
import { Amenities } from '@prisma/client';
import React, { useCallback, useState } from 'react';
import { GiPhotoCamera, GiPineTree, GiSunflower, GiCube, GiLighthouse, GiMountainCave, GiArtificialIntelligence, GiCaveEntrance, GiFruitBowl } from 'react-icons/gi';
import { IoDiamond } from 'react-icons/io5';
import { MdOutlineVilla } from 'react-icons/md';
import AddonsSelection, { Addon } from './inputs/AddonsSelection';
import CustomAddonModal from './models/CustomAddonModal';
import { SafeUser, safeListing } from '@/types';
import axios from 'axios';
import { id } from 'date-fns/locale';
import router from 'next/router';
import { toast } from 'react-toastify';
import ImageUpload from './inputs/ImageUpload';
import useIndianCities from '@/hook/useCities';

type Props = {
    listing: any;
    predefinedAmenities: any[],
    predefinedAddons: any[],
};

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const [initialListing, setListing] = useState(listing);

    // Add any state management or handlers you may need for form submission or image uploads
    const [amenities, setAmenities] = useState<Amenities[]>(predefinedAmenities);  // Explicitly specify the type
    const [addons, setAddons] = useState<any[]>(predefinedAddons);  // Explicitly specify the type

    const [selectedAmenities, setSelectedAmenities] = useState<{ [key: string]: boolean }>({});
    const [selectedAddons, setSelectedAddons] = useState<{}>({});

    const update = () => {
        axios
            .patch(`/api/listings/${listing.id}`, initialListing)
            .then(() => {
                toast.info("Listing has been successfully updated");
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error);
            });
    };

    const handleInputChange = useCallback((field: string, value: any) => {
        setListing((prevListing: any) => {
            const setNestedValue = (obj: any, path: string, value: any) => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const lastObj = keys.reduce((obj, key) => 
                    obj[key] = obj[key] || {}, obj);
                lastObj[lastKey!] = value;
            };
    
            const newListing = { ...prevListing };
            setNestedValue(newListing, field, value);
    
            return newListing;
        });
    }, []);

    const handleAmenitiesChange = (updatedAmenities: { [key: string]: boolean }) => {
        setSelectedAmenities(updatedAmenities);
        handleInputChange("amenities", Object.keys(updatedAmenities));
    };

    const handleAddonChange = (updatedAddons: Addon[]) => {
        setSelectedAddons(updatedAddons);
        handleInputChange("addons", updatedAddons);
    };

    const indianCities = useIndianCities().getAll();
    const categories = [
        {
            label: "Studios",
            icon: GiPhotoCamera,
            description: "For a modern touch, explore futuristic and contemporary spaces!",
        },
        {
            label: "Urban",
            icon: MdOutlineVilla,
            description: "This location is in the heart of the city!",
        },
        {
            label: "Nature",
            icon: GiPineTree,
            description: "Surrounded by natural beauty, perfect for outdoor shoots!",
        },
        {
            label: "Open Spaces",
            icon: GiSunflower,
            description: "A location with expansive open space, great for creative shots!",
        },
        {
            label: "Minimalist",
            icon: GiCube,
            description: "Simplicity at its best, perfect for minimalist aesthetics!",
        },
        {
            label: "Seaside",
            icon: GiLighthouse,
            description: "Shoot by the sea, with breathtaking views and natural lighting!",
        },
        {
            label: "Mountain",
            icon: GiMountainCave,
            description: "Find serenity in the mountains, an ideal retreat for your shoot!",
        },
        {
            label: "Artistic",
            icon: GiArtificialIntelligence,
            description: "Discover studios designed for artistic and creative photography!",
        },
        {
            label: "Vintage",
            icon: GiCaveEntrance,
            description: "Step into the past with locations exuding vintage vibes!",
        },
        {
            label: "Chic & Trendy",
            icon: IoDiamond,
            description: "Stay on-trend with chic and stylish shoot locations!",
        },
        {
            label: "Public Spaces",
            icon: GiFruitBowl,
            description: "Capture the essence of vibrant open-air markets in your shoot!",
        },
    ];

    const removeImage = (indexToRemove: number) => {
        const updatedImages = initialListing.imageSrc.filter((_: any, index: number) => index !== indexToRemove);
        handleInputChange('imageSrc', updatedImages);
        //update();
    };

    return (
        <div className="bg-white p-8 w-full">
            <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Name
                </label>
                <input
                    type="text"
                    id="listingName"
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    placeholder="Enter the listing name"
                    value={initialListing.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                />

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Description
                </label>
                <textarea
                    id="listingDescription"
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    placeholder="Enter the description"
                    style={{ width: "100%" }}
                    value={initialListing.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                />

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Category
                </label>
                <select
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    value={initialListing.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                >
                    {categories.map((item) => (
                        <option key={item.label} value={item.label}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Location
                </label>
                <select
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    onChange={(e) => handleInputChange("location", e.target.value)}
                >
                    {indianCities.map((item, index) => (
                        <option key={index} value={`city${index}`}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Images (Max 8 Pictures)
                </label>
                <div className="mt-1 flex space-x-6 col-span-2">
                    {initialListing.imageSrc.map((item: any, index: number) => (
                        <div key={index} className="relative">
                            <div className="h-32 w-32 rounded-lg border-2 border-gray-300 border-dashed flex items-center">
                                <img src={item} alt={`Image ${index}`} className="h-full w-full object-cover rounded-lg" />
                            </div>
                            <button
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    {(!initialListing.imageSrc || initialListing.imageSrc.length < 8) && (
                        <ImageUpload
                            isFromPropertyClient={true}
                            onChange={(value) => handleInputChange("imageSrc", [...initialListing.imageSrc, ...value])}
                            values={[]}
                        />
                    )}
                </div>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Amenities
                </label>
                <div className="mt-1 flex space-x-6 col-span-2">
                    <AmenitiesCheckbox checked={initialListing.amenities} amenities={amenities} onChange={handleAmenitiesChange} />
                </div>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Addons
                </label>
                <div className="flex flex-col space-y-2 col-span-2">
                    <AddonsSelection addons={addons} onSelectedAddonsChange={handleAddonChange} />
                    <CustomAddonModal save={(value) => { addons.push(value); setAddons(addons); }} />
                </div>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Carpet Area
                </label>
                <input
                    type="text"
                    id="carpetArea"
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    placeholder="Enter the carpet area"
                    value={initialListing.otherDetails?.carpetArea ?? ""}
                    onChange={(e) => handleInputChange("otherDetails.carpetArea", e.target.value)}
                />

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Operational Days
                </label>
                <div className="flex space-x-2 col-span-2">
                    <input
                        type="text"
                        placeholder="Mon"
                        className="border rounded w-30 py-1 text-center"
                        value={initialListing.otherDetails?.operationalDays?.start}
                        onChange={(e) => handleInputChange("otherDetails.operationalDays.start", e.target.value)}
                        list="days"
                    />
                    <span>-</span>
                    <input
                        type="text"
                        placeholder="Sun"
                        className="border rounded w-30 py-1 text-center"
                        value={initialListing.otherDetails?.operationalDays?.end}
                        onChange={(e) => handleInputChange("otherDetails.operationalDays.end", e.target.value)}
                        list="days"
                    />
                    <datalist id="days">
                        <option value="Mon"></option>
                        <option value="Tue"></option>
                        <option value="Wed"></option>
                        <option value="Thu"></option>
                        <option value="Fri"></option>
                        <option value="Sat"></option>
                        <option value="Sun"></option>
                    </datalist>
                </div>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Operational Hours
                </label>
                <div className="flex space-x-2 col-span-2">
                    <input
                        type="text"
                        placeholder="AM"
                        className="border rounded w-30 py-1 text-center"
                        value={initialListing.otherDetails?.operationalHours?.start}
                        onChange={(e) => handleInputChange("otherDetails.operationalHours.start", e.target.value)}
                    />
                    <span>-</span>
                    <input
                        type="text"
                        placeholder="PM"
                        className="border rounded w-30 py-1 text-center"
                        value={initialListing.otherDetails?.operationalHours?.end}
                        onChange={(e) => handleInputChange("otherDetails.operationalHours.end", e.target.value)}
                    />
                </div>

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Min. Booking Hours
                </label>
                <input
                    type="text"
                    id="minBookingHours"
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    placeholder="Enter the minimum booking hours"
                    value={initialListing.otherDetails?.minimumBookingHours ?? ""}
                    onChange={(e) => handleInputChange("otherDetails.minimumBookingHours", e.target.value)}
                />

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Max PAX
                </label>
                <input
                    type="text"
                    id="maxPax"
                    className="border pr-3 rounded text-start pl-3 py-2 shadow-sm col-span-2"
                    placeholder="Enter the maximum PAX"
                    value={initialListing.otherDetails?.maximumPax ?? ""}
                    onChange={(e) => handleInputChange("otherDetails.maximumPax", e.target.value)}
                />

                <label className="block text-sm font-medium text-gray-700 text-right col-span-1">
                    Instant Book
                </label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in col-span-2">
                    <input
                        type="checkbox"
                        name="toggle"
                        id="toggle"
                        checked={initialListing.otherDetails.instantBook}
                        onChange={(e) => handleInputChange('otherDetails.instantBook', e.target.checked)}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                </div>

                <div className="col-span-3 pt-5 flex justify-end">
                    <button
                        type="submit"
                        className="ml-3 inline-flex py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-500"
                        onClick={update}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyClient;
