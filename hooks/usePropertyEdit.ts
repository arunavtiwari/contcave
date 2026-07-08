"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { updateListingAction } from "@/app/actions/listingActions";
import { uploadListingMedia } from "@/lib/listing/mediaUpload";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";
import { Package as ListingPackage } from "@/types/package";

function normalizeListingForEdit(listing: FullListing): FullListing {
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
    addons: (listing.addons ?? []).map((addon) => ({
      ...addon,
      imageUrl: addon.imageUrl ?? "",
    })),
    imageSrc: cleanImageSrc,
    sets: cleanSets,
    type: Array.isArray(listing.type) ? listing.type : [],
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    otherAmenities: Array.isArray(listing.otherAmenities) ? listing.otherAmenities : [],
    videoSrc: listing.videoSrc ?? null,
  };
}

function toComparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toComparable);
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, entryValue]) => typeof entryValue !== "undefined")
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
        acc[key] = toComparable(entryValue);
        return acc;
      }, {});
  }
  return value ?? null;
}

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(toComparable(a)) === JSON.stringify(toComparable(b));
}

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

export function usePropertyEdit(listing: FullListing, predefinedAddons: Addon[]) {
  const router = useRouter();
  const originalListingRef = useRef<FullListing>(normalizeListingForEdit(listing));
  const [initialListing, setListing] = useState<FullListing>(() => normalizeListingForEdit(listing));

  const [addons, setAddons] = useState<Addon[]>(predefinedAddons);
  const [setsHaveSamePrice, setSetsHaveSamePrice] = useState<boolean | null>(initialListing.setsHaveSamePrice ?? null);
  const [unifiedSetPrice, setUnifiedSetPrice] = useState<number | null>(initialListing.unifiedSetPrice ?? null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleInputChange = useCallback((field: string, value: unknown) => {
    setListing((prev) => setDeep(prev, field, value));
  }, []);

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
    const media = Array.isArray(initialListing.imageSrc) ? initialListing.imageSrc : [];
    const updated = media.filter((_, index) => index !== indexToRemove);
    handleInputChange("imageSrc", updated);
  };

  const update = async () => {
    setIsUpdating(true);
    try {
      const mediaResults = await uploadListingMedia(initialListing.id, {
        imageSrc: initialListing.imageSrc,
        videoSrc: initialListing.videoSrc,
        sets: initialListing.hasSets ? initialListing.sets : [],
        addons: initialListing.addons,
        createMissingSetIds: false,
        createMissingAddonIds: false,
      });

      const payload: Record<string, unknown> = {};
      const originalListing = originalListingRef.current;
      const addIfChanged = (key: keyof FullListing | "setsHaveSamePrice" | "unifiedSetPrice", value: unknown, originalValue: unknown) => {
        if (!isEqual(value, originalValue)) payload[key] = value;
      };

      addIfChanged("listingType", initialListing.listingType, originalListing.listingType);
      addIfChanged("title", initialListing.title, originalListing.title);
      addIfChanged("slug", initialListing.slug, originalListing.slug);
      addIfChanged("description", initialListing.description, originalListing.description);
      addIfChanged("customTerms", initialListing.customTerms, originalListing.customTerms);
      addIfChanged("category", initialListing.category, originalListing.category);
      addIfChanged("locationValue", initialListing.locationValue, originalListing.locationValue);
      addIfChanged("actualLocation", initialListing.actualLocation, originalListing.actualLocation);
      addIfChanged("propertyStateCode", initialListing.propertyStateCode, originalListing.propertyStateCode);
      addIfChanged("price", initialListing.price, originalListing.price);
      addIfChanged("priceRangeMin", initialListing.priceRangeMin, originalListing.priceRangeMin);
      addIfChanged("priceRangeMax", initialListing.priceRangeMax, originalListing.priceRangeMax);
      addIfChanged("mapsUrl", initialListing.mapsUrl, originalListing.mapsUrl);
      addIfChanged("websiteUrl", initialListing.websiteUrl, originalListing.websiteUrl);
      addIfChanged("instagramHandle", initialListing.instagramHandle, originalListing.instagramHandle);
      addIfChanged("contactEmail", initialListing.contactEmail, originalListing.contactEmail);
      addIfChanged("amenities", initialListing.amenities, originalListing.amenities);
      addIfChanged("otherAmenities", initialListing.otherAmenities, originalListing.otherAmenities);
      addIfChanged("type", initialListing.type, originalListing.type);
      addIfChanged("venueTypes", initialListing.venueTypes, originalListing.venueTypes);
      addIfChanged("aesthetics", initialListing.aesthetics, originalListing.aesthetics);
      addIfChanged("setFeatures", initialListing.setFeatures, originalListing.setFeatures);
      addIfChanged("carpetArea", initialListing.carpetArea, originalListing.carpetArea);
      addIfChanged("minimumBookingHours", initialListing.minimumBookingHours, originalListing.minimumBookingHours);
      addIfChanged("maximumPax", initialListing.maximumPax, originalListing.maximumPax);
      addIfChanged("instantBooking", initialListing.instantBooking, originalListing.instantBooking);
      addIfChanged("operationalDays", initialListing.operationalDays, originalListing.operationalDays);
      addIfChanged("operationalHours", initialListing.operationalHours, originalListing.operationalHours);
      addIfChanged("hasSets", initialListing.hasSets, originalListing.hasSets);
      addIfChanged("setsHaveSamePrice", setsHaveSamePrice, originalListing.setsHaveSamePrice);
      addIfChanged("unifiedSetPrice", unifiedSetPrice, originalListing.unifiedSetPrice);
      addIfChanged("additionalSetPricingType", initialListing.additionalSetPricingType, originalListing.additionalSetPricingType);
      addIfChanged("imageSrc", mediaResults.imageSrc, originalListing.imageSrc);
      addIfChanged("videoSrc", mediaResults.videoSrc, originalListing.videoSrc);
      addIfChanged("addons", mediaResults.addons, originalListing.addons);
      addIfChanged("packages", initialListing.packages ?? [], originalListing.packages ?? []);
      addIfChanged("sets", initialListing.hasSets ? mediaResults.sets : [], originalListing.hasSets ? originalListing.sets ?? [] : []);

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        return;
      }

      const res = await updateListingAction({
        id: initialListing.id,
        ...payload,
      });

      if (res.error) throw new Error(res.error);
      if (!res.data) throw new Error("Listing update failed");

      const savedListing = normalizeListingForEdit(res.data);
      originalListingRef.current = savedListing;
      setListing(savedListing);
      setSetsHaveSamePrice(savedListing.setsHaveSamePrice ?? null);
      setUnifiedSetPrice(savedListing.unifiedSetPrice ?? null);

      toast.success("Property updated successfully");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update property");
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    initialListing,
    addons,
    setAddons,
    setsHaveSamePrice,
    setSetsHaveSamePrice,
    unifiedSetPrice,
    setUnifiedSetPrice,
    isUpdating,
    handleInputChange,
    handleAmenitiesChange,
    handleAddonChange,
    handlePackagesChange,
    removeMedia,
    update,
  };
}
