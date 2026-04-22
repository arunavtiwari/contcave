import { z } from "zod";

import { OPENING_HOURS_MAX_END, OPENING_HOURS_MIN_START, TIME_SLOTS } from "@/constants/timeSlots";
export const imageSchema = z.string().url("Invalid image URL").max(500, "URL too long");

export const locationSchema = z.object({
    latlng: z.tuple([z.number(), z.number()]),
    label: z.string().optional(),
    region: z.string().optional(),
    value: z.string().optional(),
    flag: z.string().optional(),
    country: z.string().optional(),
    display_name: z.string().optional(),
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
    start: z.string(),
    end: z.string(),
}).optional().nullable();


export const listingSetSchema = z.object({
    id: z.string().optional(),
    tempId: z.string().optional(),
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    description: z.string().max(2000, "Description too long").optional().nullable(),
    images: z.array(imageSchema).max(30, "Maximum 30 images per set"),
    price: z.number().min(0, "Price must be positive").max(10000000, "Price exceeds limit"),
    position: z.number().int().optional(),
});


export const packageBaseSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, "Title too short").max(200, "Title too long"),
    description: z.string().max(500, "Description too long").optional().nullable(),
    originalPrice: z.number().min(0).max(10000000).optional(),
    offeredPrice: z.number().min(0).max(10000000),
    features: z.array(z.string().max(200)).max(20),
    durationHours: z.number().positive().max(168),
    requiredSetCount: z.number().int().min(1).optional().nullable(),
    fixedAddOn: z.number().min(0).optional().nullable(),
    eligibleSetIds: z.array(z.string()).optional(),
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


export const listingBaseSchema = z.object({
    category: z.string().min(1, "Category is required").max(100),
    locationValue: z.string().min(1, "Location is required"),
    actualLocation: locationSchema,
    imageSrc: z.array(imageSchema).min(1, "At least one image is required").max(30),


    title: z.string().min(5, "Title must be at least 5 characters").max(200),
    description: z.string().min(50, "Description must be at least 50 characters").max(5000),


    price: z.coerce.number().min(1, "Price must be at least 1").max(10000000),
    minimumBookingHours: z.coerce.number().min(1, "Minimum booking is 1 hour").max(168),
    maximumPax: z.coerce.number().min(1, "Maximum capacity must be at least 1").max(10000),
    carpetArea: z.coerce.number().min(1, "Carpet area must be at least 1").max(1000000),


    amenities: z.array(z.string()).max(50).optional(),
    otherAmenities: z.array(z.string()).max(50).optional(),
    type: z.array(z.string()).max(20).optional(),


    instantBooking: z.boolean().default(false),
    terms: z.boolean().refine(val => val === true, "You must accept the terms"),
    customTerms: z.string().optional().nullable(),
    operationalHours: operationalHoursSchema,
    operationalDays: operationalDaysSchema,


    hasSets: z.boolean().default(false),
    sets: z.array(listingSetSchema).optional(),
    setsHaveSamePrice: z.boolean().nullable().default(false),
    unifiedSetPrice: z.number().min(0).optional().nullable(),
    additionalSetPricingType: z.enum(["FIXED", "HOURLY"]).nullable().optional(),
    packages: z.array(packageSchema).optional(),

    addons: z.unknown().optional(),
    verifications: z.unknown().optional().nullable(),
    agreementSignature: z.unknown().optional().nullable(),
});

export const listingSchema = listingBaseSchema.refine((data) => {
    if (data.hasSets) {
        if (!data.sets || data.sets.length < 2) {
            return false;
        }
    }
    return true;
}, {
    message: "Multi-set listings must have at least 2 sets",
    path: ["sets"],
});

export type ListingSchema = z.infer<typeof listingSchema>;
export type ListingSetSchema = z.infer<typeof listingSetSchema>;
export type PackageSchema = z.infer<typeof packageSchema>;
