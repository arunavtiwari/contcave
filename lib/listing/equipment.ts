import type { Addon } from "@/types/addon";

/*
 * Structured equipment and access for a listing.
 *
 * Null always means "unknown" and is hidden in the UI; it is never shown as "none" or "no".
 * That rule is what lets live listings be backfilled one at a time: a listing with no data
 * renders exactly as it did before these fields existed.
 */

export const EQUIPMENT_POLICIES = ["all_bookings", "packages_only", "none"] as const;
export type EquipmentPolicy = (typeof EQUIPMENT_POLICIES)[number];

export const EQUIPMENT_CATEGORIES = [
    "lighting",
    "modifiers",
    "backdrops",
    "grip",
    "audio",
    "camera",
    "props",
    "crew",
    "other",
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
    lighting: "Lighting",
    modifiers: "Modifiers",
    backdrops: "Backdrops",
    grip: "Grip & stands",
    audio: "Audio",
    camera: "Camera",
    props: "Props",
    crew: "Crew",
    other: "Other",
};

export const EQUIPMENT_PRICING = ["included", "paid", "on_request"] as const;
export type EquipmentPricing = (typeof EQUIPMENT_PRICING)[number];

export const EQUIPMENT_PRICE_UNITS = ["per_booking", "per_hour"] as const;
export type EquipmentPriceUnit = (typeof EQUIPMENT_PRICE_UNITS)[number];

export const LIFT_TYPES = ["none", "passenger", "goods"] as const;
export type LiftType = (typeof LIFT_TYPES)[number];

export const PARKING_TYPES = ["free_onsite", "paid_onsite", "street", "none"] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export const PARKING_LABELS: Record<ParkingType, string> = {
    free_onsite: "Free parking on site",
    paid_onsite: "Paid parking on site",
    street: "Street parking",
    none: "No parking",
};

export const DETAILS_STATUSES = ["missing", "extracted", "confirmed"] as const;
export type DetailsStatusValue = (typeof DETAILS_STATUSES)[number];

export type EquipmentItem = {
    id: string;
    name: string;
    category: string;
    quantity: number;
    pricing: string;
    price?: number | null;
    priceUnit?: string | null;
    availableQty?: number | null;
    image?: string | null;
    legacyAddonId?: string | null;
    sortOrder: number;
};

export type ListingAccess = {
    floor?: number | null;
    lift?: string | null;
    parking?: string | null;
    vehicleLoadIn?: boolean | null;
    loadInNote?: string | null;
};

export type ListingDetailsStatus = {
    equipment?: string | null;
    access?: string | null;
    confirmedAt?: Date | string | null;
    confirmedBy?: string | null;
};

export type PackageEquipmentRef = { equipmentId: string; quantity: number };

export type EquipmentFields = {
    equipmentPolicy?: string | null;
    equipment?: EquipmentItem[] | null;
    access?: ListingAccess | null;
    detailsStatus?: ListingDetailsStatus | null;
    listingType?: string | null;
};

const isCategory = (value: string): value is EquipmentCategory =>
    (EQUIPMENT_CATEGORIES as readonly string[]).includes(value);

export const categoryOf = (item: Pick<EquipmentItem, "category">): EquipmentCategory =>
    isCategory(item.category) ? item.category : "other";

export const isPolicy = (value: string | null | undefined): value is EquipmentPolicy =>
    !!value && (EQUIPMENT_POLICIES as readonly string[]).includes(value);

/**
 * Whether a viewer should see a block. Public visitors only see confirmed data; extracted
 * (machine-proposed) data stays visible to the owner and admins until someone confirms it.
 */
export function detailsVisible(
    status: string | null | undefined,
    viewer: { isOwnerOrAdmin: boolean }
): boolean {
    if (status === "confirmed") return true;
    return viewer.isOwnerOrAdmin && status === "extracted";
}

/** Equipment the page should render, or null when there is nothing (known) to show. */
export function visibleEquipment(listing: EquipmentFields, viewer: { isOwnerOrAdmin: boolean }) {
    if (!detailsVisible(listing.detailsStatus?.equipment, viewer)) return null;
    const items = [...(listing.equipment ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const policy = isPolicy(listing.equipmentPolicy) ? listing.equipmentPolicy : null;
    // Nothing listed means nothing to show, whatever the policy says.
    if (items.length === 0) return null;
    return { policy, items };
}

export function visibleAccess(listing: EquipmentFields, viewer: { isOwnerOrAdmin: boolean }): ListingAccess | null {
    if (!detailsVisible(listing.detailsStatus?.access, viewer)) return null;
    const access = listing.access;
    if (!access) return null;
    const hasAny = access.floor != null || !!access.lift || !!access.parking
        || access.vehicleLoadIn != null || !!access.loadInNote?.trim();
    return hasAny ? access : null;
}

export const includedLightingUnits = (items: EquipmentItem[]) =>
    items
        .filter((item) => item.pricing === "included" && categoryOf(item) === "lighting")
        .reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0);

export type LightingTier = "pro" | "basic" | null;

/** Calculated, never stored: 4+ included lighting units is a pro kit, 1–3 a basic kit. */
export function lightingTier(items: EquipmentItem[]): LightingTier {
    const units = includedLightingUnits(items);
    if (units >= 4) return "pro";
    if (units >= 1) return "basic";
    return null;
}

export const LIGHTING_TIER_LABELS: Record<Exclude<LightingTier, null>, string> = {
    pro: "Pro equipment included",
    basic: "Lighting kit included",
};

const ordinal = (n: number) => {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
};

export function floorLabel(floor: number): string {
    if (floor === 0) return "Ground floor";
    if (floor < 0) return floor === -1 ? "Basement" : `Basement ${Math.abs(floor)}`;
    return `${ordinal(floor)} floor`;
}

/** Quick-facts chip for floor and lift, or null when the floor is unknown. */
export function floorChip(access: ListingAccess | null): { label: string; warning: boolean } | null {
    if (!access || access.floor == null) return null;
    const base = floorLabel(access.floor);
    if (access.floor === 0) {
        return { label: access.vehicleLoadIn ? `${base} · drive-up load-in` : base, warning: false };
    }
    if (access.lift === "goods") return { label: `${base} · goods lift`, warning: false };
    if (access.lift === "passenger") return { label: `${base} · passenger lift`, warning: false };
    if (access.lift === "none") return { label: `${base} · no lift`, warning: true };
    return { label: base, warning: false };
}

export const EQUIPMENT_POLICY_COPY: Record<EquipmentPolicy, string> = {
    all_bookings: "Included with every booking, hourly or package.",
    packages_only: "Included equipment comes with packages only. Hourly bookings can add gear below.",
    none: "No equipment provided. Bring your own or add from the list below.",
};

export function equipmentCountSummary(items: EquipmentItem[]): string {
    const included = items.filter((item) => item.pricing === "included").length;
    const paid = items.filter((item) => item.pricing === "paid").length;
    const onRequest = items.filter((item) => item.pricing === "on_request").length;
    return [
        included ? `${included} included` : null,
        paid ? `${paid} paid` : null,
        onRequest ? `${onRequest} on request` : null,
    ].filter(Boolean).join(" · ");
}

/** Groups items by category in a fixed order; included items first within each group. */
export function groupEquipment(items: EquipmentItem[]) {
    const rank = (item: EquipmentItem) => (item.pricing === "included" ? 0 : item.pricing === "paid" ? 1 : 2);
    return EQUIPMENT_CATEGORIES
        .map((category) => ({
            category,
            items: items
                .filter((item) => categoryOf(item) === category)
                .sort((a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder),
        }))
        .filter((group) => group.items.length > 0);
}

export const equipmentAnchorId = (equipmentId: string) => `equipment-item-${equipmentId}`;

/** Window event a package chip fires so the (collapsible) Equipment section opens and shows the item. */
export const EQUIPMENT_REVEAL_EVENT = "contcave:equipment-reveal";

/**
 * The add-on id a paid item books under. Migrated items keep their original add-on id, so
 * bookings, invoices and payouts that stored the old id keep resolving.
 */
export const addonIdFor = (item: Pick<EquipmentItem, "id" | "legacyAddonId">) => item.legacyAddonId || item.id;

/** Paid, per-booking equipment in the add-on shape the booking flow already understands. */
export function paidEquipmentAsAddons(items: EquipmentItem[] | null | undefined): Addon[] {
    return (items ?? [])
        .filter((item) => item.pricing === "paid" && item.price != null && item.priceUnit !== "per_hour")
        .map((item) => ({
            id: addonIdFor(item),
            name: item.name,
            price: item.price ?? 0,
            imageUrl: item.image ?? "",
            qty: item.availableQty ?? (undefined as unknown as number),
        }));
}

/**
 * Add-ons a booking may select: the listing's add-ons plus paid equipment that isn't a
 * migrated copy of one of them (matched by id, so the price stays single-sourced).
 */
export function bookableAddons<T extends { id?: string | null }>(
    legacyAddons: T[],
    equipment: EquipmentItem[] | null | undefined
): Array<T | Addon> {
    const equipmentAddons = paidEquipmentAsAddons(equipment);
    const fromEquipment = new Map(equipmentAddons.map((addon) => [addon.id, addon]));
    const merged: Array<T | Addon> = legacyAddons.map((addon) => (addon.id && fromEquipment.get(addon.id)) || addon);
    const legacyIds = new Set(legacyAddons.map((addon) => addon.id).filter(Boolean));
    for (const addon of equipmentAddons) {
        if (!legacyIds.has(addon.id)) merged.push(addon);
    }
    return merged;
}

/**
 * Card and filter discovery features stay off until enough live listings are backfilled
 * (the rollout target is 70% with confirmed data). Flip NEXT_PUBLIC_EQUIPMENT_DISCOVERY to enable.
 */
export const EQUIPMENT_DISCOVERY_ENABLED = process.env.NEXT_PUBLIC_EQUIPMENT_DISCOVERY === "true";

/** Card chip rule: confirmed equipment, included with every booking, with at least one light. */
export function hasLightsIncluded(listing: EquipmentFields): boolean {
    if (!EQUIPMENT_DISCOVERY_ENABLED) return false;
    if (listing.detailsStatus?.equipment !== "confirmed" || listing.equipmentPolicy !== "all_bookings") return false;
    return includedLightingUnits(listing.equipment ?? []) > 0;
}

/** Short chip text for a package's included equipment, e.g. "3 lights". */
export function packageEquipmentChip(item: EquipmentItem, quantity: number): string {
    return quantity > 1 ? `${quantity} × ${item.name}` : item.name;
}

/** "Lighting kit (3 lights)" style summary for the booking breakdown. */
export function includedEquipmentSummary(items: EquipmentItem[]): string | null {
    const included = items.filter((item) => item.pricing === "included");
    if (included.length === 0) return null;
    const lights = includedLightingUnits(included);
    const others = included.filter((item) => categoryOf(item) !== "lighting").length;
    const parts = [
        lights ? `Lighting kit (${lights} ${lights === 1 ? "light" : "lights"})` : null,
        others ? `${others} other ${others === 1 ? "item" : "items"}` : null,
    ].filter(Boolean);
    return parts.join(", ");
}

/** Server-side tidy-up before saving: price only on paid items, stable sort order. */
export function normalizeEquipmentInput(items: EquipmentItem[] | null | undefined): EquipmentItem[] {
    return (items ?? []).map((item, index) => {
        const paid = item.pricing === "paid";
        return {
            id: item.id,
            name: item.name.trim(),
            category: item.category,
            quantity: Math.max(1, Math.round(item.quantity || 1)),
            pricing: item.pricing,
            price: paid ? item.price ?? null : null,
            priceUnit: paid ? item.priceUnit ?? "per_booking" : null,
            availableQty: paid ? item.availableQty ?? null : null,
            image: item.image ?? null,
            legacyAddonId: item.legacyAddonId ?? null,
            sortOrder: index,
        };
    });
}

/** Access with blank strings dropped; null when nothing is known. */
export function normalizeAccessInput(access: ListingAccess | null | undefined): ListingAccess | null {
    if (!access) return null;
    const normalized: ListingAccess = {
        floor: access.floor ?? null,
        lift: access.lift || null,
        parking: access.parking || null,
        vehicleLoadIn: access.vehicleLoadIn ?? null,
        loadInNote: access.loadInNote?.trim() || null,
    };
    return Object.values(normalized).some((value) => value != null) ? normalized : null;
}

/** Keeps a package's equipment references that point at this listing's items. */
export function validPackageEquipment(
    refs: PackageEquipmentRef[] | null | undefined,
    items: Pick<EquipmentItem, "id">[]
): PackageEquipmentRef[] {
    const known = new Set(items.map((item) => item.id));
    return (refs ?? [])
        .filter((ref) => known.has(ref.equipmentId))
        .map((ref) => ({ equipmentId: ref.equipmentId, quantity: Math.max(1, Math.round(ref.quantity || 1)) }));
}

/**
 * Everything a package comes with. Under "every booking", included gear comes with packages
 * too, so it's added automatically; the package's own picks add anything beyond that.
 */
export function packageEquipmentFor(
    refs: PackageEquipmentRef[] | null | undefined,
    items: EquipmentItem[],
    policy: string | null | undefined
): Array<{ item: EquipmentItem; quantity: number }> {
    const byId = new Map(items.map((item) => [item.id, item]));
    const result = new Map<string, { item: EquipmentItem; quantity: number }>();
    if (policy === "all_bookings") {
        for (const item of items) {
            if (item.pricing === "included") result.set(item.id, { item, quantity: Math.max(1, item.quantity || 1) });
        }
    }
    for (const ref of refs ?? []) {
        const item = byId.get(ref.equipmentId);
        if (item && !result.has(item.id)) result.set(item.id, { item, quantity: Math.max(1, ref.quantity || 1) });
    }
    return Array.from(result.values());
}
