"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";

import { createAction } from "@/lib/actions-utils";
import { UserFacingError } from "@/lib/errors";
import { nextReliability, PunctualityEvent } from "@/lib/hermes/reliability";
import { sendAndLogWhatsApp } from "@/lib/hermes/whatsapp";
import prisma from "@/lib/prismadb";
import {
    briefIntakeSchema,
    briefStatusSchema,
    clientBrandSchema,
    createPlanSchema,
    crewSchema,
    generateQuoteSchema,
    logShootSchema,
    portfolioAssetSchema,
    productionAvailabilitySchema,
    talentSchema,
    updatePlanSchema,
} from "@/schemas/production";
import type { QuoteArtifact } from "@/types/production";

const PRODUCTION_PATH = "/admin/dashboard/production";

function feePct(): number {
    return Number(process.env.CONTCAVE_FEE_PCT ?? 15);
}

/**
 * ------------------------- Supply graph (admin) -------------------------
 */

export const createClientBrand = createAction(
    clientBrandSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const brand = await prisma.clientBrand.create({
            data: { ...data, intakeToken: crypto.randomBytes(12).toString("hex") },
        });
        revalidatePath(`${PRODUCTION_PATH}/brands`);
        return { id: brand.id, intakeToken: brand.intakeToken };
    }
);

export const createCrewMember = createAction(
    crewSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const crew = await prisma.crew.create({ data: { ...data, reliability: {} } });
        revalidatePath(`${PRODUCTION_PATH}/supply`);
        return { id: crew.id };
    }
);

export const createTalentProfile = createAction(
    talentSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const talent = await prisma.talent.create({ data: { ...data, reliability: {} } });
        revalidatePath(`${PRODUCTION_PATH}/supply`);
        return { id: talent.id };
    }
);

export const addPortfolioAsset = createAction(
    portfolioAssetSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const asset = { assetUrl: data.assetUrl, tags: data.tags };
        if (data.entityType === "CREW") {
            await prisma.crew.update({
                where: { id: data.entityId },
                data: { portfolio: { push: asset } },
            });
        } else {
            await prisma.talent.update({
                where: { id: data.entityId },
                data: { portfolio: { push: asset } },
            });
        }
        // TODO(Phase 1): fingerprint asset -> update aggregate fingerprint + embedding
        revalidatePath(`${PRODUCTION_PATH}/supply`);
        return { added: true };
    }
);

export const setProductionAvailability = createAction(
    productionAvailabilitySchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const availability = await prisma.productionAvailability.upsert({
            where: {
                entityType_entityId: { entityType: data.entityType, entityId: data.entityId },
            },
            create: {
                entityType: data.entityType,
                entityId: data.entityId,
                blockedDates: data.blockedDates ?? [],
                tentativeDates: data.tentativeDates ?? [],
            },
            update: {
                ...(data.blockedDates ? { blockedDates: data.blockedDates } : {}),
                ...(data.tentativeDates ? { tentativeDates: data.tentativeDates } : {}),
            },
        });
        return { id: availability.id };
    }
);

/**
 * ------------------------- Brief intake (public) -------------------------
 * Brands are not authenticated — the tokenised link authorises the submission.
 */

export const submitBrief = createAction(briefIntakeSchema, {}, async (data) => {
    const brand = await prisma.clientBrand.findUnique({
        where: { intakeToken: data.intakeToken },
    });
    if (!brand) throw new UserFacingError("This intake link is invalid or has been rotated.");

    const brief = await prisma.brief.create({
        data: {
            brandId: brand.id,
            submittedVia: data.submittedVia,
            deliverables: data.deliverables,
            moodWords: data.moodWords,
            moodboardImages: data.moodboardImages,
            budgetInr: data.budgetInr,
            city: data.city,
            dates: data.dates,
            talentPrefs: data.talentPrefs,
            notes: data.notes,
        },
    });

    // TODO(Phase 1): enqueue moodboard fingerprint job (lib/hermes/agent/fingerprint.ts)

    revalidatePath(PRODUCTION_PATH);
    return { briefId: brief.id };
});

export const updateBriefStatus = createAction(
    briefStatusSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        await prisma.brief.update({
            where: { id: data.briefId },
            data: { status: data.status },
        });
        revalidatePath(PRODUCTION_PATH);
        return { status: data.status };
    }
);

/**
 * ---------------------------- Plans (admin) ----------------------------
 */

export const createProductionPlan = createAction(
    createPlanSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const brief = await prisma.brief.findUnique({ where: { id: data.briefId } });
        if (!brief) throw new UserFacingError("Brief not found.");

        const version = await prisma.productionPlan.count({ where: { briefId: data.briefId } });

        const plan = await prisma.productionPlan.create({
            data: {
                briefId: data.briefId,
                studio: data.studio,
                crew: data.crew ?? [],
                talent: data.talent ?? [],
                shotList: data.shotList ?? [],
                schedule: data.schedule ?? [],
                budget: data.budget,
                confidence: data.confidence ?? 1, // human-built
                needsHumanReview: false,
                source: "PRODUCER",
                version: version + 1,
            },
        });

        if (brief.status === "NEW") {
            await prisma.brief.update({
                where: { id: brief.id },
                data: { status: "PLANNING" },
            });
        }
        revalidatePath(PRODUCTION_PATH);
        return { planId: plan.id };
    }
);

export const updateProductionPlan = createAction(
    updatePlanSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data, { user }) => {
        const { planId, ...changes } = data;
        const existing = await prisma.productionPlan.findUnique({ where: { id: planId } });
        if (!existing) throw new UserFacingError("Plan not found.");

        // Every producer edit is appended to the audit trail (future training data)
        const edit = {
            at: new Date().toISOString(),
            by: user?.id ?? "unknown",
            changes: JSON.parse(JSON.stringify(changes)),
        };

        await prisma.productionPlan.update({
            where: { id: planId },
            data: {
                ...(changes.studio !== undefined ? { studio: changes.studio } : {}),
                ...(changes.crew !== undefined ? { crew: changes.crew } : {}),
                ...(changes.talent !== undefined ? { talent: changes.talent } : {}),
                ...(changes.shotList !== undefined ? { shotList: changes.shotList } : {}),
                ...(changes.schedule !== undefined ? { schedule: changes.schedule } : {}),
                ...(changes.budget !== undefined ? { budget: changes.budget } : {}),
                ...(changes.confidence !== undefined ? { confidence: changes.confidence } : {}),
                ...(changes.needsHumanReview !== undefined
                    ? { needsHumanReview: changes.needsHumanReview }
                    : {}),
                producerEdits: { push: edit },
            },
        });
        revalidatePath(`${PRODUCTION_PATH}/plans/${planId}`);
        return { planId };
    }
);

export const generateQuote = createAction(
    generateQuoteSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data): Promise<QuoteArtifact> => {
        const plan = await prisma.productionPlan.findUnique({
            where: { id: data.planId },
            include: { brief: { include: { brand: true } } },
        });
        if (!plan) throw new UserFacingError("Plan not found.");
        if (!plan.studio) throw new UserFacingError("Plan has no studio — pick one before quoting.");

        const [listing, crew, talent] = await Promise.all([
            prisma.listing.findUnique({ where: { id: plan.studio.listingId } }),
            prisma.crew.findMany({ where: { id: { in: plan.crew.map((c) => c.crewId) } } }),
            prisma.talent.findMany({ where: { id: { in: plan.talent.map((t) => t.talentId) } } }),
        ]);

        const lineItems: QuoteArtifact["lineItems"] = [
            {
                kind: "studio",
                name: listing?.title ?? plan.studio.listingId,
                detail: plan.studio.fitReason,
                amountInr: plan.studio.costInr,
            },
            ...plan.crew.map((c) => ({
                kind: "crew" as const,
                name: crew.find((x) => x.id === c.crewId)?.name ?? c.crewId,
                detail: c.role,
                amountInr: c.rateInr,
            })),
            ...plan.talent.map((t) => ({
                kind: "talent" as const,
                name: talent.find((x) => x.id === t.talentId)?.name ?? t.talentId,
                detail: "model",
                amountInr: t.rateInr,
            })),
        ];

        const subtotalInr = lineItems.reduce((sum, li) => sum + li.amountInr, 0);
        const contcaveFeeInr = Math.round((subtotalInr * feePct()) / 100);
        const totalInr = subtotalInr + contcaveFeeInr;
        const budget = {
            subtotalInr,
            contcaveFeeInr,
            totalInr,
            withinBudget: totalInr <= plan.brief.budgetInr,
        };

        await Promise.all([
            prisma.productionPlan.update({
                where: { id: plan.id },
                data: { budget, quotedAt: new Date() },
            }),
            prisma.brief.update({ where: { id: plan.briefId }, data: { status: "QUOTED" } }),
        ]);
        revalidatePath(`${PRODUCTION_PATH}/plans/${plan.id}`);

        return {
            planId: plan.id,
            brand: plan.brief.brand.name,
            city: plan.brief.city,
            dates: plan.brief.dates,
            deliverables: plan.brief.deliverables,
            shotList: plan.shotList,
            schedule: plan.schedule,
            lineItems,
            budget,
            briefBudgetInr: plan.brief.budgetInr,
            feePct: feePct(),
        };
    }
);

/**
 * ------------------------- Executed shoots (admin) -------------------------
 * Logging a shoot is what fills the supply graph: every participant's
 * reliability record is updated from the outcome + punctuality events.
 */

export const logShoot = createAction(
    logShootSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const plan = await prisma.productionPlan.findUnique({ where: { id: data.planId } });
        if (!plan || plan.briefId !== data.briefId) {
            throw new UserFacingError("Plan not found for that brief.");
        }

        const shoot = await prisma.shoot.create({
            data: {
                planId: data.planId,
                briefId: data.briefId,
                date: data.date,
                actualListingId: data.actualListingId,
                actualCrewIds: data.actualCrewIds,
                actualTalentIds: data.actualTalentIds,
                actualCostInr: data.actualCostInr,
                contcaveFeeCollectedInr: data.contcaveFeeCollectedInr,
                outcome: data.outcome,
                reliabilityEvents: data.reliabilityEvents,
            },
        });

        const rating = data.outcome?.ratingByBrand;
        const eventFor = (entityId: string): PunctualityEvent =>
            data.reliabilityEvents.find((e) => e.entityId === entityId)?.event ?? "ONTIME";

        for (const crewId of data.actualCrewIds) {
            const member = await prisma.crew.findUnique({ where: { id: crewId } });
            if (!member) continue;
            await prisma.crew.update({
                where: { id: crewId },
                data: { reliability: nextReliability(member.reliability, eventFor(crewId), rating) },
            });
        }
        for (const talentId of data.actualTalentIds) {
            const model = await prisma.talent.findUnique({ where: { id: talentId } });
            if (!model) continue;
            await prisma.talent.update({
                where: { id: talentId },
                data: { reliability: nextReliability(model.reliability, eventFor(talentId), rating) },
            });
        }

        await prisma.brief.update({
            where: { id: data.briefId },
            data: { status: "COMPLETED" },
        });
        revalidatePath(`${PRODUCTION_PATH}/shoots`);
        return { shootId: shoot.id };
    }
);

/**
 * ---------------------- WhatsApp communication (Hermes) ----------------------
 * Outbound goes through the open-source connector; every message is logged.
 */

export const sendQuoteViaWhatsApp = createAction(
    generateQuoteSchema, // { planId }
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        const plan = await prisma.productionPlan.findUnique({
            where: { id: data.planId },
            include: { brief: { include: { brand: true } } },
        });
        if (!plan) throw new UserFacingError("Plan not found.");
        if (!plan.budget || !plan.quotedAt) {
            throw new UserFacingError("Generate the quote before sending it.");
        }
        const phone = plan.brief.brand.contact?.phone;
        if (!phone) {
            throw new UserFacingError(
                `${plan.brief.brand.name} has no phone on file — add one under Brands first.`
            );
        }

        const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
        const lines = [
            `*ContCave — shoot quote for ${plan.brief.brand.name}*`,
            `${plan.brief.city} · ${plan.brief.dates.join(", ")}`,
            "",
            ...plan.brief.deliverables.map((d) => `• ${d.qty}× ${d.type}`),
            "",
            `Subtotal: ${inr(plan.budget.subtotalInr)}`,
            `ContCave fee: ${inr(plan.budget.contcaveFeeInr)}`,
            `*Total: ${inr(plan.budget.totalInr)}*`,
            "",
            "Reply here to confirm or ask for changes.",
        ];

        await sendAndLogWhatsApp({
            toPhone: phone,
            text: lines.join("\n"),
            brandId: plan.brief.brandId,
            briefId: plan.briefId,
        });
        return { sent: true };
    }
);
