import { ListingCardData } from "@/components/listing/ListingCard";
import { SafeReservation } from "@/types/reservation";

/**
 * Normalizes images from various data sources.
 */
export const normalizeImages = (raw: string | string[] | undefined | null): string[] => {
    if (Array.isArray(raw)) return raw.length > 0 ? raw.slice(0, 5) : ["/assets/listing-image-default.png"];
    if (typeof raw === "string") return [raw];
    return ["/assets/listing-image-default.png"];
};

/**
 * Formats price to Indian Rupee (INR).
 */
export const formatPrice = (price: number | string | undefined, reservation?: SafeReservation): number => {
    if (reservation) return reservation.totalPrice;
    const p = typeof price === "number" ? price : Number(String(price || 0).replace(/[^\d]/g, ""));
    return isNaN(p) ? 0 : p;
};

/**
 * Gets location label based on available data.
 */
export const getLocationLabel = (
    data: ListingCardData | undefined,
    getByValue: (value: string) => { label: string } | undefined
): string => {
    if (data?.locationValue) return getByValue(data.locationValue)?.label || "Unknown Location";
    if (data?.area) return `${data.area}, ${data.city}`;
    return data?.city || "Location Pending";
};

/**
 * Normalizes title based on available data.
 */
export const getDisplayTitle = (data: ListingCardData | undefined): string => {
    return data?.title || data?.name || "Untitled Space";
};

/**
 * Generates the correct href for a listing card.
 */
export const getListingHref = (
    data: ListingCardData | undefined,
    onEdit?: (id: string) => void
): string => {
    if (data?.href) return data.href;
    if (onEdit) return `/dashboard/properties/${data?.id}`;
    return `/listings/${data?.slug || data?.id}`;
};
