import { z } from "zod";

/**
 * Production agent (supply graph) schemas.
 * Every production mutation and the agent's JSON output validate against these.
 */

export const isoDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date as YYYY-MM-DD");

export const creativeFingerprintSchema = z.object({
    lighting: z.array(z.string()),
    palette: z.array(z.string()),
    composition: z.array(z.string()),
    mood: z.array(z.string()),
    productCategory: z.string().optional(),
    summaryText: z.string().min(1),
});

export const productionContactSchema = z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional(),
    instagram: z.string().optional(),
});

export const clientBrandSchema = z.object({
    name: z.string().min(1, "Brand name is required"),
    category: z.string().optional(),
    contact: productionContactSchema.optional(),
    city: z.string().optional(),
    notes: z.string().optional(),
});

export const crewRoleSchema = z.enum(["PHOTOGRAPHER", "MUA", "STYLIST", "DP", "ASSISTANT"]);

export const crewSchema = z.object({
    name: z.string().min(1, "Name is required"),
    role: crewRoleSchema,
    city: z.string().min(1, "City is required"),
    serviceableCities: z.array(z.string()).default([]),
    dayRateInr: z.number().int().positive("Day rate must be a positive INR amount"),
    halfDayRateInr: z.number().int().positive().optional(),
    contact: productionContactSchema.optional(),
});

export const talentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    city: z.string().min(1, "City is required"),
    serviceableCities: z.array(z.string()).default([]),
    attributes: z.object({
        gender: z.string().min(1, "Gender is required"),
        ageRange: z.string().min(1, "Age range is required"),
        heightCm: z.number().int().positive().optional(),
        look: z.array(z.string()).default([]),
    }),
    dayRateInr: z.number().int().positive("Day rate must be a positive INR amount"),
    contact: productionContactSchema.optional(),
});

export const portfolioAssetSchema = z.object({
    entityType: z.enum(["CREW", "TALENT"]),
    entityId: z.string().min(1),
    assetUrl: z.string().url("Asset URL must be a valid URL"),
    tags: z.array(z.string()).default([]),
});

export const productionAvailabilitySchema = z.object({
    entityType: z.enum(["CREW", "TALENT"]),
    entityId: z.string().min(1),
    blockedDates: z.array(isoDateSchema).optional(),
    tentativeDates: z.array(isoDateSchema).optional(),
});

export const briefIntakeSchema = z.object({
    intakeToken: z.string().min(1, "Missing intake token"),
    submittedVia: z.enum(["WHATSAPP", "WEB"]).default("WEB"),
    deliverables: z
        .array(z.object({ type: z.string().min(1), qty: z.number().int().positive() }))
        .min(1, "Add at least one deliverable"),
    moodWords: z.array(z.string()).default([]),
    moodboardImages: z.array(z.string().url()).default([]),
    budgetInr: z.number().int().positive("Budget must be a positive INR amount"),
    city: z.string().min(1, "City is required"),
    dates: z.array(isoDateSchema).min(1, "Add at least one preferred date"),
    talentPrefs: z
        .object({
            gender: z.string().optional(),
            ageRange: z.string().optional(),
            look: z.array(z.string()).default([]),
        })
        .optional(),
    notes: z.string().optional(),
});

export const briefStatusSchema = z.object({
    briefId: z.string().min(1),
    status: z.enum(["NEW", "PLANNING", "QUOTED", "BOOKED", "COMPLETED", "LOST"]),
});

/**
 * Full plan payload — the agent must emit exactly this shape (Phase 2), and
 * producer manual builds share it. `studio.listingId` references Listing.
 */
export const planPayloadSchema = z.object({
    studio: z.object({
        listingId: z.string().min(1),
        fitReason: z.string(),
        costInr: z.number().int().nonnegative(),
    }),
    crew: z.array(
        z.object({
            crewId: z.string().min(1),
            role: z.string(),
            styleMatch: z.number().min(0).max(1),
            rateInr: z.number().int().nonnegative(),
        })
    ),
    talent: z.array(
        z.object({
            talentId: z.string().min(1),
            lookMatch: z.number().min(0).max(1),
            rateInr: z.number().int().nonnegative(),
        })
    ),
    shotList: z.array(
        z.object({
            deliverable: z.string(),
            setup: z.string(),
            estMinutes: z.number().int().positive(),
        })
    ),
    schedule: z.array(z.object({ time: z.string(), activity: z.string() })),
    budget: z.object({
        subtotalInr: z.number().int().nonnegative(),
        contcaveFeeInr: z.number().int().nonnegative(),
        totalInr: z.number().int().nonnegative(),
        withinBudget: z.boolean(),
    }),
    confidence: z.number().min(0).max(1),
    needsHumanReview: z.boolean(),
});

export const createPlanSchema = planPayloadSchema.partial().extend({
    briefId: z.string().min(1),
});

export const updatePlanSchema = planPayloadSchema.partial().extend({
    planId: z.string().min(1),
});

export const generateQuoteSchema = z.object({
    planId: z.string().min(1),
});

export const logShootSchema = z.object({
    planId: z.string().min(1),
    briefId: z.string().min(1),
    date: isoDateSchema,
    actualListingId: z.string().optional(),
    actualCrewIds: z.array(z.string()).default([]),
    actualTalentIds: z.array(z.string()).default([]),
    actualCostInr: z.number().int().nonnegative(),
    contcaveFeeCollectedInr: z.number().int().nonnegative(),
    outcome: z
        .object({
            ratingByBrand: z.number().min(0).max(5).optional(),
            notes: z.string().optional(),
        })
        .optional(),
    reliabilityEvents: z
        .array(
            z.object({
                entityType: z.enum(["CREW", "TALENT"]),
                entityId: z.string().min(1),
                event: z.enum(["ONTIME", "LATE", "NOSHOW"]),
                note: z.string().optional(),
            })
        )
        .default([]),
});

export type CreativeFingerprintInput = z.infer<typeof creativeFingerprintSchema>;
export type BriefIntakeInput = z.infer<typeof briefIntakeSchema>;
export type PlanPayload = z.infer<typeof planPayloadSchema>;
export type LogShootInput = z.infer<typeof logShootSchema>;
