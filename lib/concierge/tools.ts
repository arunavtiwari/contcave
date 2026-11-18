import "server-only";

import { randomBytes } from "node:crypto";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { checkBookingSlot, loadDayAvailability } from "@/lib/availability";
import {
    addDaysToDateKey,
    BOOKING_HORIZON_DAYS,
    busyRanges,
    isDateKey,
    istDateKey,
    type MinuteRange,
    minutesToLabel,
} from "@/lib/booking/dayAvailability";
import { OBJECT_ID_PATTERN } from "@/lib/db/objectId";
import { listingPath } from "@/lib/listing/seo";
import { addGst } from "@/lib/pricing";
import prisma from "@/lib/prismadb";
import { searchWithParsedQuery } from "@/lib/search/service";
import type { ResultView } from "@/lib/search/types";
import { buildWhatsAppUrl } from "@/lib/whatsapp/urls";
import { EMPTY_QUERY, type ParsedQuery, parsedQuerySchema } from "@/schemas/search";

import { briefPatchSchema, mergeBrief } from "./brief";
import { MAX_PLANS_PER_CONVERSATION, SHORTLIST_TTL_DAYS } from "./config";
import { maskContactDetails } from "./guardrails";
import { searchHelp } from "./help";
import { draftPlan } from "./planner";
import type { ConversationState } from "./store";
import type { ConciergeEvent, StudioCardItem, StudioRef } from "./types";

/**
 * The concierge's tools. One library, two callers: the chat runtime calls
 * these in-process, and the same handlers are what a ContCave MCP server
 * will expose later (PRD, "MCP tools").
 *
 * Rules every handler follows:
 *  - Who is asking comes from the verified session in `ctx`, never from the
 *    model's arguments.
 *  - Inputs are validated here with Zod; the model's JSON is untrusted.
 *  - Results are small and factual. Money is computed with lib/pricing.
 *  - Only public listings (active, verified, not archived) are ever returned.
 *  - Nothing here takes payment or creates a reservation. The customer does
 *    that on the studio page, under the existing checkout and its checks.
 */

export type ToolContext = {
    state: ConversationState;
    emit: (event: ConciergeEvent) => void;
    /** e.g. https://contcave.com — for links that leave the site (shortlist, WhatsApp). */
    baseUrl: string;
    channel: "web" | "whatsapp";
    /** The customer's latest message, used for keyword matching exactly as the search box uses its query. */
    customerText: string;
};

export type ToolOutcome = {
    /** What the model is told. Kept compact: every byte here is paid for on each later turn. */
    result: Record<string, unknown>;
    handedOff?: string;
};

type Handler = (input: unknown, ctx: ToolContext) => Promise<ToolOutcome>;

class ToolInputError extends Error {}

const objectId = z.string().regex(OBJECT_ID_PATTERN, "Use the studio id from a search result");
const dateKey = z.string().refine(isDateKey, "Use YYYY-MM-DD");
const clock = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");


/**
 * What the public may see. `archivedAt` has to be matched both ways: in MongoDB
 * a field that was never set is not equal to null, and most listings never had one.
 */
const PUBLIC_LISTING = {
    active: true,
    status: "VERIFIED",
    OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
} satisfies Prisma.ListingWhereInput;

const toMinutes = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(":").map(Number);
    return hours * 60 + minutes;
};

function assertBookableDate(date: string) {
    const today = istDateKey(new Date());
    if (date < today) throw new ToolInputError(`That date has passed. Today is ${today}.`);
    if (date > addDaysToDateKey(today, BOOKING_HORIZON_DAYS)) {
        throw new ToolInputError(`Bookings open up to ${BOOKING_HORIZON_DAYS} days ahead.`);
    }
}

const studioRef = (listing: { id: string; slug?: string | null; title: string }): StudioRef => ({
    id: listing.id,
    title: listing.title,
    url: listingPath(listing),
});

// ─── search_studios ───────────────────────────────────────────────────────────

const optionalList = <T extends z.ZodType>(item: T) => z.array(item).optional().default([]);

const searchSchema = z.object({
    city: z.string().optional(),
    area: z.string().optional(),
    dates: optionalList(dateKey),
    start_time: clock.optional(),
    hours: z.number().optional(),
    people: z.number().int().optional(),
    budget_min: z.number().int().optional(),
    budget_max: z.number().int().optional(),
    budget_per: z.enum(["hour", "shoot"]).optional(),
    shoot_types: optionalList(z.string()),
    needs: optionalList(z.string()),
    looks: optionalList(z.string()),
    venue_types: optionalList(z.string()),
    limit: z.number().int().min(1).max(6).optional(),
});

export type StudioSearchInput = z.input<typeof searchSchema>;

/** The model's search fields as the search box's query. Validated by the box's own schema, so both accept the same values. */
export function toParsedQuery(raw: unknown): { parsed: ParsedQuery; limit: number } {
    const input = searchSchema.parse(raw);
    for (const date of input.dates) assertBookableDate(date);
    const parsed = parsedQuerySchema.parse({
        ...EMPTY_QUERY,
        city: input.city ?? null,
        area: input.area ?? null,
        dates: input.dates,
        startTime: input.start_time ?? null,
        hours: input.hours ?? null,
        crew: input.people ?? null,
        budgetMin: input.budget_min ?? null,
        budgetMax: input.budget_max ?? null,
        budgetBasis: input.budget_per === "hour" ? "hourly" : "total",
        shootTypes: input.shoot_types,
        needs: input.needs,
        vibes: input.looks,
        venueTypes: input.venue_types,
    });
    return { parsed, limit: input.limit ?? 4 };
}

const toCard = (view: ResultView): StudioCardItem => ({
    id: view.id,
    title: view.title,
    url: view.href,
    image: view.image,
    location: view.location,
    estimate: view.estimate,
    availability: view.availability,
    rating: view.rating,
    bookable: view.listingType !== "CURATED",
    fallback: view.fallback,
});

const searchStudios: Handler = async (raw, ctx) => {
    const { parsed, limit } = toParsedQuery(raw);
    const { view } = await searchWithParsedQuery(parsed, ctx.customerText, { now: new Date(), allowAi: false, visitor: null });

    if (view.state === "needCity") {
        return { result: { studios: [], note: "Ask which city. ContCave covers: " + view.cityOptions.join(", ") + "." } };
    }
    if (view.state === "notCovered") {
        return { result: { studios: [], note: `No studios in ${view.city} yet. ContCave covers: ${view.cityOptions.join(", ")}.` } };
    }
    if (view.state !== "results") return { result: { studios: [], note: "Not a studio search. Ask what they are shooting and where." } };

    const cards = view.results.slice(0, limit).map(toCard);
    ctx.emit({ type: "card", card: { type: "studios", items: cards, notices: view.notices } });

    return {
        result: {
            city: view.cityLabel,
            notices: view.notices,
            studios: view.results.slice(0, limit).map((result) => ({
                id: result.id,
                name: result.title,
                location: result.location,
                price: result.estimate,
                availability: result.availability,
                online_booking: result.listingType !== "CURATED",
                closest_alternative: result.fallback,
                why: result.reasons,
                caveats: result.caveats,
                ...(ctx.channel === "whatsapp" ? { link: `${ctx.baseUrl}${result.href}` } : {}),
            })),
        },
    };
};

// ─── get_studio ───────────────────────────────────────────────────────────────

async function loadPublicListing(id: string) {
    const listing = await prisma.listing.findFirst({
        where: { id, ...PUBLIC_LISTING },
        select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            locationValue: true,
            price: true,
            extraHourPrice: true,
            minimumBookingHours: true,
            maximumPax: true,
            carpetArea: true,
            amenities: true,
            otherAmenities: true,
            type: true,
            venueTypes: true,
            aesthetics: true,
            setFeatures: true,
            hasSets: true,
            instantBooking: true,
            listingType: true,
            priceRangeMin: true,
            priceRangeMax: true,
            avgReviewRating: true,
            operationalDays: true,
            operationalHours: true,
            equipmentPolicy: true,
            equipment: { select: { name: true, pricing: true, price: true, priceUnit: true } },
            sets: { select: { id: true, name: true, price: true }, orderBy: { position: "asc" } },
            packages: {
                where: { isActive: true },
                select: { title: true, offeredPrice: true, durationHours: true },
            },
        },
    });
    if (!listing) throw new ToolInputError("That studio is not available. Search again to get current studios.");
    return listing;
}

const getStudio: Handler = async (raw) => {
    const { studio_id } = z.object({ studio_id: objectId }).parse(raw);
    const listing = await loadPublicListing(studio_id);
    const curated = listing.listingType === "CURATED";
    const hours = listing.operationalHours as { start?: string; end?: string } | null;
    const days = listing.operationalDays as { start?: string; end?: string } | null;

    return {
        result: {
            id: listing.id,
            name: listing.title,
            city: listing.locationValue,
            online_booking: !curated,
            // Listing text is written by hosts: mask ways to reach them directly before the model sees it.
            description: maskContactDetails(listing.description).replace(/\s+/g, " ").slice(0, 700),
            price_per_hour: listing.price,
            price_range: curated && listing.priceRangeMin && listing.priceRangeMax ? { min: listing.priceRangeMin, max: listing.priceRangeMax } : null,
            extra_hour_price: listing.extraHourPrice,
            minimum_hours: listing.minimumBookingHours,
            max_people: listing.maximumPax,
            area_sqft: listing.carpetArea,
            rating: listing.avgReviewRating ? Math.round(listing.avgReviewRating * 10) / 10 : null,
            open: hours?.start && hours?.end ? `${hours.start} to ${hours.end}` : null,
            open_days: days?.start && days?.end ? `${days.start} to ${days.end}` : null,
            confirms_instantly: Boolean(listing.instantBooking),
            good_for: listing.type.slice(0, 6),
            venue: listing.venueTypes.slice(0, 4),
            look: listing.aesthetics.slice(0, 6),
            features: listing.setFeatures.slice(0, 10),
            amenities: [...listing.amenities, ...listing.otherAmenities].slice(0, 14),
            equipment: listing.equipment.slice(0, 14).map((item) => ({
                name: item.name,
                pricing: item.pricing,
                ...(item.pricing === "paid" && item.price ? { price: item.price, per: item.priceUnit ?? "per_booking" } : {}),
            })),
            sets: listing.hasSets ? listing.sets.slice(0, 10).map((set) => ({ name: set.name, price_per_hour: set.price })) : [],
            packages: listing.packages.slice(0, 6).map((pkg) => ({ name: pkg.title, price: pkg.offeredPrice, hours: pkg.durationHours })),
        },
    };
};

// ─── check_availability ───────────────────────────────────────────────────────

/** Free stretches of the day: what is left of the opening hours once every busy range is taken out. */
function freeWindows(busy: MinuteRange[], minimumMinutes: number): MinuteRange[] {
    const sorted = [...busy].sort((a, b) => a.start - b.start);
    const windows: MinuteRange[] = [];
    let cursor = 0;
    for (const range of sorted) {
        if (range.start > cursor) windows.push({ start: cursor, end: range.start });
        cursor = Math.max(cursor, range.end);
    }
    if (cursor < 1440) windows.push({ start: cursor, end: 1440 });
    return windows.filter((window) => window.end - window.start >= minimumMinutes);
}

const availabilitySchema = z.object({
    studio_id: objectId,
    date: dateKey,
    hours: z.number().min(0.5).max(24).optional(),
});

const checkAvailability: Handler = async (raw, ctx) => {
    const input = availabilitySchema.parse(raw);
    assertBookableDate(input.date);
    const listing = await loadPublicListing(input.studio_id);
    const studio = studioRef(listing);

    if (listing.listingType === "CURATED") {
        return {
            result: {
                studio: listing.title,
                online_booking: false,
                note: "Curated studio: availability is confirmed by the ContCave team, not online. Offer a handover.",
            },
        };
    }

    // The host's connected calendar counts as busy time too. If it can't be read, fall back to
    // bookings and blocks; the checkout re-checks everything before taking payment.
    const day =
        (await loadDayAvailability({ listingId: listing.id, date: input.date, includeCalendar: true }).catch(() => null)) ??
        (await loadDayAvailability({ listingId: listing.id, date: input.date }));
    if (!day) throw new ToolInputError("That studio is not available. Search again to get current studios.");

    const minimumHours = day.minimumMinutes / 60;
    if (!day.hours) {
        const closedReason = day.closedBy === "misconfigured" ? "Opening hours are not set up for this studio." : "The studio is closed on this date.";
        ctx.emit({
            type: "card",
            card: { type: "availability", studio, date: input.date, openHours: null, windows: [], minimumHours, closedReason },
        });
        return { result: { studio: listing.title, date: input.date, open: false, reason: closedReason } };
    }

    const needed = Math.max(day.minimumMinutes, Math.round((input.hours ?? 0) * 60));
    const windows = freeWindows(busyRanges(day), needed).map((window) => ({
        from: minutesToLabel(window.start),
        to: minutesToLabel(window.end),
    }));
    const openHours = `${minutesToLabel(day.hours.start)} – ${minutesToLabel(day.hours.end)}`;

    ctx.emit({
        type: "card",
        card: {
            type: "availability",
            studio,
            date: input.date,
            openHours,
            windows,
            minimumHours,
            closedReason: windows.length ? null : "No free slot long enough on this date.",
        },
    });

    return {
        result: {
            studio: listing.title,
            date: input.date,
            open: true,
            opening_hours: openHours,
            minimum_hours: minimumHours,
            free_windows: windows,
            ...(listing.hasSets ? { note: "This studio has several sets; the windows are when at least one set is free." } : {}),
        },
    };
};

// ─── quote_booking ────────────────────────────────────────────────────────────

const quoteSchema = z.object({
    studio_id: objectId,
    date: dateKey,
    start_time: clock,
    hours: z.number().min(0.5).max(24),
});

const quoteBooking: Handler = async (raw, ctx) => {
    const input = quoteSchema.parse(raw);
    assertBookableDate(input.date);
    const listing = await loadPublicListing(input.studio_id);

    if (listing.listingType === "CURATED") {
        return { result: { studio: listing.title, online_booking: false, note: "Curated studio: pricing is confirmed by the ContCave team. Offer a handover." } };
    }
    if (listing.hasSets) {
        return {
            result: {
                studio: listing.title,
                needs_set_choice: true,
                sets: listing.sets.slice(0, 10).map((set) => ({ name: set.name, price_per_hour: set.price })),
                note: "This studio is priced by the sets chosen. The exact total is shown on the studio page once sets are picked; use start_booking.",
            },
        };
    }
    if (!listing.price) throw new ToolInputError("This studio has no hourly price published. Offer a handover.");

    const start = toMinutes(input.start_time);
    const end = start + Math.round(input.hours * 60);
    if (end > 1440) throw new ToolInputError("That runs past midnight. Choose an earlier start or fewer hours.");
    const from = minutesToLabel(start);
    const to = minutesToLabel(end);

    const conflict = await checkBookingSlot({ listingId: listing.id, date: input.date, startTime: from, endTime: to, setIds: [] });
    if (conflict) {
        return { result: { studio: listing.title, date: input.date, from, to, available: false, reason: conflict } };
    }

    // Same sum the checkout does: hourly rate × hours, then GST on top (lib/pricing).
    const subtotal = Math.round(listing.price * input.hours);
    const { gstAmount, total } = addGst(subtotal);
    const hoursLabel = `${input.hours} ${input.hours === 1 ? "hour" : "hours"}`;
    const note = "Add-ons and paid equipment, if you pick any, are added on the studio page.";

    ctx.emit({
        type: "card",
        card: {
            type: "quote",
            studio: studioRef(listing),
            date: input.date,
            from,
            to,
            hours: input.hours,
            lines: [{ label: `${hoursLabel} × ₹${listing.price.toLocaleString("en-IN")}`, amount: subtotal }],
            gst: gstAmount,
            total,
            note,
        },
    });

    return {
        result: {
            studio: listing.title,
            date: input.date,
            from,
            to,
            hours: input.hours,
            available: true,
            price_per_hour: listing.price,
            subtotal,
            gst: gstAmount,
            total,
            note,
        },
    };
};

// ─── start_booking ────────────────────────────────────────────────────────────

const startSchema = z.object({
    studio_id: objectId,
    date: dateKey.optional(),
    start_time: clock.optional(),
    hours: z.number().min(0.5).max(24).optional(),
});

const startBooking: Handler = async (raw, ctx) => {
    const input = startSchema.parse(raw);
    const listing = await loadPublicListing(input.studio_id);
    if (listing.listingType === "CURATED") {
        return { result: { studio: listing.title, online_booking: false, note: "Curated studio: it cannot be booked online. Offer a handover." } };
    }
    const start = input.start_time ? toMinutes(input.start_time) : null;
    const end = start !== null && input.hours ? start + Math.round(input.hours * 60) : null;
    const studio = studioRef(listing);
    ctx.emit({
        type: "card",
        card: {
            type: "book",
            studio,
            date: input.date ?? null,
            from: start !== null ? minutesToLabel(start) : null,
            to: end !== null && end <= 1440 ? minutesToLabel(end) : null,
        },
    });
    return {
        result: {
            studio: listing.title,
            booking_page_shown: true,
            ...(ctx.channel === "whatsapp" ? { link: `${ctx.baseUrl}${studio.url}` } : {}),
            note: "The customer chooses the slot and pays on the studio page. Nothing is booked yet.",
        },
    };
};

// ─── create_shortlist_link ────────────────────────────────────────────────────

const shortlistSchema = z.object({
    studio_ids: z.array(objectId).min(2).max(6),
    date: dateKey.optional(),
    note: z.string().trim().max(200).optional(),
});

const createShortlistLink: Handler = async (raw, ctx) => {
    const input = shortlistSchema.parse(raw);
    const ids = Array.from(new Set(input.studio_ids));
    const listings = await prisma.listing.findMany({ where: { id: { in: ids }, ...PUBLIC_LISTING }, select: { id: true } });
    if (listings.length < 2) throw new ToolInputError("A shortlist needs at least two current studios. Search again.");

    const token = randomBytes(9).toString("base64url");
    await prisma.conciergeShortlist.create({
        data: {
            token,
            conversationId: ctx.state.id,
            // Keep the order the concierge chose.
            listingIds: ids.filter((id) => listings.some((listing) => listing.id === id)),
            date: input.date ?? null,
            note: input.note ? maskContactDetails(input.note) : null,
            expiresAt: new Date(Date.now() + SHORTLIST_TTL_DAYS * 86_400_000),
        },
    });
    const path = `/shortlist/${token}`;
    ctx.emit({ type: "card", card: { type: "shortlist", url: path, count: listings.length } });
    return {
        result: {
            created: true,
            studios: listings.length,
            valid_days: SHORTLIST_TTL_DAYS,
            ...(ctx.channel === "whatsapp" ? { link: `${ctx.baseUrl}${path}` } : {}),
        },
    };
};

// ─── draft_plan ───────────────────────────────────────────────────────────────

const draftPlanTool: Handler = async (_raw, ctx) => {
    const made = ctx.state.transcript.reduce((count, message) => count + message.cards.filter((card) => card.type === "plan").length, 0);
    if (made >= MAX_PLANS_PER_CONVERSATION) {
        return { result: { created: false, note: "Plan limit reached for this conversation. Refine the existing plan in words instead." } };
    }
    const { card } = await draftPlan(ctx.state.brief);
    ctx.emit({ type: "card", card });
    return {
        result: {
            created: true,
            title: card.title,
            blocks: card.schedule.length,
            shots: card.shots.length,
            has_budget_split: card.budget.length > 0,
            note: "The plan card is on screen. Do not repeat its contents.",
        },
    };
};

// ─── search_help ──────────────────────────────────────────────────────────────

const searchHelpTool: Handler = async (raw) => {
    const { query } = z.object({ query: z.string().trim().min(2).max(200) }).parse(raw);
    const articles = searchHelp(query);
    return {
        result: articles.length
            ? { articles: articles.map((article) => ({ title: article.title, text: article.body, page: article.path })) }
            : { articles: [], note: "Nothing on this in the help pages. Do not guess; offer a handover to the team." },
    };
};

// ─── update_brief ─────────────────────────────────────────────────────────────

const updateBrief: Handler = async (raw, ctx) => {
    const patch = briefPatchSchema.parse(raw);
    ctx.state.brief = mergeBrief(ctx.state.brief, patch);
    ctx.emit({ type: "brief", brief: ctx.state.brief });
    return { result: { saved: true } };
};

// ─── handoff_to_human ─────────────────────────────────────────────────────────

const handoffSchema = z.object({
    reason: z.string().trim().min(3).max(160),
    summary: z.string().trim().max(400).optional(),
});

const handoffToHuman: Handler = async (raw, ctx) => {
    const input = handoffSchema.parse(raw);
    const reason = maskContactDetails(input.reason);
    ctx.state.status = "HANDED_OFF";
    const summary = maskContactDetails(input.summary ?? "");
    const message = `Hi ContCave, I was chatting with your assistant (ref ${ctx.state.id.slice(-6)}). ${summary || reason}`;
    ctx.emit({ type: "card", card: { type: "handoff", url: buildWhatsAppUrl(message), reason } });
    return {
        handedOff: reason,
        result: { handed_over: true, note: "The team has the conversation. Tell the customer they can also continue on WhatsApp using the button shown." },
    };
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const HANDLERS: Record<string, Handler> = {
    update_brief: updateBrief,
    search_studios: searchStudios,
    get_studio: getStudio,
    check_availability: checkAvailability,
    quote_booking: quoteBooking,
    draft_plan: draftPlanTool,
    create_shortlist_link: createShortlistLink,
    start_booking: startBooking,
    search_help: searchHelpTool,
    handoff_to_human: handoffToHuman,
};

export { TOOL_DEFINITIONS, TOOL_STATUS } from "./toolSpecs";

export type ToolRun = { result: Record<string, unknown>; ok: boolean; error?: string; handedOff?: string; ms: number };

/** Run one tool call. Never throws: a failure becomes a result the model can read and recover from. */
export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolRun> {
    const started = performance.now();
    const handler = HANDLERS[name];
    if (!handler) return { ok: false, error: "unknown_tool", result: { error: `There is no tool called ${name}.` }, ms: 0 };
    try {
        const outcome = await handler(input ?? {}, ctx);
        return { ok: true, result: outcome.result, handedOff: outcome.handedOff, ms: performance.now() - started };
    } catch (error) {
        const ms = performance.now() - started;
        if (error instanceof z.ZodError) {
            const issue = error.issues[0];
            const message = `${issue.path.join(".") || "input"}: ${issue.message}`;
            return { ok: false, error: message, result: { error: message }, ms };
        }
        if (error instanceof ToolInputError) return { ok: false, error: error.message, result: { error: error.message }, ms };
        console.error(`[concierge] tool ${name} failed`, error instanceof Error ? error.message : error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : "unknown",
            result: { error: "That lookup failed on our side. Apologise briefly and offer to try again or hand over to the team." },
            ms,
        };
    }
}
