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
            })
            .finally(() => {

            });
    }
    const handleInputChange = useCallback((field: string, value: any) => {
        setListing((prevListing: any) => {
            // Function to apply value to a nested object path
            const setNestedValue = (obj: any, path: string, value: any) => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const lastObj = keys.reduce((obj, key) => 
                    obj[key] = obj[key] || {}, obj); // Create nested objects as needed
                lastObj[lastKey!] = value; // Set the value at the nested path
            };
    
            // Create a copy of the previous listing
            const newListing = { ...prevListing };
            // Set the nested value
            setNestedValue(newListing, field, value);
    
            return newListing;
        });
        console.log(initialListing);
    }, []);
    const handleAmenitiesChange = (updatedAmenities: { [key: string]: boolean }) => {
        setSelectedAmenities(updatedAmenities);
        handleInputChange("amenities",Object.keys(updatedAmenities))
    };
    const handleAddonChange = (updatedAddons: Addon[]) => {
        setSelectedAddons(updatedAddons);
        handleInputChange("addons",updatedAddons);

    };
    const indianCities = [
        { name: "Mumbai", state: "Maharashtra", latlng: [18.9750, 72.8258] },
        { name: "Delhi", state: "Delhi", latlng: [28.6139, 77.2090] },
    ];
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
        // {
        //   label: "Historic",
        //   icon: GiAncientRuins,
        //   description: "Capture the charm of history in this location!",
        // },
        {
            label: "Nature",
            icon: GiPineTree,
            description: "Surrounded by natural beauty, perfect for outdoor shoots!",
        },
        // {
        //   label: "Industrial",
        //   icon: GiFactory,
        //   description: "An industrial setting, ideal for unique and edgy shoots!",
        // },
        // {
        //   label: "Rural",
        //   icon: GiBarn,
        //   description: "Escape to the countryside for a rustic shoot!",
        // },
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
        // {
        //   label: "Architectural Marvel",
        //   icon: GiCastle,
        //   description: "Explore this architectural marvel for striking compositions!",
        // },
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

    return (
        <div className="bg-white p-8 w-full">
            <div className="space-y-4 w-full">
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Name
                    </label>
                    <input
                        type="text"
                        id="listingName"
                        className="mx-2 border py-1 pr-3 rounded w-1/3 text-start pl-3 py-2 shadow-sm"
                        placeholder="Enter the listing name"
                        value={initialListing.title}
                        onChange={(e) => { handleInputChange("title", e.target.value) }}
                    />
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Description
                    </label>
                    <textarea id="listingName" className="mx-2 border py-1 pr-3 rounded text-start pl-3 py-2 shadow-sm" placeholder="Enter the description" style={{ "width": "486px", "marginRight": "17px" }}
                        value={initialListing.description}
                        onChange={(e) => { handleInputChange("description", e.target.value) }}

                    />
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Category
                    </label>
                    <select
                        className="mx-2 border py-1 pr-3 rounded w-1/3 text-start pl-3 py-2 shadow-sm"
                        placeholder="Enter the listing category"
                        value={initialListing.category}
                        onChange={(e) => { handleInputChange("cattegory", e.target.value) }}
                    >
                        {categories.map((item, index) => (
                            <option key={item.label} value={item.label}>{item.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Location
                    </label>
                    <select
                        className="mx-2 border py-1 pr-3 rounded w-1/3 text-start pl-3 py-2 shadow-sm"
                        placeholder="Enter the listing category"
                        onChange={(e) => { handleInputChange("location", e.target.value) }}

                    >
                        {indianCities.map((item, index) => (
                            <option key={index} value={`city${index}`}>{item.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700  w-3/3">
                        Images (Max 8 Pictures)
                    </label>
                    <div className="mt-1 flex justify-between space-x-6" style={{ paddingLeft: "100px" }}>
                        {/* Add individual image components here */}
                        {
                            initialListing.imageSrc.map((item: any, index: number) => (
                                <div key={index} className="flex-1" >
                                    <div key={index} className="h-32 w-32 rounded-lg border-2 border-gray-300 border-dashed flex items-center justify-evenly">
                                        <span className="text-sm text-gray-500">
                                            <img key={index} src={item} />
                                        </span>
                                    </div>
                                </div>
                            ))

                        }
                        {
                            (!initialListing.imageSrc || initialListing.imageSrc.length < 8) &&
                            <ImageUpload
                                onChange={(value) => handleInputChange("imageSrc", [...initialListing.imageSrc, ...value])}
                                values={[]}
                            />
                        }

                        {/* Repeat for the number of images you can upload */}
                    </div>
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700">
                        Amenities
                    </label>
                    <div className="mt-1 flex justify-between space-x-6">
                        <AmenitiesCheckbox checked={initialListing.amenities} amenities={amenities} onChange={handleAmenitiesChange}></AmenitiesCheckbox>

                    </div>
                </div>
                <div className="px-7 mx-6">
                    <label className="block text-sm font-medium text-gray-700">
                        Addons
                    </label>
                    <AddonsSelection addons={addons} onSelectedAddonsChange={handleAddonChange}></AddonsSelection>
                    <CustomAddonModal save={(value: any) => { addons.push(value); setAddons(addons) }} />

                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Carpet Area
                    </label>
                    <input
                        type="text"
                        id="listingName"
                        className="mx-2 border py-1 pr-3 rounded w-1/3 text-start pl-3 py-2 shadow-sm"
                        placeholder="Enter the listing name"
                        value={initialListing.otherDetails?.carpetArea ?? ""} onChange={(e) => { handleInputChange("otherDetails.carpetArea", e.target.value) }}

                    />
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Operational Days
                    </label>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-2  ">
                            <input type="text" placeholder="Mon" className="border rounded w-30 py-1 text-center"
                                value={initialListing.otherDetails?.operationalDays?.start}
                                onChange={(e) => { handleInputChange("otherDetails.operationalDays.start", e.target.value) }}
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
                            <span>-</span>
                            <input type="text" placeholder="Sun" className="border rounded  w-30 py-1 text-center"
                                value={initialListing.otherDetails?.operationalDays?.end}
                                onChange={(e) => { handleInputChange("otherDetails.operationalDays.end", e.target.value) }}

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
                    </div>
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Operational Hours
                    </label>
                    <div className="flex items-center space-x-2 ">
                        <input type="text" placeholder="AM" className="border  rounded w-30 py-1 text-center"
                            value={initialListing.otherDetails?.operationalHours?.start}
                            onChange={(e) => { handleInputChange("otherDetails.operationalHours.start", e.target.value) }}


                        />
                        <span>-</span>
                        <input type="text" placeholder="PM" className="border  rounded  w-30 py-1 text-center"
                            value={initialListing.otherDetails?.operationalHours?.end}
                            onChange={(e) => { handleInputChange("otherDetails.operationalHours.end", e.target.value) }}

                        />
                    </div>
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Min. Booking Hours
                    </label>
                    <input
                        type="text"
                        id="listingName"
                        className="mx-2 border py-1 pr-3 rounded w-1/3 text-start pl-3 py-2 shadow-sm"
                        placeholder="Enter the listing name"
                        value={initialListing.otherDetails?.minimumBookingHours ?? ""}
                        onChange={(e) => { handleInputChange("otherDetails.minimumBookingHours", e.target.value) }}

                    />
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Max PAX
                    </label>
                    <input
                        type="text"
                        id="listingName"
                        className="mx-2 border py-1 pr-3 rounded w-1/3 text-start pl-3 py-2 shadow-sm"
                        placeholder="Enter the listing name"
                        value={initialListing.otherDetails?.maximumPax ?? ""}
                        onChange={(e) => { handleInputChange("otherDetails.maximumPax", e.target.value) }}


                    />
                </div>
                <div className="flex justify-evenly items-center">
                    <label className="block text-sm font-medium text-gray-700 w-3/3">
                        Instant Book
                    </label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="toggle" 
                         checked={initialListing.otherDetails.instantBook}
                         onChange={(e) => handleInputChange('otherDetails.instantBook', e.target.checked)}
                 
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                        <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                </div>
                <div className="pt-5">
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="ml-3 inline-flex justify-evenly py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-500 text-white px-4 py-2 rounded-lg"
                            onClick={update}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyClient;
