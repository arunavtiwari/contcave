"use client";

import { Amenities } from "@prisma/client";
import axios from "axios";
import Image from "next/image";
import { SessionProvider, signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdClose, MdOutlineCurrencyRupee } from "react-icons/md";
import { toast } from "react-toastify";

import Calendar from "@/components/Calendar";
import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import { categories as CATEGORY_OPTIONS } from "@/components/navbar/Categories";
import Sidebar from "@/components/Sidebar";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Switch from "@/components/ui/Switch";
import useIndianCities, { City } from "@/hook/useCities";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";
import { Package as ListingPackage } from "@/types/package";

import BlocksManager from "./BlocksManager";
import AddonsSelection from "./inputs/AddonsSelection";
import ImageUpload from "./inputs/ImageUpload";
import PackagesForm from "./inputs/PackagesForm";
import SetsEditor from "./inputs/SetsEditor";
import ManageTimings from "./ManageTimings";
import CustomAddonModal from "./modals/CustomAddonModal";

type Props = {
    listing: FullListing;
    predefinedAmenities: Amenities[];
    predefinedAddons: Addon[];
};

interface NormalizedPackage {
    id?: string;
    title: string;
    originalPrice: number;
    offeredPrice: number;
    features: string[];
    durationHours: number;
}

const isVideo = (url: string) => {
    return /\.(mp4|webm|mov)$/i.test(url);
};

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function setDeep<T extends object>(obj: T, path: string, value: unknown): T {
    const keys = path.split(".");
    const clone = (Array.isArray(obj) ? [...obj] : { ...obj }) as unknown as T;
    let cur = clone as unknown as Record<string, unknown>;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        const next = cur[k];
        const nextVal =
            next && typeof next === "object"
                ? Array.isArray(next)
                    ? [...next]
                    : { ...next }
                : {};
        cur[k] = nextVal;
        cur = cur[k] as Record<string, unknown>;
    }
    cur[keys[keys.length - 1]] = value;
    return clone;
}


type TimeLabel = string;
import { TIME_SLOTS } from "@/constants/timeSlots";

import RichTextEditor from "./RichText/RichTextEditor";

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const [selectedMenu, setSelectedMenu] = useState("Edit Property");
    const { getAll } = useIndianCities();
    const indianCities = getAll();
    const [amenities] = useState(predefinedAmenities);
    const [addons, setAddons] = useState<Addon[]>(predefinedAddons);
    const [isCalendarConnected, setIsCalendarConnected] = useState(listing.user?.googleCalendarConnected);

    const [initialListing, setListing] = useState<FullListing>(() => {
        const cleanImageSrc = (listing.imageSrc ?? []).filter(
            (url: string) => typeof url === "string" && !url.startsWith("blob:")
        );
        const cleanSets = (listing.sets ?? []).map((s) => ({
            ...s,
            images: (s.images ?? []).filter(
                (url: string) => typeof url === "string" && !url.startsWith("blob:")
            ),
        }));
        return {
            ...listing,
            imageSrc: cleanImageSrc,
            sets: cleanSets,
        };
    });

    const [setsHaveSamePrice, setSetsHaveSamePrice] = useState<boolean | null>(initialListing.setsHaveSamePrice ?? null);
    const [unifiedSetPrice, setUnifiedSetPrice] = useState<number | null>(initialListing.unifiedSetPrice ?? null);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedMenu]);

    const update = async () => {
        const normalizedPackages = (initialListing.packages ?? []).map((pkg: ListingPackage) => ({
            id: pkg.id,
            title: (pkg.title ?? "").trim(),
            originalPrice: Number(pkg.originalPrice ?? 0),
            offeredPrice: Number(pkg.offeredPrice ?? 0),
            features: Array.isArray(pkg.features)
                ? pkg.features.filter((feature) => typeof feature === "string" && feature.trim().length > 0)
                : [],
            durationHours: Number(pkg.durationHours ?? 0),
            requiredSetCount: pkg.requiredSetCount ? Number(pkg.requiredSetCount) : null,
        }));

        const packagesWithData = normalizedPackages.filter((pkg: NormalizedPackage) =>
            pkg.title.length > 0 ||
            pkg.originalPrice > 0 ||
            pkg.offeredPrice > 0 ||
            pkg.durationHours > 0 ||
            (pkg.features && pkg.features.length > 0)
        );

        const hasIncompletePackage = packagesWithData.some((pkg: NormalizedPackage) =>
            !pkg.title || pkg.durationHours <= 0 || pkg.originalPrice <= 0 || pkg.offeredPrice <= 0
        );

        if (hasIncompletePackage) {
            toast.error("Please complete all package fields before saving", { toastId: "Incomplete_Package_Update" });
            return;
        }

        const invalidAddon = (initialListing.addons ?? []).find(
            (addon) => !addon.price || addon.price <= 0 || !addon.qty || addon.qty <= 0
        );

        if (invalidAddon) {
            toast.error(`Please provide a valid price and quantity for ${invalidAddon.name}`, { toastId: "Invalid_Addon_Update" });
            return;
        }

        if (initialListing.hasSets) {
            if (!initialListing.sets || initialListing.sets.length < 2) {
                toast.error("Please add at least 2 sets for a multi-set listing");
                return;
            }

        }

        const { id: _ignoredId, user: _ignoredUser, createdAt: _ignoredCreatedAt, ...listingWithoutMeta } = initialListing;

        const { updatedAt: _ignoredUpdatedAt, ...rest } = listingWithoutMeta as Record<string, unknown>;

        try {
            const finalImageSrc = initialListing.imageSrc && initialListing.imageSrc.length > 0
                ? await uploadToCloudinary(initialListing.imageSrc, "listing_main")
                : [];

            const finalSets = initialListing.hasSets ? await Promise.all(
                (initialListing.sets ?? []).map(async (s, i) => ({
                    id: s.id,
                    name: s.name.trim(),
                    description: s.description?.trim() || null,
                    images: s.images && s.images.length > 0
                        ? await uploadToCloudinary(s.images, "listing_sets")
                        : [],
                    price: s.price,
                    position: i,
                }))
            ) : [];

            const payload = {
                ...rest,
                imageSrc: finalImageSrc,
                packages: packagesWithData,
                hasSets: initialListing.hasSets,
                setsHaveSamePrice: setsHaveSamePrice ?? initialListing.setsHaveSamePrice ?? false,
                unifiedSetPrice: setsHaveSamePrice ? Number(unifiedSetPrice) : null,
                additionalSetPricingType: initialListing.hasSets ? initialListing.additionalSetPricingType : null,
                sets: finalSets,
            };

            await axios
                .patch(`/api/listings/${initialListing.id}`, payload)
                .then(() => {
                    toast.info("Listing has been successfully updated", { toastId: "Listing_Updated" });
                })
                .catch((error) => {
                    toast.error(error?.response?.data?.error || "Failed to update listing", {
                        toastId: "Listing_Error_1",
                    });
                });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Upload failed";
            toast.error(msg);
        }
    };

    const handleInputChange = useCallback((field: string, value: unknown) => {
        setListing((prev: FullListing) => {
            if (field === "locationValue" || field === "actualLocation") {
                return { ...prev, [field]: value };
            }
            return setDeep(prev, field, value);
        });
    }, []);

    useEffect(() => {
        if (setsHaveSamePrice && initialListing.sets && initialListing.sets.length > 0) {
            const newPrice = unifiedSetPrice !== null ? unifiedSetPrice : (initialListing.sets[0].price || 0);
            if (unifiedSetPrice !== newPrice) {
                setUnifiedSetPrice(newPrice);
            }

            const updatedSets = initialListing.sets.map(s => ({ ...s, price: newPrice }));
            const hasChanges = updatedSets.some((s, i) => s.price !== (initialListing.sets?.[i]?.price));

            if (hasChanges) {
                handleInputChange("sets", updatedSets);
            }
        }
    }, [setsHaveSamePrice, unifiedSetPrice, initialListing.sets, handleInputChange]);

    const handleAmenitiesChange = (updated: { predefined: { [key: string]: boolean }; custom: string[] }) => {
        const selectedPredefined = Object.keys(updated.predefined).filter((k) => updated.predefined[k]).map(String);
        handleInputChange("amenities", selectedPredefined);
        handleInputChange("otherAmenities", updated.custom || []);
    };

    const handleAddonChange = (updatedAddons: Addon[]) => {
        setListing((prev: FullListing) => {
            if (JSON.stringify(prev.addons) === JSON.stringify(updatedAddons)) return prev;
            return { ...prev, addons: updatedAddons };
        });
    };

    const handlePackagesChange = useCallback((updatedPackages: ListingPackage[]) => {
        setListing((prev: FullListing) => ({
            ...prev,
            packages: updatedPackages,
        }));
    }, []);


    const removeMedia = (indexToRemove: number) => {
        const media = Array.isArray(initialListing.imageSrc)
            ? initialListing.imageSrc
            : [];
        const updated = media.filter((_, index) => index !== indexToRemove);
        handleInputChange("imageSrc", updated);
    };


    const startTime: TimeLabel = initialListing.operationalHours?.start ?? "";
    const endTime: TimeLabel = initialListing.operationalHours?.end ?? "";

    const startIdx = useMemo(() => TIME_SLOTS.indexOf(startTime), [startTime]);
    const endOptions = useMemo(() => {
        if (startIdx === -1) return TIME_SLOTS;
        return TIME_SLOTS.slice(startIdx);
    }, [startIdx]);

    const onStartChange = (val: TimeLabel) => {
        const newStartIdx = TIME_SLOTS.indexOf(val);
        const currentEndIdx = TIME_SLOTS.indexOf(initialListing.operationalHours?.end ?? "");
        let nextEnd = initialListing.operationalHours?.end ?? "";
        if (newStartIdx !== -1 && (currentEndIdx === -1 || currentEndIdx < newStartIdx)) {
            nextEnd = TIME_SLOTS[newStartIdx];
        }
        setListing((prev: FullListing) =>
            setDeep(setDeep(prev, "operationalHours.start", val), "operationalHours.end", nextEnd)
        );
    };

    const onEndChange = (val: TimeLabel) => {
        setListing((prev: FullListing) => setDeep(prev, "operationalHours.end", val));
    };

    return (
        <SessionProvider>
            <div className="flex justify-center">
                <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} listingId={initialListing.id} />

                <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">

                    <div className={selectedMenu === "Edit Property" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Heading title="Edit Property" />


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="text-sm font-medium text-gray-700 sm:w-1/3">Name</label>
                            <input
                                type="text"
                                id="listingName"
                                className="border rounded-lg pl-3 py-2 shadow-xs w-full"
                                placeholder="Enter the listing name"
                                value={initialListing.title ?? ""}
                                onChange={(e) => handleInputChange("title", e.target.value)}
                            />
                        </div>

                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="text-sm font-medium text-gray-700 sm:w-1/3">Custom URL</label>
                            <div className="w-full flex items-center">
                                <span className="text-gray-500 mr-2">contcave.com/listings/</span>
                                <input
                                    type="text"
                                    id="listingSlug"
                                    className="border rounded-lg pl-3 py-2 shadow-xs w-full"
                                    placeholder="Enter custom URL slug"
                                    value={initialListing.slug ?? ""}
                                    onChange={(e) => handleInputChange("slug", e.target.value)}
                                />
                            </div>
                        </div>


                        <div className="flex sm:items-start gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Description
                            </label>

                            <div className="w-full">
                                <RichTextEditor
                                    value={initialListing.description ?? ""}
                                    onChange={(html) => handleInputChange("description", html)}
                                />
                            </div>
                        </div>

                        <div className="flex sm:items-start gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Terms & Conditions by Host
                            </label>

                            <div className="w-full">
                                <RichTextEditor
                                    value={initialListing.customTerms ?? ""}
                                    onChange={(html) => handleInputChange("customTerms", html)}
                                />
                            </div>
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Category</label>
                            <select
                                className="border rounded-lg pl-3 py-2 shadow-xs w-full"
                                value={initialListing.category ?? CATEGORY_OPTIONS[0]?.label}
                                onChange={(e) => handleInputChange("category", e.target.value)}
                            >
                                {CATEGORY_OPTIONS.map((item) => (
                                    <option key={item.label} value={item.label}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Price</label>
                            <div className="w-full relative">
                                <MdOutlineCurrencyRupee
                                    size={24}
                                    className="text-neutral-700 absolute top-2.5 left-2 border-r pr-1 border-neutral-300"
                                />
                                <input
                                    type="number"
                                    id="listingPrice"
                                    className="border rounded-lg py-2 shadow-xs w-full pl-10 focus:border-black"
                                    placeholder="Price"
                                    value={Number.isFinite(initialListing.price) ? initialListing.price : ""}
                                    onChange={(e) => handleInputChange("price", Number(e.target.value))}
                                />
                            </div>
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Location</label>
                            <select
                                className="border rounded-lg pl-3 py-2 shadow-xs w-full"
                                value={initialListing.locationValue ?? ""}
                                onChange={(e) => handleInputChange("locationValue", e.target.value)}
                            >
                                {indianCities.map((item: City, index: number) => (
                                    <option key={index} value={item.name}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>


                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Images / Videos
                            </label>

                            <div className="flex gap-6 w-full flex-wrap justify-center sm:justify-normal mt-2 sm:mt-0">
                                {(initialListing.imageSrc ?? []).map((item: string, index: number) => (
                                    <div
                                        key={index}
                                        className="relative h-32 w-32 rounded-xl overflow-hidden border"
                                    >
                                        {isVideo(item) ? (
                                            <video
                                                src={item}
                                                className="h-full w-full object-cover"
                                                controls
                                            />
                                        ) : (
                                            <Image
                                                src={item}
                                                alt={`Media ${index}`}
                                                width={128}
                                                height={128}
                                                className="h-full w-full object-cover"
                                                unoptimized
                                            />
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => removeMedia(index)}
                                            className="absolute top-2 right-2 rounded-lg"
                                        >
                                            <MdClose
                                                size={20}
                                                className="text-white bg-black rounded-lg hover:bg-white hover:text-black border-2 border-black transition"
                                            />
                                        </button>
                                    </div>
                                ))}

                                <ImageUpload
                                    uid="property-main-upload"
                                    onChange={(value) => handleInputChange("imageSrc", value)}
                                    values={initialListing.imageSrc ?? []}
                                    deferUpload
                                />
                            </div>
                        </div>



                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Amenities</label>
                            <div className="flex w-full">
                                <AmenitiesCheckbox
                                    checked={Array.isArray(initialListing.amenities) ? initialListing.amenities : []}
                                    amenities={amenities}
                                    onChange={handleAmenitiesChange}
                                    customAmenities={initialListing.otherAmenities}
                                />
                            </div>
                        </div>


                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Addons</label>
                            <div className="flex flex-col w-full">
                                <AddonsSelection
                                    initialSelectedAddons={initialListing.addons}
                                    addons={addons}
                                    onSelectedAddonsChange={handleAddonChange}
                                />
                                <CustomAddonModal
                                    save={(value) => {
                                        const updated = [...addons, { ...value, price: 0, qty: 0, imageUrl: value.imageUrl ?? "" }];
                                        setAddons(updated);
                                    }}
                                />
                            </div>
                        </div>


                        <div className="flex gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Packages</label>
                            <div className="flex flex-col w-full">
                                <PackagesForm
                                    value={initialListing.packages ?? []}
                                    onChange={handlePackagesChange}
                                    availableSets={initialListing.hasSets ? (initialListing.sets ?? []) : []}
                                />
                            </div>
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Carpet Area</label>
                            <input
                                type="number"
                                id="carpetArea"
                                className="border rounded-lg  pl-3 py-2 shadow-xs w-full"
                                placeholder="Enter the carpet area"
                                value={initialListing.carpetArea ?? ""}
                                onChange={(e) => handleInputChange("carpetArea", e.target.value)}
                            />
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Operational Days</label>
                            <div className="flex space-x-2 w-full">
                                <select
                                    className="border rounded-lg w-25 py-1 text-center"
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
                                    className="border rounded-lg w-25 py-1 text-center"
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


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Operational Hours</label>
                            <div className="flex space-x-2 w-full">
                                <select
                                    className="border rounded-lg w-36 py-1 text-center"
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
                                    className="border rounded-lg w-36 py-1 text-center"
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


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                Min. Booking Hours
                            </label>
                            <input
                                type="text"
                                id="minBookingHours"
                                className="border rounded-lg  pl-3 py-2 shadow-xs w-full"
                                placeholder="Enter the minimum booking hours"
                                value={initialListing.minimumBookingHours ?? ""}
                                onChange={(e) => handleInputChange("minimumBookingHours", e.target.value)}
                            />
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Max PAX</label>
                            <input
                                type="text"
                                id="maxPax"
                                className="border rounded-lg  pl-3 py-2 shadow-xs w-full"
                                placeholder="Enter the maximum PAX"
                                value={initialListing.maximumPax ?? ""}
                                onChange={(e) => handleInputChange("maximumPax", e.target.value)}
                            />
                        </div>


                        <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                            <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Instant Book</label>
                            <div className="w-full flex items-center">
                                <Switch
                                    checked={Boolean(initialListing.instantBooking)}
                                    onChange={(checked) => handleInputChange("instantBooking", checked)}
                                    variant="bolt"
                                />
                            </div>
                        </div>

                        <hr />


                        <div className="flex flex-col gap-6">
                            <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                                <label className="block text-sm font-medium text-gray-700 sm:w-1/3">
                                    Multi-Set Mode
                                    <p className="text-xs font-normal text-neutral-500 mt-1">
                                        Enable multiple bookable sets (studios, rooms, etc.)
                                    </p>
                                </label>
                                <div className="w-full flex items-center">
                                    <Switch
                                        checked={Boolean(initialListing.hasSets)}
                                        onChange={(checked) => handleInputChange("hasSets", checked)}
                                    />
                                </div>
                            </div>

                            {initialListing.hasSets && (
                                <div className="flex flex-col gap-6 pl-4">
                                    <div className="flex sm:items-center gap-1 sm:gap-10 flex-col sm:flex-row">
                                        <label className="block text-sm font-medium text-gray-700 sm:w-1/3">Pricing Type</label>
                                        <div className="flex gap-4 w-full">
                                            <button
                                                onClick={() => handleInputChange("additionalSetPricingType", "FIXED")}
                                                className={`flex-1 py-2 px-4 rounded-lg border transition ${initialListing.additionalSetPricingType === "FIXED" ? "bg-black text-white border-black" : "bg-white text-black border-neutral-300 hover:border-black"}`}
                                            >
                                                Fixed Add-on
                                            </button>
                                            <button
                                                onClick={() => handleInputChange("additionalSetPricingType", "HOURLY")}
                                                className={`flex-1 py-2 px-4 rounded-lg border transition ${initialListing.additionalSetPricingType === "HOURLY" ? "bg-black text-white border-black" : "bg-white text-black border-neutral-300 hover:border-black"}`}
                                            >
                                                Hourly Add-on
                                            </button>
                                        </div>
                                    </div>



                                    <div className="flex flex-col gap-4">
                                        <label className="block text-sm font-medium text-gray-700">Will all sets have the same price?</label>
                                        <div className="flex gap-4">
                                            <label
                                                className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === true
                                                    ? "border-black bg-neutral-50 ring-1 ring-black"
                                                    : "border-neutral-200 hover:border-neutral-300"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="priceConsistency"
                                                    checked={setsHaveSamePrice === true}
                                                    onChange={() => setSetsHaveSamePrice(true)}
                                                    className="hidden"
                                                />
                                                <div className="font-medium text-center">Yes, same price</div>
                                            </label>
                                            <label
                                                className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === false
                                                    ? "border-black bg-neutral-50 ring-1 ring-black"
                                                    : "border-neutral-200 hover:border-neutral-300"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="priceConsistency"
                                                    checked={setsHaveSamePrice === false}
                                                    onChange={() => setSetsHaveSamePrice(false)}
                                                    className="hidden"
                                                />
                                                <div className="font-medium text-center">No, different prices</div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <label className="block text-sm font-medium text-gray-700">Manage Sets</label>
                                        <SetsEditor
                                            sets={initialListing.sets ?? []}
                                            onChange={(updated) => handleInputChange("sets", updated)}
                                            pricingType={initialListing.additionalSetPricingType || null}
                                            isPricingUniform={setsHaveSamePrice ?? undefined}
                                            uniformPrice={unifiedSetPrice}
                                            onUniformPriceChange={setUnifiedSetPrice}
                                        />
                                    </div>

                                </div>
                            )}
                        </div>

                        <div className="col-span-3 pt-5 flex justify-end">
                            <button
                                type="button"
                                className="inline-flex py-2 px-6 border border-transparent shadow-xs text-sm font-medium rounded-lg hover:opacity-85 text-white bg-black"
                                onClick={update}
                            >
                                Save
                            </button>
                        </div>
                    </div>


                    <div className={selectedMenu === "Sync Calendar" ? "flex flex-col gap-5 sm:gap-8 items-center" : "hidden"}>
                        <div className="flex justify-between w-full items-center">
                            <Heading
                                title="Connect Your Google Calendar"
                                subtitle="Sync offline and ContCave bookings to keep your availability up to date—automatically"
                            />
                            {!isCalendarConnected && (
                                <button
                                    className="bg-black text-white px-15 h-fit py-2 rounded-lg hover:opacity-90 flex gap-4 justify-center items-center"
                                    onClick={() => signIn("google-calendar")}
                                >
                                    <Image
                                        src="/images/icon/google_calendar.png"
                                        alt="Google Calendar"
                                        width={30}
                                        height={30}
                                        className="bg-white rounded-lg"
                                    />
                                    Sync Google Calendar
                                </button>
                            )}
                        </div>

                        <Calendar
                            operationalStart={initialListing.operationalDays?.start ?? ""}
                            operationalEnd={initialListing.operationalDays?.end ?? ""}
                            listingId={initialListing.id}
                            googleCalendarConnected={isCalendarConnected}
                            onError={() => setIsCalendarConnected(false)}
                        />
                    </div>


                    <div className={selectedMenu === "Manage Timings" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Heading title="Manage Studio Availability" subtitle="Update your working hours manually" />
                        <ManageTimings
                            listingId={initialListing.id}
                            defaultStartTime={initialListing.operationalHours?.start ?? ""}
                            defaultEndTime={initialListing.operationalHours?.end ?? ""}
                            defaultStartDay={initialListing.operationalDays?.start ?? ""}
                            defaultEndDay={initialListing.operationalDays?.end ?? ""}
                        />
                    </div>


                    <div className={selectedMenu === "Settings" ? "flex flex-col gap-5 sm:gap-8 min-h-[600px]" : "hidden"}>
                        <Heading title="Property Settings" subtitle="Manage your property settings and danger zone actions" />

                        <div className="flex flex-col gap-4 p-6 border-2 border-red-200 rounded-xl bg-red-50">
                            <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Warning:</span> Deleting your property will permanently remove all your
                                data and cannot be undone. This action is irreversible.
                            </p>
                            <div className="w-fit">
                                <Button
                                    label="DELETE PROPERTY"
                                    onClick={() => { }}
                                    outline
                                    rounded
                                    classNames="px-6 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                />
                            </div>
                        </div>
                    </div>


                    <div className={selectedMenu === "Manage Blocks" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Heading
                            title="Manage Availability Blocks"
                            subtitle="Block specific sets or the entire listing for maintenance or personal use"
                        />
                        <BlocksManager
                            listingId={initialListing.id}
                            sets={initialListing.sets ?? []}
                        />
                    </div>
                </div>
            </div>
        </SessionProvider >
    );
};

export default PropertyClient;
