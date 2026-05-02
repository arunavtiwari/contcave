"use client";

import { Amenities } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SessionProvider, signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { TbVideoPlus } from "react-icons/tb";
import { toast } from "sonner";

import { deleteListingAction, updateListingAction } from "@/app/actions/listingActions";
import BlocksManager from "@/components/BlocksManager";
import Calendar from "@/components/Calendar";
import AddonsSelection from "@/components/inputs/AddonsSelection";
import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import AutoComplete, { AutoCompleteValue } from "@/components/inputs/AutoComplete";
import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import ImageReorderGrid from "@/components/inputs/ImageReorderGrid";
import ImageUpload from "@/components/inputs/ImageUpload";
import PackagesForm from "@/components/inputs/PackagesForm";
import SetsEditor from "@/components/inputs/SetsEditor";
import Switch from "@/components/inputs/Switch";
import ManageTimings from "@/components/ManageTimings";
import CustomAddonModal from "@/components/modals/CustomAddonModal";
import DeletePropertyModal from "@/components/modals/DeletePropertyModal";
import { categories as CATEGORY_OPTIONS } from "@/components/navbar/Categories";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { spaceTypes } from "@/constants/spaceTypes";
import { uploadToR2 } from "@/lib/storage/upload";
import { slugify } from "@/lib/strings";
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
import FormField from "@/components/inputs/FormField";
import Input from "@/components/inputs/Input";
import RichTextEditor from "@/components/inputs/RichTextEditor";
import Select, { SelectOption } from "@/components/ui/Select";
import { TIME_SLOTS } from "@/constants/timeSlots";

const categoryOptionsPrepared: SelectOption[] = CATEGORY_OPTIONS.map((c) => ({ ...c, value: c.label }));
const dayOptionsPrepared: SelectOption[] = dayOptions.map((d) => ({ value: d, label: d }));
const timeOptionsPrepared: SelectOption[] = TIME_SLOTS.map((t) => ({ value: t, label: t }));
const endOptionsPrepared = (startIdx: number): SelectOption[] => {
    if (startIdx === -1) return timeOptionsPrepared.slice(1);
    return timeOptionsPrepared.slice(startIdx + 1);
};


const propertyFieldSeparatorClassName =
    "flex items-center justify-center self-stretch px-1 text-sm font-medium leading-none text-muted-foreground";

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const [selectedMenu] = useState("Edit Property");
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
            videoSrc: listing.videoSrc ?? null,
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
            const res = await deleteListingAction(initialListing.id);
            if (res.error) throw new Error(res.error);
            toast.info("Property deleted successfully", { id: "Listing_Deleted" });
            router.push("/dashboard/properties");
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
            isActive: pkg.isActive ?? true,
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
                videoSrc: initialListing.videoSrc,
            };

            const res = await updateListingAction({ id: initialListing.id, ...payload });
            if (res.error) throw new Error(res.error);
            toast.info("Listing has been successfully updated", { id: "Listing_Updated" });
            router.refresh();
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Update failed";
            toast.error(msg);
        }
    };

    const handleInputChange = useCallback((field: string, value: unknown) => {
        setListing((prev: FullListing) => {
            let updated = prev;
            if (field === "locationValue" || field === "actualLocation") {
                updated = { ...prev, [field]: value };
            } else {
                updated = setDeep(prev, field, value);
            }

            if (field === "title") {
                const newTitle = value as string;
                const currentSlug = prev.slug;
                const expectedSlugFromOldTitle = slugify(prev.title || "");
                
                if (!currentSlug || currentSlug === expectedSlugFromOldTitle) {
                    updated = { ...updated, slug: slugify(newTitle) };
                }
            }

            return updated;
        });
    }, []);

    const minSetPrice = useMemo(() => {
        return initialListing.sets?.[0]?.price || 0;
    }, [initialListing.sets]);

    useEffect(() => {
        if (setsHaveSamePrice && initialListing.sets && initialListing.sets.length > 0) {
            const newPrice = unifiedSetPrice !== null ? unifiedSetPrice : minSetPrice;
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
    const _calculatedEndOptions = useMemo(() => {
        if (startIdx === -1) return TIME_SLOTS;
        const _endOptions = TIME_SLOTS.slice(startIdx + 1);
        return _endOptions;
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
            <div className="flex flex-col w-full gap-5">

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

                    <Input
                        id="listingSlug"
                        label="URL Slug"
                        variant="horizontal"
                        placeholder="Enter custom URL slug"
                        value={initialListing.slug ?? ""}
                        onChange={(e) => handleInputChange("slug", slugify(e.target.value))}
                        customLeftContent="contcave.com/listing/"
                    />


                    <RichTextEditor
                        label="Description"
                        variant="horizontal"
                        value={initialListing.description || ""}
                        onChange={(html) => handleInputChange("description", html)}
                    />

                    <RichTextEditor
                        label="Terms & Conditions by Host"
                        variant="horizontal"
                        value={initialListing.customTerms ?? ""}
                        onChange={(html) => handleInputChange("customTerms", html)}
                    />


                    <Select
                        label="Category"
                        variant="horizontal"
                        options={categoryOptionsPrepared}
                        value={categoryOptionsPrepared.find((item) => item.label === initialListing.category) || null}
                        onChange={(sel) => {
                            const selected = sel as SelectOption | null;
                            handleInputChange("category", selected?.value || "");
                        }}
                        placeholder="Select Category"
                    />


                    <FormField
                        label="Listed Services"
                        description="Select all services available in this space"
                        variant="horizontal"
                        align="start"
                    >
                        <div className="w-full flex flex-wrap gap-2">
                            {Array.from(new Set([...spaceTypes, ...(initialListing.type || [])])).map((t) => (
                                <Pill
                                    key={t}
                                    label={t}
                                    onClick={() => {
                                        const currentType = initialListing.type || [];
                                        const exists = currentType.includes(t);
                                        const newType = exists
                                            ? currentType.filter((x) => x !== t)
                                            : [...currentType, t];
                                        handleInputChange("type", newType);
                                    }}
                                    variant={(initialListing.type || []).includes(t) ? "solid" : "secondary"}
                                />
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
                        onNumberChange={(val) => handleInputChange("price", val)}
                    />

                    <CitySelect
                        label="City"
                        variant="horizontal"
                        value={initialListing.actualLocation as CitySelectValue | undefined}
                        locationValue={initialListing.locationValue}
                        onChange={(v: CitySelectValue) => {
                            handleInputChange("actualLocation", {
                                ...(initialListing.actualLocation || {}),
                                ...v,
                            });
                            handleInputChange("locationValue", v.value || "");
                        }}
                    />

                    <AutoComplete
                        label="Detailed address"
                        variant="horizontal"
                        value={initialListing.actualLocation?.display_name || ""}
                        onChange={(sel: AutoCompleteValue) => {
                            handleInputChange("actualLocation", {
                                ...(initialListing.actualLocation || {}),
                                display_name: sel.display_name,
                                latlng: sel.latlng,
                                address: sel.display_name,
                                lat: sel.latlng[0],
                                lng: sel.latlng[1],
                            });
                        }}
                        placeholder="Search for space address..."
                    />


                    <FormField
                        label="Images"
                        description="(Max 30)"
                        variant="horizontal"
                        align="start"
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
                        label="Video tour (Optional)"
                        variant="horizontal"
                        align="start"
                    >
                        <div className="w-full">
                            <ImageUpload
                                uid="property-video-upload"
                                uploadLabel="Upload Video Tour"
                                onChange={(v) => handleInputChange("videoSrc", v[0] || null)}
                                values={initialListing.videoSrc ? [initialListing.videoSrc] : []}
                                allowedTypes={["video/mp4", "video/webm", "video/quicktime"]}
                                maxSize={100 * 1024 * 1024}
                                icon={TbVideoPlus}
                                className="w-full h-48 p-4 border border-border rounded-xl"
                            />
                            {initialListing.videoSrc && (
                                <div className="mt-4 relative group w-full max-w-md">
                                    <video
                                        src={initialListing.videoSrc}
                                        controls
                                        className="w-full h-48 rounded-xl object-cover border border-border"
                                    />
                                    <button
                                        onClick={() => handleInputChange("videoSrc", null)}
                                        className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
                                    >
                                        <IoMdClose size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </FormField>



                    <AmenitiesCheckbox
                        label="Amenities"
                        variant="horizontal"
                        checked={Array.isArray(initialListing.amenities) ? initialListing.amenities : []}
                        amenities={amenities}
                        onChange={handleAmenitiesChange}
                        customAmenities={initialListing.otherAmenities}
                    />

                    <AddonsSelection
                        label="Addons"
                        variant="horizontal"
                        initialSelectedAddons={initialListing.addons}
                        addons={addons}
                        onSelectedAddonsChange={handleAddonChange}
                    />
                    <div className="flex justify-end -mt-8">
                        <CustomAddonModal
                            save={(value) => {
                                const updated = [...addons, { ...value, price: 0, qty: 0, imageUrl: value.imageUrl ?? "" }];
                                setAddons(updated);
                            }}
                        />
                    </div>


                    <PackagesForm
                        label="Packages"
                        variant="horizontal"
                        value={initialListing.packages ?? []}
                        onChange={handlePackagesChange}
                        availableSets={initialListing.hasSets ? (initialListing.sets ?? []) : []}
                    />


                    <Input
                        id="carpetArea"
                        label="Carpet Area (sq ft)"
                        variant="horizontal"
                        type="number"
                        placeholder="Enter the carpet area"
                        value={initialListing.carpetArea ?? 0}
                        onNumberChange={(val) => handleInputChange("carpetArea", val)}
                    />


                    <FormField
                        label="Operational Days"
                        variant="horizontal"
                    >
                        <div className="flex items-center gap-3 w-full">
                            <Select
                                className="flex-1"
                                options={dayOptionsPrepared}
                                value={dayOptionsPrepared.find(d => d.value === (initialListing.operationalDays?.start ?? "Mon"))}
                                onChange={(sel) => {
                                    const selected = sel as SelectOption | null;
                                    handleInputChange("operationalDays.start", selected?.value || "Mon");
                                }}
                            />
                            <span className={propertyFieldSeparatorClassName} aria-hidden="true">-</span>
                            <Select
                                className="flex-1"
                                options={dayOptionsPrepared}
                                value={dayOptionsPrepared.find(d => d.value === (initialListing.operationalDays?.end ?? "Sun"))}
                                onChange={(sel) => {
                                    const selected = sel as SelectOption | null;
                                    handleInputChange("operationalDays.end", selected?.value || "Sun");
                                }}
                            />
                        </div>
                    </FormField>


                    <FormField
                        label="Operational Hours"
                        variant="horizontal"
                    >
                        <div className="flex items-center gap-3 w-full">
                            <Select
                                className="flex-1"
                                placeholder="Start"
                                options={timeOptionsPrepared}
                                value={timeOptionsPrepared.find(t => t.value === startTime) || null}
                                onChange={(sel) => {
                                    const selected = sel as SelectOption | null;
                                    onStartChange(selected?.value || "");
                                }}
                            />

                            <span className={propertyFieldSeparatorClassName} aria-hidden="true">-</span>

                            <Select
                                className="flex-1"
                                placeholder="End"
                                options={endOptionsPrepared(TIME_SLOTS.indexOf(startTime))}
                                value={timeOptionsPrepared.find(t => t.value === endTime) || null}
                                onChange={(sel) => {
                                    const selected = sel as SelectOption | null;
                                    onEndChange(selected?.value || "");
                                }}
                            />
                        </div>
                    </FormField>


                    <Input
                        id="minBookingHours"
                        label="Minimum Booking Hours"
                        variant="horizontal"
                        type="number"
                        placeholder="Enter the minimum booking hours"
                        value={initialListing.minimumBookingHours ?? 0}
                        onNumberChange={(val) => handleInputChange("minimumBookingHours", val)}
                    />


                    <Input
                        id="maxPax"
                        label="Max PAX"
                        variant="horizontal"
                        type="number"
                        placeholder="Enter the maximum PAX"
                        value={initialListing.maximumPax ?? 0}
                        onNumberChange={(val) => handleInputChange("maximumPax", val)}
                    />


                    <FormField
                        label="Instant Book"
                        variant="horizontal"
                    >
                        <div className="w-full flex items-center">
                            <Switch
                                checked={Boolean(initialListing.instantBooking)}
                                onChange={(checked) => handleInputChange("instantBooking", checked)}
                                styleVariant="bolt"
                                variant="horizontal"
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
                                        <Button
                                            onClick={() => handleInputChange("additionalSetPricingType", "FIXED")}
                                            variant={initialListing.additionalSetPricingType === "FIXED" ? "default" : "outline"}
                                            label="Fixed Add-on"
                                            fit
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={() => handleInputChange("additionalSetPricingType", "HOURLY")}
                                            variant={initialListing.additionalSetPricingType === "HOURLY" ? "default" : "outline"}
                                            label="Hourly Add-on"
                                            fit
                                            className="flex-1"
                                        />
                                    </div>
                                </FormField>



                                <FormField
                                    label="Will all sets have the same price?"
                                    variant="horizontal"
                                >
                                    <div className="flex gap-4 w-full">
                                        <label
                                            className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === true
                                                ? "border-foreground bg-muted ring-1 ring-foreground/10"
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
                                                ? "border-foreground bg-muted ring-1 ring-foreground/10"
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

                                <SetsEditor
                                    label="Manage Sets"
                                    variant="horizontal"
                                    sets={initialListing.sets ?? []}
                                    onChange={(updated) => handleInputChange("sets", updated)}
                                    pricingType={initialListing.additionalSetPricingType || null}
                                    isPricingUniform={setsHaveSamePrice ?? undefined}
                                    uniformPrice={unifiedSetPrice}
                                    onUniformPriceChange={setUnifiedSetPrice}
                                />

                            </div>
                        )}
                    </div>

                    <div className="col-span-3 pt-5 flex justify-end">
                        <Button
                            label="Save"
                            onClick={update}
                            fit
                            className="px-8"
                        />
                    </div>
                </div>


                <div className={selectedMenu === "Sync Calendar" ? "flex flex-col gap-5 sm:gap-8 items-center" : "hidden"}>
                    <div className="flex justify-between w-full items-center">
                        <Heading
                            title="Connect Your Google Calendar"
                            subtitle="Sync offline and ContCave bookings to keep your availability up to date—automatically"
                        />
                        {!isCalendarConnected && (
                            <Button
                                onClick={() => signIn("google-calendar")}
                                fit
                                className="px-15 h-fit py-2"
                            >
                                <div className="flex gap-4 items-center">
                                    <Image
                                        src="/images/icons/google_calendar.png"
                                        alt="Google Calendar"
                                        width={30}
                                        height={30}
                                        className="bg-background rounded-xl"
                                    />
                                    Sync Google Calendar
                                </div>
                            </Button>
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

                    <div className="flex flex-col gap-4 p-6 border-2 border-destructive/20 rounded-xl bg-destructive/10">
                        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Warning:</span> Deleting your property will permanently remove all your
                            data and cannot be undone. This action is irreversible.
                        </p>
                        <div className="w-fit">
                            <Button
                                label="DELETE PROPERTY"
                                onClick={() => setIsDeleteModalOpen(true)}
                                outline
                                rounded
                                className="px-6 border-2 border-destructive text-destructive hover:bg-destructive hover:text-background"
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
            <DeletePropertyModal
                isOpen={isDeleteModalOpen}
                onCloseAction={() => setIsDeleteModalOpen(false)}
                onConfirmAction={handleDeleteProperty}
                propertyName={initialListing.title || ""}
                isLoading={isDeleting}
            />
        </SessionProvider >
    );
};

export default PropertyClient;



