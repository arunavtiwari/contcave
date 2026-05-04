"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { updateListingAction } from "@/app/actions/listingActions";
import { uploadToR2 } from "@/lib/storage/upload";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";
import { Package as ListingPackage } from "@/types/package";

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
      const finalImageSrc = initialListing.imageSrc && initialListing.imageSrc.length > 0
        ? await uploadToR2(initialListing.imageSrc, "listing_main")
        : [];

      const finalSets = initialListing.hasSets ? await Promise.all(
        (initialListing.sets ?? []).map(async (s, i) => ({
          ...s,
          images: s.images && s.images.length > 0
            ? await uploadToR2(s.images, "listing_sets")
            : [],
          position: i,
        }))
      ) : [];

      const { id: _ignoredId, user: _ignoredUser, createdAt: _ignoredCreatedAt, ...payload } = initialListing;

      const res = await updateListingAction({
        id: initialListing.id,
        ...payload,
        imageSrc: finalImageSrc,
        sets: finalSets,
        setsHaveSamePrice,
        unifiedSetPrice,
      });

      if (res.error) throw new Error(res.error);
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
