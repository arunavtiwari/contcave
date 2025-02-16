"use client";

import AmenitiesCheckbox from '@/components/inputs/AmenityCheckbox';
import { Amenities } from '@prisma/client';
import React, { useCallback, useEffect, useState } from 'react';
import { GiPhotoCamera, GiPineTree, GiSunflower, GiCube, GiLighthouse, GiMountainCave, GiArtificialIntelligence, GiCaveEntrance, GiFruitBowl } from 'react-icons/gi';
import { IoDiamond } from 'react-icons/io5';
import { MdOutlineVilla, MdClose } from 'react-icons/md';
import AddonsSelection, { Addon } from './inputs/AddonsSelection';
import CustomAddonModal from './models/CustomAddonModal';
import axios from 'axios';
import { toast } from 'react-toastify';
import ImageUpload from './inputs/ImageUpload';
import useIndianCities from '@/hook/useCities';
import { FaBolt } from "react-icons/fa";
import ReactSwitch from 'react-switch';
import Heading from "@/components/Heading";
import Calendar from '@/components/Calendar';
import { SessionProvider } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ManageTimings from './ManageTimings';

type Props = {
    listing: any;
    predefinedAmenities: any[],
    predefinedAddons: any[],
};

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const [selectedMenu, setSelectedMenu] = useState("Edit Property");
    const [initialListing, setListing] = useState(listing);

    // Add any state management or handlers you may need for form submission or image uploads
    const [amenities, setAmenities] = useState<Amenities[]>(predefinedAmenities);  // Explicitly specify the type
    const [addons, setAddons] = useState<any[]>(predefinedAddons);  // Explicitly specify the type

    const [selectedAmenities, setSelectedAmenities] = useState<{ [key: string]: boolean }>({});
    const [selectedAddons, setSelectedAddons] = useState<{}>({});

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedMenu]);

    const update = () => {
        axios
            .patch(`/api/listings/${listing.id}`, initialListing)
            .then(() => {
                toast.info("Listing has been successfully updated", {
                    toastId: "Listing_Updated"
                });
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error, {
                    toastId: "Listing_Error_1"
                });
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
        setSelectedAddons((prevSelected) => {
            if (JSON.stringify(prevSelected) !== JSON.stringify(updatedAddons)) {
                handleInputChange("addons", updatedAddons);
                return updatedAddons;
            }
            return prevSelected;
        });
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
        <SessionProvider>
            <div className='flex justify-center'>
                {/* Sidebar */}
                <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
                {/* Main Content */}
                <div className="bg-white flex flex-col sm:p-8 sm:pt-0 mt-20 sm:mt-10 w-full gap-5">
                    <Heading title={selectedMenu} />
                    {/* Edit Property */}
                    <div className={selectedMenu === "Edit Property" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        {/* Name */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="text-sm font-medium text-gray-700 sm:w-1/3">
                                Name
                            </label>
                            <input
                                type="text"
                                id="listingName"
                                className="border rounded-full py-2 shadow-sm w-full"
                                placeholder="Enter the listing name"
                                value={initialListing.title}
                                onChange={(e) => handleInputChange("title", e.target.value)}
                            />
                        </div>
                        {/* Description */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Description
                            </label>
                            <textarea
                                id="listingDescription"
                                className="border rounded-xl pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the description"
                                value={initialListing.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                            />
                        </div>
                        {/* Category */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Category
                            </label>
                            <select
                                className="border rounded-full pl-3 py-2 shadow-sm w-full"
                                value={initialListing.category}
                                onChange={(e) => handleInputChange("category", e.target.value)}
                            >
                                {categories.map((item) => (
                                    <option key={item.label} value={item.label}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Location */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Location
                            </label>
                            <select
                                className="border rounded-full pl-3 py-2 shadow-sm w-full"
                                onChange={(e) => handleInputChange("location", e.target.value)}
                            >
                                {indianCities.map((item, index) => (
                                    <option key={index} value={`city${index}`}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Images */}
                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Images (Max 8 Pictures)
                            </label>
                            <div className="flex gap-6 w-full flex-wrap justify-center sm:justify-normal mt-2 sm:mt-0">
                                {initialListing.imageSrc.map((item: any, index: number) => (
                                    <div key={index} className="relative">
                                        <div className="h-32 w-32 rounded-xl flex items-center">
                                            <img src={item} alt={`Image ${index}`} className="h-full w-full object-cover rounded-xl" />
                                        </div>
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 rounded-full"
                                        >
                                            <MdClose size={20} className="text-white bg-black rounded-full hover:bg-white hover:text-black border-solid border-2 border-black transition-colors ease-in-out duration-300" />
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
                        </div>
                        {/* Amenities */}
                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Amenities
                            </label>
                            <div className="mt-1 flex space-x-6 w-full">
                                <AmenitiesCheckbox checked={initialListing.amenities} amenities={amenities} onChange={handleAmenitiesChange} />
                            </div>
                        </div>
                        {/* Addons */}
                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Addons
                            </label>
                            <div className="flex flex-col w-full">
                                <AddonsSelection initialSelectedAddons={initialListing.addons} addons={addons} onSelectedAddonsChange={handleAddonChange} />
                                <CustomAddonModal save={(value) => { addons.push(value); setAddons(addons); }} />
                            </div>
                        </div>
                        {/* Carpet Area */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Carpet Area
                            </label>
                            <input
                                type="number"
                                id="carpetArea"
                                className="border rounded-full  pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the carpet area"
                                value={initialListing.otherDetails?.carpetArea ?? ""}
                                onChange={(e) => handleInputChange("otherDetails.carpetArea", e.target.value)}
                            />
                        </div>
                        {/* Operational Days */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Operational Days
                            </label>
                            <div className="flex space-x-2 w-full">
                                <select
                                    className="border rounded-full w-25 py-1 text-center"
                                    value={initialListing.otherDetails?.operationalDays?.start}
                                    onChange={(e) => handleInputChange("otherDetails.operationalDays.start", e.target.value)}
                                >
                                    <option value="Mon" selected>Mon</option>
                                    <option value="Tue">Tue</option>
                                    <option value="Wed">Wed</option>
                                    <option value="Thu">Thu</option>
                                    <option value="Fri">Fri</option>
                                    <option value="Sat">Sat</option>
                                    <option value="Sun">Sun</option>
                                </select>
                                <span>-</span>
                                <select
                                    className="border rounded-full w-25 py-1 text-center"
                                    value={initialListing.otherDetails?.operationalDays?.end}
                                    onChange={(e) => handleInputChange("otherDetails.operationalDays.end", e.target.value)}
                                >
                                    <option value="Mon">Mon</option>
                                    <option value="Tue">Tue</option>
                                    <option value="Wed">Wed</option>
                                    <option value="Thu">Thu</option>
                                    <option value="Fri" selected>Fri</option>
                                    <option value="Sat">Sat</option>
                                    <option value="Sun">Sun</option>
                                </select>
                            </div>
                        </div>
                        {/* Operational Hours */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Operational Hours
                            </label>
                            <div className="flex space-x-2 w-full">
                                <input
                                    type="text"
                                    placeholder="AM"
                                    className="border rounded-full w-30 py-1 text-center"
                                    value={initialListing.otherDetails?.operationalHours?.start}
                                    onChange={(e) => handleInputChange("otherDetails.operationalHours.start", e.target.value)}
                                />
                                <span>-</span>
                                <input
                                    type="text"
                                    placeholder="PM"
                                    className="border rounded-full w-30 py-1 text-center"
                                    value={initialListing.otherDetails?.operationalHours?.end}
                                    onChange={(e) => handleInputChange("otherDetails.operationalHours.end", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Min Booking Hours */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Min. Booking Hours
                            </label>
                            <input
                                type="text"
                                id="minBookingHours"
                                className="border rounded-full  pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the minimum booking hours"
                                value={initialListing.otherDetails?.minimumBookingHours ?? ""}
                                onChange={(e) => handleInputChange("otherDetails.minimumBookingHours", e.target.value)}
                            />
                        </div>
                        {/* Max PAX */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Max PAX
                            </label>
                            <input
                                type="text"
                                id="maxPax"
                                className="border rounded-full  pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the maximum PAX"
                                value={initialListing.otherDetails?.maximumPax ?? ""}
                                onChange={(e) => handleInputChange("otherDetails.maximumPax", e.target.value)}
                            />
                        </div>
                        {/* Instant Book */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Instant Book
                            </label>
                            <div className="w-full flex items-center">
                                <ReactSwitch
                                    checked={initialListing.otherDetails.instantBook}
                                    onChange={(checked) => handleInputChange('otherDetails.instantBook', checked)}
                                    offColor="#d1d5db"
                                    onColor="#000"
                                    uncheckedIcon={false}
                                    offHandleColor="#000"
                                    activeBoxShadow="0 0 2px 3px #000"
                                    checkedIcon={false}
                                    height={30}
                                    handleDiameter={20}
                                    checkedHandleIcon={<FaBolt color='#FFD700' className='w-full h-full py-[2px]' />}
                                />
                            </div>
                        </div>

                        <div className="col-span-3 pt-5 flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-full hover:opacity-85 text-white bg-black"
                                onClick={update}
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className={selectedMenu === "Sync Calendar" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Calendar />
                    </div>

                    {/* Manage Timings */}
                    <div className={selectedMenu === "Manage Timings" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <ManageTimings listingId={listing.id} />
                    </div>

                    {/* Settings */}
                    <div className={selectedMenu === "Settings" ? "flex flex-col gap-5" : "hidden"}>
                        <button className='border-2 border-red px-6 py-2 rounded-full hover:opacity-85 text-red w-fit shadow-sm'>
                            DELETE PROPERTY
                        </button>
                        <p><span className='font-semibold'>Warning:</span> Deleting your property will permanently remove all your data and cannot be undone. </p>
                    </div>
                </div>
            </div>
        </SessionProvider>
    );
};

export default PropertyClient;
