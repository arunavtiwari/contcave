import type {
    Brief,
    ClientBrand,
    Crew,
    ProductionPlan,
    Shoot,
    Talent,
} from "@prisma/client";

/**
 * Safe variants for the production module — Prisma models are never passed
 * to client components directly; Dates serialize to ISO strings.
 */

type Serialized<T> = Omit<T, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
};

export type SafeClientBrand = Serialized<ClientBrand>;

export type SafeCrew = Serialized<Crew>;

export type SafeTalent = Serialized<Talent>;

export type SafeBrief = Serialized<Brief> & {
    brand?: Pick<ClientBrand, "name"> | null;
    planCount?: number;
};

export type SafeProductionPlan = Serialized<Omit<ProductionPlan, "quotedAt">> & {
    quotedAt: string | null;
};

export type SafeShoot = Serialized<Shoot>;

export function toSafe<T extends { createdAt: Date; updatedAt: Date }>(doc: T): Serialized<T> {
    return {
        ...doc,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

/** Quote artifact returned by generateQuote — what a producer sends the brand. */
export type QuoteArtifact = {
    planId: string;
    brand: string;
    city: string;
    dates: string[];
    deliverables: { type: string; qty: number }[];
    shotList: { deliverable: string; setup: string; estMinutes: number }[];
    schedule: { time: string; activity: string }[];
    lineItems: { kind: "studio" | "crew" | "talent"; name: string; detail: string; amountInr: number }[];
    budget: { subtotalInr: number; contcaveFeeInr: number; totalInr: number; withinBudget: boolean };
    briefBudgetInr: number;
    feePct: number;
};
