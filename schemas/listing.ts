import { z } from "zod";

import { OPENING_HOURS_MAX_END, OPENING_HOURS_MIN_START, TIME_SLOTS } from "@/constants/timeSlots";
import { AESTHETIC_LABELS, SET_FEATURE_LABELS, USE_CASE_LABELS, VENUE_TYPE_LABELS } from "@/lib/taxonomy";
import { objectIdSchema } from "@/schemas/common";
export const imageSchema = z.string().url("Invalid image URL").max(500, "URL too long");

export const locationSchema = z.object({
    latlng: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    label: z.string().max(300).optional(),
    region: z.string().max(100).optional(),
    value: z.string().max(300).optional(),
    flag: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    display_name: z.string().max(500).optional(),
    state: z.string().max(100).optional(),
    url: z.string().url().max(1000).optional(),
    mapsUrl: z.string().url().max(1000).optional(),
    googleMapsUrl: z.string().url().max(1000).optional(),
    propertyStateCode: z.string().regex(/^\d{2}$/, "Invalid GST state code").optional(),
    additionalInfo: z.string().max(200, "Additional info too long").optional(),
});

export const operationalHoursBaseSchema = z.object({
    start: z.string().regex(/^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/, "Invalid start time (e.g. 9:00 AM)"),
    end: z.string().regex(/^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/, "Invalid end time (e.g. 12:00 AM)"),
});

export const operationalHoursSchema = operationalHoursBaseSchema.superRefine((value, ctx) => {
    const startIdx = TIME_SLOTS.indexOf(value.start);
    const endIdx = TIME_SLOTS.lastIndexOf(value.end);

    if (startIdx === -1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["start"],
            message: `Start time must be between ${OPENING_HOURS_MIN_START} and ${OPENING_HOURS_MAX_END}`,
        });
    }
    if (endIdx === -1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["end"],
            message: `End time must be between ${OPENING_HOURS_MIN_START} and ${OPENING_HOURS_MAX_END}`,
        });
    }
    if (startIdx !== -1 && endIdx !== -1 && endIdx < startIdx) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["end"],
            message: "End time cannot be earlier than start time",
        });
    }
}).optional().nullable();

export const operationalDaysSchema = z.object({
    start: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
    end: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
}).optional().nullable();


export const listingSetSchema = z.object({
    id: objectIdSchema.optional(),
    tempId: z.string().trim().min(1).max(100).optional(),
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    description: z.string().max(2000, "Description too long").optional().nullable(),
    images: z.array(imageSchema).max(30, "Maximum 30 images per set"),
    price: z.number().int().min(1, "Set price must be at least ₹1").max(10000000, "Price exceeds limit"),
    position: z.number().int().optional(),
    aesthetics: z.array(z.enum(AESTHETIC_LABELS)).max(6).optional().default([]),
    setFeatures: z.array(z.enum(SET_FEATURE_LABELS)).max(17).optional().default([]),
});


export const packageBaseSchema = z.object({
    id: objectIdSchema.optional(),
    title: z.string().min(3, "Title too short").max(200, "Title too long"),
    description: z.string().max(500, "Description too long").optional().nullable(),
    originalPrice: z.number().min(0).max(10000000).optional(),
    offeredPrice: z.number().int().min(1, "Package offered price must be at least ₹1").max(10000000),
    features: z.array(z.string().trim().min(1).max(200)).max(20),
    durationHours: z.number().int().positive().max(168),
    requiredSetCount: z.number().int().min(1).max(50).optional().nullable(),
    fixedAddOn: z.number().int().min(0).max(10_000_000).optional().nullable(),
    eligibleSetIds: z.array(objectIdSchema).max(50).optional(),
    isActive: z.boolean().default(true),
});

export const packageSchema = packageBaseSchema.refine((data) => {
    if (data.originalPrice && data.originalPrice > 0) {
        return data.offeredPrice <= data.originalPrice;
    }
    return true;
}, {
    message: "Offered price cannot be greater than original price",
    path: ["offeredPrice"],
});


export const addonSchema = z.object({
    id: objectIdSchema.optional(),
    name: z.string().trim().min(1).max(100),
    price: z.number().min(0).max(10_000_000),
    qty: z.number().int().min(0).max(10_000),
    imageUrl: imageSchema.optional(),
});

export const verificationSchema = z.object({
    documents: z.array(z.object({
        url: z.string().url().max(1000).optional(),
        name: z.string().trim().max(200).optional(),
        type: z.string().trim().max(100).optional(),
        file: z.unknown().optional(), // File object exists only before the client upload boundary.
        original_filename: z.string().trim().max(255).optional(),
        bytes: z.number().int().min(0).max(20_000_000).optional(),
    })).max(20).optional(),
});

export const signatureSchema = z.object({
    name: z.string().trim().max(200).optional(),
    signedAt: z.string().datetime().optional(),
    ip: z.string().trim().max(64).optional(),
    url: z.string().url().max(1000),
    thumbnail: z.string().url().max(1000).optional(),
});


export const listingBaseSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID").optional(),
    listingType: z.enum(["STANDARD", "CURATED"]).default("STANDARD"),
    category: z.string().min(1, "Category is required").max(100),
    locationValue: z.string().trim().min(1, "Location is required").max(300),
    actualLocation: locationSchema.nullable(),
    propertyStateCode: z.string().regex(/^\d{2}$/, "Invalid GST state code").optional().nullable(),
    imageSrc: z.array(imageSchema).min(1, "At least one image is required").max(30),


    title: z.string().min(5, "Title must be at least 5 characters").max(200),
    slug: z.string().min(3, "Slug too short").max(200).optional().nullable(),
    description: z.string().min(10, "Description must be at least 10 characters").max(5000),


    price: z.coerce.number().min(0).max(10000000),
    minimumBookingHours: z.coerce.number().min(0).max(168),
    maximumPax: z.coerce.number().min(0).max(10000),
    carpetArea: z.coerce.number().min(0).max(1000000),

    // Curated-specific optional fields
    priceRangeMin: z.coerce.number().min(0).max(10000000).optional().nullable(),
    priceRangeMax: z.coerce.number().min(0).max(10000000).optional().nullable(),
    mapsUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
    websiteUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
    instagramHandle: z.string().max(60).optional().nullable(),
    contactEmail: z.string().email().optional().nullable().or(z.literal("")),


    amenities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    otherAmenities: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    type: z.array(z.enum(USE_CASE_LABELS)).max(20).optional(),
    venueTypes: z.array(z.enum(VENUE_TYPE_LABELS)).max(7).optional().default([]),
    aesthetics: z.array(z.enum(AESTHETIC_LABELS)).max(6).optional().default([]),
    setFeatures: z.array(z.enum(SET_FEATURE_LABELS)).max(17).optional().default([]),


    instantBooking: z.boolean().default(false),
    terms: z.boolean().optional(),
    customTerms: z.string().max(20_000).optional().nullable(),
    operationalHours: operationalHoursSchema,
    operationalDays: operationalDaysSchema,


    hasSets: z.boolean().default(false),
    sets: z.array(listingSetSchema).max(50).optional(),
    setsHaveSamePrice: z.boolean().nullable().default(false),
    unifiedSetPrice: z.number().int().min(1).max(10_000_000).optional().nullable(),
    additionalSetPricingType: z.enum(["FIXED", "HOURLY"]).nullable().optional(),
    packages: z.array(packageSchema).max(50).optional(),

    addons: z.array(addonSchema).max(100).optional(),
    verifications: verificationSchema.optional().nullable(),
    agreementSignature: signatureSchema.optional().nullable(),
    videoSrc: z.string().url("Invalid video URL").optional().nullable(),
});

export const listingSchema = listingBaseSchema.superRefine((data, ctx) => {
    if (data.hasSets && (!data.sets || data.sets.length < 1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Listings with sets must have at least one set", path: ["sets"] });
    }
    if (!data.hasSets && data.sets && data.sets.length > 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enable sets before adding listing sets", path: ["sets"] });
    }
    if (data.hasSets && (data.sets?.length || 0) > 1 && !data.additionalSetPricingType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose how additional sets are priced", path: ["additionalSetPricingType"] });
    }
    if (data.hasSets && data.setsHaveSamePrice) {
        if (data.unifiedSetPrice == null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unified set price is required", path: ["unifiedSetPrice"] });
        } else {
            data.sets?.forEach((set, index) => {
                if (set.price !== data.unifiedSetPrice) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Every set price must match the unified set price",
                        path: ["sets", index, "price"],
                    });
                }
            });
        }
    }
    if (data.hasSets && data.packages) {
        const setCount = data.sets?.length || 0;
        data.packages.forEach((pkg, index) => {
            if (pkg.requiredSetCount && pkg.requiredSetCount > setCount) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Package set count cannot exceed the number of listing sets",
                    path: ["packages", index, "requiredSetCount"],
                });
            }
        });
    }
    if (data.listingType !== "CURATED" && data.terms !== true) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "You must accept the terms", path: ["terms"] });
    }
    if (data.listingType === "STANDARD" && (!data.price || data.price < 1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price must be at least ₹1 for standard listings", path: ["price"] });
    }
    if (data.priceRangeMin != null && data.priceRangeMax != null && data.priceRangeMin > data.priceRangeMax) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum price cannot exceed maximum price", path: ["priceRangeMax"] });
    }
});

export type ListingSchema = z.infer<typeof listingSchema>;
export type ListingSetSchema = z.infer<typeof listingSetSchema>;
export type PackageSchema = z.infer<typeof packageSchema>;
export type AddonSchema = z.infer<typeof addonSchema>;
export type VerificationSchema = z.infer<typeof verificationSchema>;
export type SignatureSchema = z.infer<typeof signatureSchema>;
export type LocationSchema = z.infer<typeof locationSchema>;

// Administrative & Utility Schemas
export const approveListingSchema = z.object({
    listingId: objectIdSchema,
});

export const rejectListingSchema = z.object({
    listingId: objectIdSchema,
    reason: z.string().trim().min(10, "Rejection reason must be at least 10 characters").max(500, "Rejection reason is too long"),
});

export const deleteListingSchema = z.object({
    listingId: objectIdSchema,
});

export const listingBlockSchema = z.object({
    listingId: objectIdSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD").refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Invalid calendar date"),
    startTime: z.enum(TIME_SLOTS as unknown as [string, ...string[]]),
    endTime: z.enum(TIME_SLOTS as unknown as [string, ...string[]]),
    setIds: z.array(objectIdSchema).max(50).optional().default([]),
    reason: z.string().max(500, "Reason too long").optional().nullable(),
}).refine((value) => TIME_SLOTS.lastIndexOf(value.endTime) > TIME_SLOTS.indexOf(value.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
});

export const deleteBlockSchema = z.object({
    listingId: objectIdSchema,
    blockId: objectIdSchema,
});
