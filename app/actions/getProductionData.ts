"use server";

import { retrieveCandidates } from "@/lib/hermes/agent/retrieve";
import prisma from "@/lib/prismadb";
import { toSafe } from "@/types/production";

/**
 * Read-only fetchers for the production module (admin pages).
 * Follows the repo convention: reads are plain server functions,
 * mutations go through createAction (productionActions.ts).
 */

export async function getProductionBriefs() {
    const briefs = await prisma.brief.findMany({
        include: {
            brand: { select: { name: true } },
            plans: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return briefs.map((b) => ({
        ...toSafe(b),
        planCount: b.plans.length,
    }));
}

export async function getBriefWithPlans(briefId: string) {
    const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        include: {
            brand: true,
            plans: { orderBy: { version: "desc" } },
        },
    });
    if (!brief) return null;
    return {
        ...toSafe(brief),
        brand: toSafe(brief.brand),
        plans: brief.plans.map((p) => ({
            ...toSafe(p),
            quotedAt: p.quotedAt?.toISOString() ?? null,
        })),
    };
}

/** Supply available for a brief's city: studios are Listings (active + verified). */
export async function getSupplyForCity(city: string) {
    const [listings, crew, talent] = await Promise.all([
        prisma.listing.findMany({
            where: {
                active: true,
                status: "VERIFIED",
                locationValue: { contains: city, mode: "insensitive" },
            },
            select: {
                id: true,
                title: true,
                price: true,
                category: true,
                locationValue: true,
                carpetArea: true,
            },
            orderBy: { title: "asc" },
            take: 100,
        }),
        prisma.crew.findMany({
            where: {
                OR: [
                    { city: { equals: city, mode: "insensitive" } },
                    { serviceableCities: { has: city } },
                ],
            },
            orderBy: { name: "asc" },
        }),
        prisma.talent.findMany({
            where: {
                OR: [
                    { city: { equals: city, mode: "insensitive" } },
                    { serviceableCities: { has: city } },
                ],
            },
            orderBy: { name: "asc" },
        }),
    ]);

    return {
        studios: listings.map((l) => ({
            listingId: l.id,
            title: l.title,
            pricePerDayInr: l.price ?? 0,
            category: l.category,
            location: l.locationValue,
            carpetArea: l.carpetArea,
        })),
        crew: crew.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            dayRateInr: c.dayRateInr,
            rating: c.reliability.avgRating,
        })),
        talent: talent.map((t) => ({
            id: t.id,
            name: t.name,
            dayRateInr: t.dayRateInr,
            look: t.attributes.look,
        })),
    };
}

export async function getProductionPlan(planId: string) {
    const plan = await prisma.productionPlan.findUnique({
        where: { id: planId },
        include: { brief: { include: { brand: true } } },
    });
    if (!plan) return null;

    const [listing, crewDocs, talentDocs] = await Promise.all([
        plan.studio
            ? prisma.listing.findUnique({
                  where: { id: plan.studio.listingId },
                  select: { id: true, title: true },
              })
            : Promise.resolve(null),
        prisma.crew.findMany({
            where: { id: { in: plan.crew.map((c) => c.crewId) } },
            select: { id: true, name: true },
        }),
        prisma.talent.findMany({
            where: { id: { in: plan.talent.map((t) => t.talentId) } },
            select: { id: true, name: true },
        }),
    ]);

    return {
        ...toSafe(plan),
        quotedAt: plan.quotedAt?.toISOString() ?? null,
        brief: {
            ...toSafe(plan.brief),
            brand: toSafe(plan.brief.brand),
        },
        studioName: listing?.title ?? null,
        crewNames: Object.fromEntries(crewDocs.map((c) => [c.id, c.name])),
        talentNames: Object.fromEntries(talentDocs.map((t) => [t.id, t.name])),
    };
}

export async function getClientBrands() {
    const brands = await prisma.clientBrand.findMany({ orderBy: { createdAt: "desc" } });
    return brands.map(toSafe);
}

export async function getSupplyRoster() {
    const [crew, talent] = await Promise.all([
        prisma.crew.findMany({ orderBy: { name: "asc" } }),
        prisma.talent.findMany({ orderBy: { name: "asc" } }),
    ]);
    return { crew: crew.map(toSafe), talent: talent.map(toSafe) };
}

export async function getShoots() {
    const shoots = await prisma.shoot.findMany({ orderBy: { date: "desc" } });
    const briefs = await prisma.brief.findMany({
        where: { id: { in: shoots.map((s) => s.briefId) } },
        include: { brand: { select: { name: true } } },
    });
    return shoots.map((s) => ({
        ...toSafe(s),
        brandName: briefs.find((b) => b.id === s.briefId)?.brand.name ?? null,
    }));
}

/** Plans a shoot can be logged against (quoted or booked briefs). */
export async function getPlansForShootLog() {
    const plans = await prisma.productionPlan.findMany({
        where: { brief: { status: { in: ["QUOTED", "BOOKED"] } } },
        include: { brief: { include: { brand: { select: { name: true } } } } },
        orderBy: { updatedAt: "desc" },
    });

    const listingIds = plans
        .map((p) => p.studio?.listingId)
        .filter((x): x is string => Boolean(x));
    const crewIds = [...new Set(plans.flatMap((p) => p.crew.map((c) => c.crewId)))];
    const talentIds = [...new Set(plans.flatMap((p) => p.talent.map((t) => t.talentId)))];

    const [listings, crew, talent] = await Promise.all([
        prisma.listing.findMany({
            where: { id: { in: listingIds } },
            select: { id: true, title: true },
        }),
        prisma.crew.findMany({ where: { id: { in: crewIds } }, select: { id: true, name: true } }),
        prisma.talent.findMany({
            where: { id: { in: talentIds } },
            select: { id: true, name: true },
        }),
    ]);

    return plans.map((p) => ({
        id: p.id,
        briefId: p.briefId,
        label: `${p.brief.brand.name} — ${p.brief.city} (v${p.version}, ${p.brief.dates.join("/")})`,
        date: p.brief.dates[0] ?? "",
        totalInr: p.budget?.totalInr ?? 0,
        feeInr: p.budget?.contcaveFeeInr ?? 0,
        studio: p.studio
            ? {
                  id: p.studio.listingId,
                  name: listings.find((l) => l.id === p.studio?.listingId)?.title ?? "studio",
              }
            : null,
        crew: p.crew.map((c) => ({
            id: c.crewId,
            name: crew.find((x) => x.id === c.crewId)?.name ?? c.crewId,
        })),
        talent: p.talent.map((t) => ({
            id: t.talentId,
            name: talent.find((x) => x.id === t.talentId)?.name ?? t.talentId,
        })),
    }));
}

/** Brand lookup for the public intake page (returns only the display name). */
export async function getBrandByIntakeToken(token: string) {
    const brand = await prisma.clientBrand.findUnique({
        where: { intakeToken: token },
        select: { name: true },
    });
    return brand;
}

export type HermesSuggestions = {
    studios: { listingId: string; title: string; score: number }[];
    crew: { id: string; name: string; role: string; score: number }[];
    talent: { id: string; name: string; score: number }[];
};

/**
 * Hermes retrieval assist: ranked candidates for a brief, with names resolved.
 * Returns null when retrieval isn't possible yet (no embeddings, missing API
 * keys, no Atlas vector index) — the brief page then simply hides the section.
 */
export async function getHermesSuggestions(briefId: string): Promise<HermesSuggestions | null> {
    try {
        const candidates = await retrieveCandidates(briefId);
        if (
            !candidates.studios.length &&
            !candidates.crew.length &&
            !candidates.talent.length
        ) {
            return null;
        }

        const [listings, crew, talent] = await Promise.all([
            prisma.listing.findMany({
                where: { id: { in: candidates.studios.map((s) => s.listingId) } },
                select: { id: true, title: true },
            }),
            prisma.crew.findMany({
                where: { id: { in: candidates.crew.map((c) => c.crewId) } },
                select: { id: true, name: true },
            }),
            prisma.talent.findMany({
                where: { id: { in: candidates.talent.map((t) => t.talentId) } },
                select: { id: true, name: true },
            }),
        ]);

        return {
            studios: candidates.studios.map((s) => ({
                listingId: s.listingId,
                title: listings.find((l) => l.id === s.listingId)?.title ?? s.listingId,
                score: Math.round(s.score * 100) / 100,
            })),
            crew: candidates.crew.map((c) => ({
                id: c.crewId,
                name: crew.find((x) => x.id === c.crewId)?.name ?? c.crewId,
                role: c.role.toLowerCase(),
                score: Math.round(c.score * 100) / 100,
            })),
            talent: candidates.talent.map((t) => ({
                id: t.talentId,
                name: talent.find((x) => x.id === t.talentId)?.name ?? t.talentId,
                score: Math.round(t.score * 100) / 100,
            })),
        };
    } catch (error) {
        console.warn(
            "[hermes] suggestions unavailable:",
            error instanceof Error ? error.message : error
        );
        return null;
    }
}
