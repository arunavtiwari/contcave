import { SHOOT_KEYWORDS } from "./parse";
import type { ConciergeBrief } from "./types";

/**
 * Decisions that need no judgement are made here, in code, before the model
 * runs. A small open model will sometimes ask a question when it should
 * search, or keep talking when someone asks for a person; these three cases
 * are too important to leave to it. The tool is run by the runtime and its
 * result is put in front of the model, which then only has to write the reply.
 * It also saves a model round on the most common turns.
 *
 * Anything not matched here is left entirely to the model.
 */

export type ShownStudio = { id: string; title: string; bookable: boolean };

/** The studio a message points at: by name, or by position ("the first one", "2nd option", "last one"). */
export function resolveStudio<T extends { title: string }>(text: string, shown: T[]): T | undefined {
    const lower = text.toLowerCase();
    const named = shown.find((studio) => lower.includes(studio.title.toLowerCase()));
    if (named) return named;
    const ordinal = lower.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|last)\b/)?.[1];
    if (!ordinal) return shown.length === 1 && /\b(it|this|that)\b/.test(lower) ? shown[0] : undefined;
    const position = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, fourth: 3, "4th": 3, last: shown.length - 1 }[ordinal];
    return position === undefined ? undefined : shown[position];
}

export type RoutedTool =
    | { tool: "start_booking"; args: Record<string, unknown> }
    | { tool: "handoff_to_human"; args: { reason: string; summary: string } }
    | { tool: "draft_plan"; args: Record<string, never> }
    | { tool: "search_studios"; args: Record<string, unknown> };

const WANTS_PERSON =
    /\b(human|real person|actual person|live agent|customer (?:care|support|service)|call me(?: back)?|(?:talk|speak|chat|connect me)\s+(?:to|with)\s+(?:a\s+|an\s+|some\s?)?(?:person|one|human|agent|someone|somebody|representative|member|the team|your team|support))\b/i;

/** Something has gone wrong with a booking or payment that already exists. */
const HAS_PROBLEM =
    /\b(money back|refund me|(?:want|need|demand|give me)\s+(?:a\s+|my\s+|the\s+)?(?:full\s+)?refund|complain|complaint|was locked|were locked|nobody (?:came|showed|was there)|no one (?:came|showed|was there)|(?:charged|debited)\s+(?:me\s+)?(?:twice|two times|double)|double charged|payment (?:failed|went through) but|studio (?:was|is) (?:dirty|closed|shut)|host (?:didn'?t|did not|never) (?:show|come|turn up|respond))\b/i;

const WANTS_PLAN = /\b(plan|schedule|itinerary|shot ?list|call ?sheet|checklist)\b/i;
/** Asking how planning works, or planning to do something, is not a request for a plan. */
const NOT_A_PLAN = /\b(plan(?:ning)? to|cancellation|payment plan|floor plan)\b/i;

const WANTS_TO_BOOK = /\b(book|reserve|go ahead with|proceed with|lock in|finali[sz]e)\b/i;
/** Asking how booking works, or talking about a booking that already exists, is not a request to book. */
const NOT_BOOKING_NOW = /\b(how (?:do|does|can|to)|booked|my booking|existing booking|booking (?:policy|process|fee|id|reference)|before (?:i )?book)\b/i;

const POLICY = /\b(cancel|refund|gst|invoice|policy|curated|verified)\b/i;

export function shootSlugFor(text: string, brief: ConciergeBrief): string | undefined {
    return SHOOT_KEYWORDS.find(([pattern, , label]) => pattern.test(text) || label === brief.shootType)?.[1];
}

export function routeIntent(params: {
    text: string;
    brief: ConciergeBrief;
    /** This message itself named a city or a kind of shoot. */
    namedPlaceOrShoot: boolean;
    studiosShown: boolean;
    alreadyHandedOff: boolean;
    /** The studios most recently on screen, in order. */
    shown?: ShownStudio[];
    /** A start time stated in this message, as HH:MM. */
    startTime?: string;
}): RoutedTool | null {
    const { text, brief } = params;

    if (!params.alreadyHandedOff && (WANTS_PERSON.test(text) || HAS_PROBLEM.test(text))) {
        return {
            tool: "handoff_to_human",
            args: {
                reason: HAS_PROBLEM.test(text) ? "Problem with a booking or payment" : "Customer asked for a person",
                summary: text.replace(/\s+/g, " ").slice(0, 300),
            },
        };
    }

    // "Book the first one": a verified studio goes to its booking page; a curated one goes to the team.
    if (WANTS_TO_BOOK.test(text) && !NOT_BOOKING_NOW.test(text) && !POLICY.test(text)) {
        const studio = resolveStudio(text, params.shown ?? []);
        if (studio && !studio.bookable && !params.alreadyHandedOff) {
            return { tool: "handoff_to_human", args: { reason: `Enquiry for curated studio ${studio.title}`, summary: text.replace(/\s+/g, " ").slice(0, 300) } };
        }
        if (studio?.bookable) {
            return {
                tool: "start_booking",
                args: {
                    studio_id: studio.id,
                    ...(brief.date ? { date: brief.date } : {}),
                    ...(params.startTime ? { start_time: params.startTime } : {}),
                    ...(brief.hours ? { hours: brief.hours } : {}),
                },
            };
        }
    }

    if (WANTS_PLAN.test(text) && !NOT_A_PLAN.test(text) && !POLICY.test(text)) {
        return { tool: "draft_plan", args: {} };
    }

    const slug = shootSlugFor(text, brief);
    if (params.namedPlaceOrShoot && !params.studiosShown && !POLICY.test(text) && brief.city && slug) {
        return {
            tool: "search_studios",
            args: {
                city: brief.city,
                shoot_type: slug,
                ...(brief.date ? { date: brief.date } : {}),
                ...(brief.budgetPerHour ? { max_price_per_hour: brief.budgetPerHour } : {}),
                ...(brief.people ? { min_people: brief.people } : {}),
            },
        };
    }

    return null;
}

/**
 * The reply to give when a routed tool has already run and the model then could not be reached.
 * The tool's card is on screen, so this only has to say what it is, without running anything again.
 */
export function routedReply(routed: RoutedTool, result: Record<string, unknown>, brief: ConciergeBrief): string {
    switch (routed.tool) {
        case "handoff_to_human":
            return "Of course. I've passed this to the ContCave team, and you can continue with them on WhatsApp using the button below.";
        case "draft_plan":
            return result.created
                ? "Here's a plan for the day. Tell me what to change and I'll adjust it."
                : "I've already drafted a few plans in this chat. Tell me what you'd change and we'll refine it together.";
        case "start_booking":
            return result.booking_page_shown
                ? "Here's the booking page. You choose the slot and pay there; nothing is booked until then."
                : "That studio can't be booked online, so the ContCave team will confirm it with the studio for you.";
        case "search_studios": {
            const studios = Array.isArray(result.studios) ? result.studios.length : 0;
            if (studios === 0) return `${typeof result.note === "string" ? result.note : "I couldn't find a match."} Want to try a different city or date?`;
            const relaxed = Array.isArray(result.relaxed_filters) ? (result.relaxed_filters as string[]) : [];
            const loosened = relaxed.length ? ` Nothing matched everything, so I loosened the ${relaxed.map((key) => key.replace("_", " ")).join(" and ")}.` : "";
            const missing = [!brief.date && "your date", !brief.hours && "how many hours you need"].filter(Boolean);
            const next = missing.length ? ` Tell me ${missing.join(" and ")} and I'll narrow it down.` : " Want me to check your date on one of these?";
            return `Here ${studios === 1 ? "is 1 studio" : `are ${studios} studios`}${brief.city ? ` in ${brief.city}` : ""}${brief.shootType ? ` for a ${brief.shootType}` : ""}.${loosened}${next}`;
        }
    }
}
