"use client";

import { Amenities } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SessionProvider, signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import deleteListing from "@/app/actions/deleteListing";
import updateListing from "@/app/actions/updateListing";
import BlocksManager from "@/components/BlocksManager";
import Calendar from "@/components/Calendar";
import AddonsSelection from "@/components/inputs/AddonsSelection";
import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import ImageReorderGrid from "@/components/inputs/ImageReorderGrid";
import ImageUpload from "@/components/inputs/ImageUpload";
import PackagesForm from "@/components/inputs/PackagesForm";
import SetsEditor from "@/components/inputs/SetsEditor";
import ManageTimings from "@/components/ManageTimings";
import CustomAddonModal from "@/components/modals/CustomAddonModal";
import DeletePropertyModal from "@/components/modals/DeletePropertyModal";
import { categories as CATEGORY_OPTIONS } from "@/components/navbar/Categories";
import Sidebar from "@/components/Sidebar";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Switch from "@/components/ui/Switch";
import { spaceTypes } from "@/constants/spaceTypes";
import useIndianCities, { City } from "@/hook/useCities";
import { uploadToR2 } from "@/lib/storage/upload";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";
import { Package as ListingPackage } from "@/types/package";

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
import RichTextEditor from "@/components/RichText/RichTextEditor";
import { TIME_SLOTS } from "@/constants/timeSlots";

import FormField from "./ui/FormField";
import Input from "./ui/Input";

const propertyFieldClassName =
    "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground transition outline-none focus:border-primary hover:border-border/80";

const propertyFieldSeparatorClassName =
    "flex items-center justify-center self-stretch px-1 text-sm font-medium leading-none text-muted-foreground";

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const [selectedMenu, setSelectedMenu] = useState("Edit Property");
    const { getAll } = useIndianCities();
    const indianCities = getAll();
    const [amenities] = useState(predefinedAmenities);
    const [addons, setAddons] = useState<Addon[]>(predefinedAddons);
    const [isCalendarConnected, setIsCalendarConnected] = useState(listing.user?.googleCalendarConnected);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

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
            type: Array.isArray(listing.type) ? listing.type : [],
            amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
            otherAmenities: Array.isArray(listing.otherAmenities) ? listing.otherAmenities : [],
        };
    });

    const [setsHaveSamePrice, setSetsHaveSamePrice] = useState<boolean | null>(initialListing.setsHaveSamePrice ?? null);
    const [unifiedSetPrice, setUnifiedSetPrice] = useState<number | null>(initialListing.unifiedSetPrice ?? null);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedMenu]);

    const handleDeleteProperty = useCallback(async () => {
        setIsDeleting(true);
        try {
            await deleteListing(initialListing.id);
            toast.info("Property deleted successfully", { id: "Listing_Deleted" });
            router.push("/properties");
            router.refresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to delete property";
            toast.error(message, { id: "Property_Delete_Error_1" });
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    }, [initialListing.id, router]);

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
            toast.error("Please complete all package fields before saving", { id: "Incomplete_Package_Update" });
            return;
        }

        const invalidAddon = (initialListing.addons ?? []).find(
            (addon) => !addon.price || addon.price <= 0 || !addon.qty || addon.qty <= 0
        );

        if (invalidAddon) {
            toast.error(`Please provide a valid price and quantity for ${invalidAddon.name}`, { id: "Invalid_Addon_Update" });
            return;
        }

        if ((initialListing.imageSrc?.length ?? 0) > 30) {
            toast.error("Maximum 30 images allowed", { id: "Max_Images_Update" });
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
                ? await uploadToR2(initialListing.imageSrc, "listing_main")
                : [];

            const finalSets = initialListing.hasSets ? await Promise.all(
                (initialListing.sets ?? []).map(async (s, i) => ({
                    id: s.id,
                    name: s.name.trim(),
                    description: s.description?.trim() || null,
                    images: s.images && s.images.length > 0
                        ? await uploadToR2(s.images, "listing_sets")
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

            await updateListing(initialListing.id, payload);
            toast.info("Listing has been successfully updated", { id: "Listing_Updated" });
            router.refresh();
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Update failed";
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

                <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-border">

                    <div className={selectedMenu === "Edit Property" ? "flex flex-col gap-5 sm:gap-8" : "hidden"}>
                        <Heading title="Edit Property" />


                        <Input
                            id="listingName"
                            label="Name"
                            variant="horizontal"
                            placeholder="Enter the listing name"
                            value={initialListing.title ?? ""}
                            onChange={(e) => handleInputChange("title", e.target.value)}
                        />

                        <FormField
                            id="listingSlug"
                            label="Custom URL"
                            variant="horizontal"
                        >
                            <div className="w-full flex items-center">
                                <span className="text-muted-foreground mr-2 text-sm">contcave.com/listings/</span>
                                <input
                                    type="text"
                                    id="listingSlug"
                                    className={propertyFieldClassName}
                                    placeholder="Enter custom URL slug"
                                    value={initialListing.slug ?? ""}
                                    onChange={(e) => handleInputChange("slug", e.target.value)}
                                />
                            </div>
                        </FormField>


                        <FormField
                            label="Description"
                            variant="horizontal"
                        >
                            <RichTextEditor
                                value={initialListing.description ?? ""}
                                onChange={(html) => handleInputChange("description", html)}
                            />
                        </FormField>

                        <FormField
                            label="Terms & Conditions by Host"
                            variant="horizontal"
                        >
                            <RichTextEditor
                                value={initialListing.customTerms ?? ""}
                                onChange={(html) => handleInputChange("customTerms", html)}
                            />
                        </FormField>


                        <FormField
                            label="Category"
                            variant="horizontal"
                        >
                            <select
                                className={propertyFieldClassName}
                                value={initialListing.category ?? ""}
                                onChange={(e) => handleInputChange("category", e.target.value)}
                            >
                                <option value="" disabled hidden>Select Category</option>
                                {CATEGORY_OPTIONS.map((item) => (
                                    <option key={item.label} value={item.label}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>


                        <FormField
                            label="Listed Services"
                            description="Select all services available in this space"
                            variant="horizontal"
                        >
                            <div className="w-full flex flex-wrap gap-2">
                                {Array.from(new Set([...spaceTypes, ...(initialListing.type || [])])).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            const currentType = initialListing.type || [];
                                            const exists = currentType.includes(t);
                                            const newType = exists
                                                ? currentType.filter((x) => x !== t)
                                                : [...currentType, t];
                                            handleInputChange("type", newType);
                                        }}
                                        className={`
                                            text-sm py-2 px-4 rounded-full border transition
                                            ${(initialListing.type || []).includes(t)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background text-muted-foreground border-border hover:border-primary"
                                            }
                                        `}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </FormField>


                        <Input
                            id="listingPrice"
                            label="Price"
                            variant="horizontal"
                            type="number"
                            formatPrice
                            placeholder="Price"
                            value={Number.isFinite(initialListing.price) ? initialListing.price : ""}
                            onChange={(e) => handleInputChange("price", Number(e.target.value))}
                        />


                        <FormField
                            label="Location"
                            variant="horizontal"
                        >
                            <select
                                className={propertyFieldClassName}
                                value={initialListing.locationValue ?? ""}
                                onChange={(e) => handleInputChange("locationValue", e.target.value)}
                            >
                                <option value="" disabled hidden>Select City</option>
                                {indianCities.map((item: City, index: number) => (
                                    <option key={index} value={item.name}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>


                        <FormField
                            label="Images / Videos"
                            variant="horizontal"
                        >
                            <div className="w-full">
                                <ImageReorderGrid
                                    images={initialListing.imageSrc ?? []}
                                    onReorder={(newOrder) => handleInputChange("imageSrc", newOrder)}
                                    onRemove={removeMedia}
                                />

                                <div className="mt-4">
                                    {(initialListing.imageSrc?.length ?? 0) < 30 && (
                                        <div className="h-32 w-32 inline-block">
                                            <ImageUpload
                                                uid="property-main-upload"
                                                onChange={(value) => handleInputChange("imageSrc", value)}
                                                values={initialListing.imageSrc ?? []}
                                                deferUpload
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FormField>



                        <FormField
                            label="Amenities"
                            variant="horizontal"
                        >
                            <div className="flex w-full">
                                <AmenitiesCheckbox
                                    checked={Array.isArray(initialListing.amenities) ? initialListing.amenities : []}
                                    amenities={amenities}
                                    onChange={handleAmenitiesChange}
                                    customAmenities={initialListing.otherAmenities}
                                />
                            </div>
                        </FormField>


                        <FormField
                            label="Addons"
                            variant="horizontal"
                        >
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
                        </FormField>


                        <FormField
                            label="Packages"
                            variant="horizontal"
                        >
                            <div className="flex flex-col w-full">
                                <PackagesForm
                                    value={initialListing.packages ?? []}
                                    onChange={handlePackagesChange}
                                    availableSets={initialListing.hasSets ? (initialListing.sets ?? []) : []}
                                />
                            </div>
                        </FormField>


                        <Input
                            id="carpetArea"
                            label="Carpet Area"
                            variant="horizontal"
                            type="number"
                            placeholder="Enter the carpet area"
                            value={initialListing.carpetArea ?? ""}
                            onChange={(e) => handleInputChange("carpetArea", e.target.value)}
                        />


                        <FormField
                            label="Operational Days"
                            variant="horizontal"
                        >
                            <div className="flex space-x-2 w-full">
                                <select
                                    className={`${propertyFieldClassName} w-25 text-center px-0`}
                                    value={initialListing.operationalDays?.start ?? "Mon"}
                                    onChange={(e) => handleInputChange("operationalDays.start", e.target.value)}
                                >
                                    {dayOptions.map((d) => (
                                        <option key={`start-${d}`} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                                <span className={propertyFieldSeparatorClassName} aria-hidden="true">-</span>
                                <select
                                    className={`${propertyFieldClassName} w-25 text-center px-0`}
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
                        </FormField>


                        <FormField
                            label="Operational Hours"
                            variant="horizontal"
                        >
                            <div className="flex space-x-2 w-full">
                                <select
                                    className={`${propertyFieldClassName} w-36 text-center px-0`}
                                    value={startTime}
                                    onChange={(e) => onStartChange(e.target.value)}
                                >
                                    <option value="" disabled hidden>Start</option>
                                    {TIME_SLOTS.map((t, idx) => (
                                        <option key={`start-${t}-${idx}`} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>

                                <span className={propertyFieldSeparatorClassName} aria-hidden="true">-</span>

                                <select
                                    className={`${propertyFieldClassName} w-36 text-center px-0`}
                                    value={endTime}
                                    onChange={(e) => onEndChange(e.target.value)}
                                >
                                    <option value="" disabled hidden>End</option>
                                    {endOptions.map((t, idx) => (
                                        <option key={`end-${t}-${idx}`} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </FormField>


                        <Input
                            id="minBookingHours"
                            label="Min. Booking Hours"
                            variant="horizontal"
                            placeholder="Enter the minimum booking hours"
                            value={initialListing.minimumBookingHours ?? ""}
                            onChange={(e) => handleInputChange("minimumBookingHours", e.target.value)}
                        />


                        <Input
                            id="maxPax"
                            label="Max PAX"
                            variant="horizontal"
                            placeholder="Enter the maximum PAX"
                            value={initialListing.maximumPax ?? ""}
                            onChange={(e) => handleInputChange("maximumPax", e.target.value)}
                        />


                        <FormField
                            label="Instant Book"
                            variant="horizontal"
                        >
                            <div className="w-full flex items-center">
                                <Switch
                                    checked={Boolean(initialListing.instantBooking)}
                                    onChange={(checked) => handleInputChange("instantBooking", checked)}
                                    variant="bolt"
                                />
                            </div>
                        </FormField>

                        <hr />


                        <div className="flex flex-col gap-6">
                            <FormField
                                label="Multi-Set Mode"
                                description="Enable multiple bookable sets (studios, rooms, etc.)"
                                variant="horizontal"
                            >
                                <div className="w-full flex items-center">
                                    <Switch
                                        checked={Boolean(initialListing.hasSets)}
                                        onChange={(checked) => handleInputChange("hasSets", checked)}
                                    />
                                </div>
                            </FormField>

                            {initialListing.hasSets && (
                                <div className="flex flex-col gap-6 pl-4">
                                    <FormField
                                        label="Pricing Type"
                                        variant="horizontal"
                                    >
                                        <div className="flex gap-4 w-full">
                                            <button
                                                onClick={() => handleInputChange("additionalSetPricingType", "FIXED")}
                                                className={`flex-1 py-2 px-4 rounded-lg border transition ${initialListing.additionalSetPricingType === "FIXED" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary"}`}
                                            >
                                                Fixed Add-on
                                            </button>
                                            <button
                                                onClick={() => handleInputChange("additionalSetPricingType", "HOURLY")}
                                                className={`flex-1 py-2 px-4 rounded-lg border transition ${initialListing.additionalSetPricingType === "HOURLY" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary"}`}
                                            >
                                                Hourly Add-on
                                            </button>
                                        </div>
                                    </FormField>



                                    <FormField
                                        label="Will all sets have the same price?"
                                        variant="horizontal"
                                    >
                                        <div className="flex gap-4 w-full">
                                            <label
                                                className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === true
                                                    ? "border-primary bg-muted ring-1 ring-primary"
                                                    : "border-border hover:border-border/80"
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
                                                    ? "border-primary bg-muted ring-1 ring-primary"
                                                    : "border-border hover:border-border/80"
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
                                    </FormField>

                                    <FormField
                                        label="Manage Sets"
                                        variant="horizontal"
                                    >
                                        <SetsEditor
                                            sets={initialListing.sets ?? []}
                                            onChange={(updated) => handleInputChange("sets", updated)}
                                            pricingType={initialListing.additionalSetPricingType || null}
                                            isPricingUniform={setsHaveSamePrice ?? undefined}
                                            uniformPrice={unifiedSetPrice}
                                            onUniformPriceChange={setUnifiedSetPrice}
                                        />
                                    </FormField>

                                </div>
                            )}
                        </div>

                        <div className="col-span-3 pt-5 flex justify-end">
                            <button
                                type="button"
                                className="inline-flex py-2 px-6 border border-transparent  text-sm font-medium rounded-lg hover:opacity-85 text-primary-foreground bg-primary"
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
                                    className="bg-primary text-primary-foreground px-15 h-fit py-2 rounded-lg hover:opacity-90 flex gap-4 justify-center items-center"
                                    onClick={() => signIn("google-calendar")}
                                >
                                    <Image
                                        src="/images/icons/google_calendar.png"
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


                    <div className={selectedMenu === "Settings" ? "flex flex-col gap-5 sm:gap-8 min-h-150" : "hidden"}>
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
                                    onClick={() => setIsDeleteModalOpen(true)}
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
                </div >
            </div >
            <DeletePropertyModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteProperty}
                propertyName={initialListing.title || ""}
                isLoading={isDeleting}
            />
        </SessionProvider >
    );
};

export default PropertyClient;
