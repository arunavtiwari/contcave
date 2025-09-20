"use client";

import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import Image from "next/image";
import { Amenities } from "@prisma/client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GiPhotoCamera, GiPineTree, GiSunflower, GiCube, GiLighthouse, GiMountainCave, GiArtificialIntelligence, GiCaveEntrance, GiFruitBowl } from "react-icons/gi";
import { IoDiamond } from "react-icons/io5";
import { MdOutlineVilla, MdClose } from "react-icons/md";
import AddonsSelection, { Addon } from "./inputs/AddonsSelection";
import CustomAddonModal from "./modals/CustomAddonModal";
import axios from "axios";
import { toast } from "react-toastify";
import ImageUpload from "./inputs/ImageUpload";
import useIndianCities from "@/hook/useCities";
import { FaBolt } from "react-icons/fa";
import ReactSwitch from "react-switch";
import Heading from "@/components/Heading";
import Calendar from "@/components/Calendar";
import { SessionProvider, signIn } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import ManageTimings from "./ManageTimings";
import { MdOutlineCurrencyRupee } from "react-icons/md";

type Props = {
    listing: any;
    predefinedAmenities: Amenities[];
    predefinedAddons: any[];
};

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function setDeep<T extends object>(obj: T, path: string, value: any): T {
    const keys = path.split(".");
    const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...obj };
    let cur: any = clone;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        const next = cur[k];
        const nextVal = next && typeof next === "object" ? (Array.isArray(next) ? [...next] : { ...next }) : {};
        cur[k] = nextVal;
        cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
    return clone;
}

/* ---- Time slots dropdown source ---- */
type TimeLabel = string;
const TIME_SLOTS: TimeLabel[] = [
    "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
    "9:00 PM", "9:30 PM", "10:00 PM",
];

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const [selectedMenu, setSelectedMenu] = useState("Edit Property");
    const [initialListing, setListing] = useState(() => ({
        ...listing,
        imageSrc: Array.isArray(listing?.imageSrc) ? listing.imageSrc : [],
        operationalDays: listing?.operationalDays ?? { start: "Mon", end: "Sun" },
        operationalHours: listing?.operationalHours ?? { start: "", end: "" },
        amenities: listing?.amenities ?? [],
        otherAmenities: listing?.otherAmenities ?? [],
        addons: listing?.addons ?? [],
    }));

    const [amenities, setAmenities] = useState<Amenities[]>(predefinedAmenities ?? []);
    const [addons, setAddons] = useState<any[]>(predefinedAddons ?? []);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedMenu]);

    const update = () => {
        axios
            .patch(`/api/listings/${initialListing.id}`, initialListing)
            .then(() => {
                toast.info("Listing has been successfully updated", { toastId: "Listing_Updated" });
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error || "Failed to update listing", { toastId: "Listing_Error_1" });
            });
    };

    const handleInputChange = useCallback((field: string, value: any) => {
        setListing((prev: any) => setDeep(prev, field, value));
    }, []);

    const handleAmenitiesChange = (updated: { predefined: { [key: string]: boolean }; custom: string[] }) => {
        const selectedPredefined = Object.keys(updated.predefined).filter((k) => updated.predefined[k]);
        handleInputChange("amenities", selectedPredefined);
        handleInputChange("otherAmenities", updated.custom);
    };

    const handleAddonChange = (updatedAddons: Addon[]) => {
        setListing((prev: any) => {
            if (JSON.stringify(prev.addons) === JSON.stringify(updatedAddons)) return prev;
            return { ...prev, addons: updatedAddons };
        });
    };

    const indianCities = useIndianCities().getAll();

    const categories = useMemo(
        () => [
            { label: "Studios", icon: GiPhotoCamera, description: "For a modern touch, explore futuristic and contemporary spaces!" },
            { label: "Urban", icon: MdOutlineVilla, description: "This location is in the heart of the city!" },
            { label: "Nature", icon: GiPineTree, description: "Surrounded by natural beauty, perfect for outdoor shoots!" },
            { label: "Open Spaces", icon: GiSunflower, description: "A location with expansive open space, great for creative shots!" },
            { label: "Minimalist", icon: GiCube, description: "Simplicity at its best, perfect for minimalist aesthetics!" },
            { label: "Seaside", icon: GiLighthouse, description: "Shoot by the sea, with breathtaking views and natural lighting!" },
            { label: "Mountain", icon: GiMountainCave, description: "Find serenity in the mountains, an ideal retreat for your shoot!" },
            { label: "Artistic", icon: GiArtificialIntelligence, description: "Discover studios designed for artistic and creative photography!" },
            { label: "Vintage", icon: GiCaveEntrance, description: "Step into the past with locations exuding vintage vibes!" },
            { label: "Chic & Trendy", icon: IoDiamond, description: "Stay on-trend with chic and stylish shoot locations!" },
            { label: "Public Spaces", icon: GiFruitBowl, description: "Capture the essence of vibrant open-air markets in your shoot!" },
        ],
        []
    );

    const removeImage = (indexToRemove: number) => {
        const images = Array.isArray(initialListing.imageSrc) ? initialListing.imageSrc : [];
        const updatedImages = images.filter((_: any, index: number) => index !== indexToRemove);
        handleInputChange("imageSrc", updatedImages);
    };

    // Time dropdown logic
    const startTime: TimeLabel = initialListing.operationalHours?.start ?? "";
    const endTime: TimeLabel = initialListing.operationalHours?.end ?? "";

    const startIdx = useMemo(() => TIME_SLOTS.indexOf(startTime), [startTime]);
    const endIdx = useMemo(() => TIME_SLOTS.indexOf(endTime), [endTime]);

    const endOptions = useMemo(() => {
        if (startIdx === -1) return TIME_SLOTS;
        return TIME_SLOTS.slice(startIdx); // enforce end >= start
    }, [startIdx]);

    const onStartChange = (val: TimeLabel) => {
        const newStartIdx = TIME_SLOTS.indexOf(val);
        const currentEndIdx = TIME_SLOTS.indexOf(initialListing.operationalHours?.end ?? "");
        let nextEnd = initialListing.operationalHours?.end ?? "";
        if (newStartIdx !== -1 && (currentEndIdx === -1 || currentEndIdx < newStartIdx)) {
            nextEnd = TIME_SLOTS[newStartIdx]; // auto-align end to start if invalid
        }
        setListing((prev: any) =>
            setDeep(setDeep(prev, "operationalHours.start", val), "operationalHours.end", nextEnd)
        );
    };

    const onEndChange = (val: TimeLabel) => {
        setListing((prev: any) => setDeep(prev, "operationalHours.end", val));
    };

    return (
        <SessionProvider>
            <div className="flex justify-center">
                <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} listingId={initialListing.id} />

                <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">
                    {/* Edit Property */}
                    <div className={selectedMenu === "Edit Property" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Heading title="Edit Property" />

                        {/* Name */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="text-sm font-medium text-gray-700 sm:w-1/3">Name</label>
                            <input
                                type="text"
                                id="listingName"
                                className="border rounded-full pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the listing name"
                                value={initialListing.title ?? ""}
                                onChange={(e) => handleInputChange("title", e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Description</label>
                            <textarea
                                id="listingDescription"
                                className="border rounded-xl pl-3 py-2 shadow-sm w-full resize-none"
                                placeholder="Enter the description"
                                value={initialListing.description ?? ""}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                rows={5}
                            />
                        </div>

                        {/* Category */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Category</label>
                            <select
                                className="border rounded-full pl-3 py-2 shadow-sm w-full"
                                value={initialListing.category ?? categories[0]?.label}
                                onChange={(e) => handleInputChange("category", e.target.value)}
                            >
                                {categories.map((item) => (
                                    <option key={item.label} value={item.label}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Price</label>
                            <div className="w-full relative">
                                <MdOutlineCurrencyRupee size={24} className="text-neutral-700 absolute top-2.5 left-2 border-r pr-1 border-neutral-300" />
                                <input
                                    type="number"
                                    id="listingPrice"
                                    className="border rounded-full py-2 shadow-sm w-full pl-10 focus:border-black"
                                    placeholder="Price"
                                    value={Number.isFinite(initialListing.price) ? initialListing.price : ""}
                                    onChange={(e) => handleInputChange("price", Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Location</label>
                            <select
                                className="border rounded-full pl-3 py-2 shadow-sm w-full"
                                value={initialListing.location ?? ""}
                                onChange={(e) => handleInputChange("location", e.target.value)}
                            >
                                {indianCities.map((item: any, index: number) => (
                                    <option key={index} value={item.name}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Images */}
                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Images (Max 8 Pictures)</label>
                            <div className="flex gap-6 w-full flex-wrap justify-center sm:justify-normal mt-2 sm:mt-0">
                                {(initialListing.imageSrc ?? []).map((item: string, index: number) => (
                                    <div key={index} className="relative">
                                        <div className="h-32 w-32 rounded-xl flex items-center">
                                            <Image src={item} alt={`Image ${index}`} width={128} height={128} className="h-full w-full object-cover rounded-xl" />
                                        </div>
                                        <button onClick={() => removeImage(index)} className="absolute top-2 right-2 rounded-full">
                                            <MdClose
                                                size={20}
                                                className="text-white bg-black rounded-full hover:bg-white hover:text-black border-solid border-2 border-black transition-colors ease-in-out duration-300"
                                            />
                                        </button>
                                    </div>
                                ))}
                                {(!initialListing.imageSrc || initialListing.imageSrc.length < 8) && (
                                    <ImageUpload
                                        isFromPropertyClient
                                        onChange={(value) => handleInputChange("imageSrc", [...(initialListing.imageSrc ?? []), ...value])}
                                        values={[]}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Amenities</label>
                            <div className="flex w-full">
                                <AmenitiesCheckbox
                                    checked={initialListing.amenities}
                                    amenities={amenities}
                                    onChange={handleAmenitiesChange}
                                    customAmenities={initialListing.otherAmenities}
                                />
                            </div>
                        </div>

                        {/* Addons */}
                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Addons</label>
                            <div className="flex flex-col w-full">
                                <AddonsSelection initialSelectedAddons={initialListing.addons} addons={addons} onSelectedAddonsChange={handleAddonChange} />
                                <CustomAddonModal
                                    save={(value) => {
                                        const updated = [...addons, value];
                                        setAddons(updated);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Carpet Area */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Carpet Area</label>
                            <input
                                type="number"
                                id="carpetArea"
                                className="border rounded-full  pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the carpet area"
                                value={initialListing.carpetArea ?? ""}
                                onChange={(e) => handleInputChange("carpetArea", e.target.value)}
                            />
                        </div>

                        {/* Operational Days */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Operational Days</label>
                            <div className="flex space-x-2 w-full">
                                <select
                                    className="border rounded-full w-25 py-1 text-center"
                                    value={initialListing.operationalDays?.start ?? "Mon"}
                                    onChange={(e) => handleInputChange("operationalDays.start", e.target.value)}
                                >
                                    {dayOptions.map((d) => (
                                        <option key={`start-${d}`} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                                <span>-</span>
                                <select
                                    className="border rounded-full w-25 py-1 text-center"
                                    value={initialListing.operationalDays?.end ?? "Sun"}
                                    onChange={(e) => handleInputChange("operationalDays.end", e.target.value)}
                                >
                                    {dayOptions.map((d) => (
                                        <option key={`end-${d}`} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Operational Hours (Dropdowns from TIME_SLOTS) */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Operational Hours</label>
                            <div className="flex space-x-2 w-full">
                                <select
                                    className="border rounded-full w-36 py-1 text-center"
                                    value={startTime}
                                    onChange={(e) => onStartChange(e.target.value)}
                                >
                                    <option value="">Start</option>
                                    {TIME_SLOTS.map((t) => (
                                        <option key={`start-${t}`} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>

                                <span>-</span>

                                <select
                                    className="border rounded-full w-36 py-1 text-center"
                                    value={endTime}
                                    onChange={(e) => onEndChange(e.target.value)}
                                >
                                    <option value="">End</option>
                                    {endOptions.map((t) => (
                                        <option key={`end-${t}`} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Min Booking Hours */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Min. Booking Hours</label>
                            <input
                                type="text"
                                id="minBookingHours"
                                className="border rounded-full  pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the minimum booking hours"
                                value={initialListing.minimumBookingHours ?? ""}
                                onChange={(e) => handleInputChange("minimumBookingHours", e.target.value)}
                            />
                        </div>

                        {/* Max PAX */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Max PAX</label>
                            <input
                                type="text"
                                id="maxPax"
                                className="border rounded-full  pl-3 py-2 shadow-sm w-full"
                                placeholder="Enter the maximum PAX"
                                value={initialListing.maximumPax ?? ""}
                                onChange={(e) => handleInputChange("maximumPax", e.target.value)}
                            />
                        </div>

                        {/* Instant Book */}
                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Instant Book</label>
                            <div className="w-full flex items-center">
                                <ReactSwitch
                                    checked={Boolean(initialListing.instantBooking)}
                                    onChange={(checked) => handleInputChange("instantBooking", checked)}
                                    offColor="#d1d5db"
                                    onColor="#000"
                                    uncheckedIcon={false}
                                    offHandleColor="#000"
                                    activeBoxShadow="0 0 2px 3px #000"
                                    checkedIcon={false}
                                    height={30}
                                    handleDiameter={20}
                                    checkedHandleIcon={<FaBolt color="#FFD700" className="w-full h-full py-[2px]" />}
                                />
                            </div>
                        </div>

                        <div className="col-span-3 pt-5 flex justify-end">
                            <button
                                type="button"
                                className="inline-flex py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-full hover:opacity-85 text-white bg-black"
                                onClick={update}
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className={selectedMenu === "Sync Calendar" ? "flex flex-col gap-5 sm:gap-8 items-center" : "hidden"}>
                        <div className="flex justify-between w-full items-center">
                            <Heading title="Connect Your Google Calendar" subtitle="Sync offline and Contcave bookings to keep your availability up to date—automatically" />
                            {!listing.user.googleCalendarConnected && (
                                <button
                                    className="bg-black text-white px-15 h-fit py-2 rounded-full hover:opacity-90 flex gap-4 justify-center items-center"
                                    onClick={() => signIn("google-calendar")}
                                >
                                    <Image src="/images/icon/google_calendar.png" alt="Google Calendar" width={30} height={30} className="bg-white rounded-full" />
                                    Sync Google Calendar
                                </button>
                            )}
                        </div>

                        <Calendar
                            operationalStart={initialListing.operationalDays?.start}
                            operationalEnd={initialListing.operationalDays?.end}
                            listingId={initialListing.id}
                        />
                    </div>

                    {/* Manage Timings */}
                    <div className={selectedMenu === "Manage Timings" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Heading title="Manage Studio Availability" subtitle="Update your working hours manually" />
                        <ManageTimings
                            listingId={initialListing.id}
                            defaultStartTime={initialListing.operationalHours?.start}
                            defaultEndTime={initialListing.operationalHours?.end}
                            defaultStartDay={initialListing.operationalDays?.start}
                            defaultEndDay={initialListing.operationalDays?.end}
                        />
                    </div>

                    {/* Settings */}
                    <div className={selectedMenu === "Settings" ? "flex flex-col gap-5" : "hidden"}>
                        <button className="border-2 border-red px-6 py-2 rounded-full hover:opacity-85 text-red w-fit shadow-sm">DELETE PROPERTY</button>
                        <p>
                            <span className="font-semibold">Warning:</span> Deleting your property will permanently remove all your data and cannot be undone.
                        </p>
                    </div>
                </div>
            </div>
        </SessionProvider>
    );
};

export default PropertyClient;
