import "server-only";

import { searchHelp } from "./help";
import { findBudgetPerHour, findCity, findDate, findHours, findPeople, findStartTime, SHOOT_KEYWORDS } from "./parse";
import { resolveStudio } from "./router";
import type { ConversationState } from "./store";
import { runTool, type ToolContext } from "./tools";
import type { ConciergeCard, StudioCardItem } from "./types";

/**
 * The concierge with no model behind it. Used when there is no API key (local
 * development, previews) and as the outage fallback when the model API fails,
 * so the chat never goes dark: it can still search, check dates, answer
 * policy questions, make a shortlist and hand over to the team.
 *
 * It is deliberately simple — keyword rules over the same tools the model
 * uses — and it never states a fact a tool did not return.
 */

/** The studio the customer is talking about: named in this message, else in their most recent one that named one. */
function focusStudio(state: ConversationState, text: string, shown: StudioCardItem[]): StudioCardItem | undefined {
    const direct = resolveStudio(text, shown);
    if (direct) return direct;
    for (let index = state.transcript.length - 1; index >= 0; index--) {
        const message = state.transcript[index];
        if (message.role !== "user") continue;
        const earlier = resolveStudio(message.text, shown);
        if (earlier) return earlier;
    }
    return undefined;
}

const lastStudios = (state: ConversationState) => {
    for (let index = state.transcript.length - 1; index >= 0; index--) {
        const card = state.transcript[index].cards.find((entry): entry is Extract<ConciergeCard, { type: "studios" }> => entry.type === "studios");
        if (card) return card.items;
    }
    return [];
};

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export async function fallbackReply(state: ConversationState, text: string, ctx: ToolContext): Promise<string> {
    const lower = text.toLowerCase();

    // 1. A person, please.
    if (/\b(human|agent|person|someone|call me|talk to|speak to|support|complain|complaint)\b/.test(lower)) {
        await runTool("handoff_to_human", { reason: "Customer asked for a person", summary: text.slice(0, 300) }, ctx);
        return "Of course. I've passed this to the ContCave team, and you can continue with them on WhatsApp using the button below.";
    }

    // 2. Policy questions.
    if (/\b(cancel|refund|gst|invoice|curated|verified|policy|how (?:do|does)|extend|list my|payout)\b/.test(lower)) {
        const [article] = searchHelp(text, 1);
        if (article) return `${article.body}${article.path ? "" : ""}\n\nAnything else you'd like to know, or shall we find you a studio?`;
    }

    // 3. Work out what they told us and keep it.
    const shoot = SHOOT_KEYWORDS.find(([pattern]) => pattern.test(text));
    const patch = {
        city: findCity(text),
        date: findDate(text),
        shoot_type: shoot?.[2],
        hours: findHours(text),
        people: findPeople(text),
        budget_per_hour: findBudgetPerHour(text),
    };
    const learned = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    if (Object.keys(learned).length > 0) await runTool("update_brief", learned, ctx);
    const brief = state.brief;
    const shown = lastStudios(state);

    // 4. Things to do with studios already on screen.
    if (shown.length >= 2 && /\b(shortlist|share|send (?:me|these|them|it)|link|compare)\b/.test(lower)) {
        const run = await runTool("create_shortlist_link", { studio_ids: shown.map((studio) => studio.id), ...(brief.date ? { date: brief.date } : {}) }, ctx);
        return run.ok
            ? "Here's a page with these studios that you can share. It stays live for 30 days."
            : "I couldn't make that shortlist just now. Want me to search again?";
    }
    if (/\b(plan|schedule|shot ?list|checklist|itinerary)\b/.test(lower)) {
        const run = await runTool("draft_plan", {}, ctx);
        return run.ok && run.result.created
            ? "Here's a plan for the day. Tell me what to change, or give me the hours and a total budget and I'll tighten it."
            : "I've already drafted a few plans in this chat. Tell me what you'd change and we'll refine it together.";
    }
    const focus = focusStudio(state, text, shown);
    const namedNow = focus && lower.includes(focus.title.toLowerCase());
    const startTime = findStartTime(text);

    if (focus && !focus.bookable && (namedNow || /\b(enquir|book|price|quote|check)/.test(lower))) {
        await runTool("handoff_to_human", { reason: `Enquiry for curated studio ${focus.title}`, summary: `Wants ${focus.title}${brief.date ? ` on ${brief.date}` : ""}.` }, ctx);
        return `**${focus.title}** is a curated studio, so the ContCave team confirms the details with the studio for you. I've passed your enquiry on, and you can continue with them on WhatsApp below.`;
    }
    if (focus && /\b(book|reserve|go ahead|confirm)\b/.test(lower) && !/\bhow\b/.test(lower)) {
        await runTool("start_booking", { studio_id: focus.id, ...(brief.date ? { date: brief.date } : {}), ...(startTime ? { start_time: startTime } : {}), ...(brief.hours ? { hours: brief.hours } : {}) }, ctx);
        return `Here's the booking page for **${focus.title}**. You choose the slot and pay there; nothing is booked until then.`;
    }
    if (focus && startTime && brief.date) {
        const run = await runTool("quote_booking", { studio_id: focus.id, date: brief.date, start_time: startTime, hours: brief.hours ?? 4 }, ctx);
        if (!run.ok) return `${String(run.result.error ?? "I couldn't price that.")} Want to try a different time?`;
        if (run.result.needs_set_choice) return `**${focus.title}** is priced by the sets you pick, so the exact total shows on its page. Want the booking link?`;
        if (run.result.available === false) return `That slot isn't available: ${String(run.result.reason ?? "it overlaps another booking")} Want to try another time?`;
        return `That's the exact price for ${brief.hours ?? 4} hours, GST included.${brief.hours ? "" : " I assumed 4 hours; tell me if you need longer or shorter."} Shall I take you to the booking page?`;
    }
    if (focus && namedNow && !brief.date) {
        return `Sure. Which date do you have in mind for **${focus.title}**?`;
    }
    if (shown.length > 0 && (patch.date || (namedNow && brief.date)) && !patch.city && !shoot) {
        const pick = focus ?? shown.find((studio) => studio.bookable) ?? shown[0];
        const run = await runTool("check_availability", { studio_id: pick.id, date: brief.date!, ...(brief.hours ? { hours: brief.hours } : {}) }, ctx);
        if (!run.ok) return `${String(run.result.error ?? "I couldn't check that date.")} Want to try another date?`;
        const windows = (run.result.free_windows as unknown[] | undefined)?.length ?? 0;
        return windows > 0
            ? `**${pick.title}** has free time that day. Pick a start time and how many hours, and I'll price it exactly.`
            : `**${pick.title}** has nothing free that day. Shall I look for studios that are open then?`;
    }

    // 5. Search when there is something to search on.
    if (brief.city || shoot || patch.budget_per_hour) {
        const shootSlug = shoot?.[1] ?? SHOOT_KEYWORDS.find(([, , label]) => label === brief.shootType)?.[1];
        const run = await runTool(
            "search_studios",
            {
                ...(brief.city ? { city: brief.city } : {}),
                ...(shootSlug ? { shoot_type: shootSlug } : {}),
                ...(brief.date ? { date: brief.date } : {}),
                ...(brief.budgetPerHour ? { max_price_per_hour: brief.budgetPerHour } : {}),
                ...(brief.people ? { min_people: brief.people } : {}),
            },
            ctx
        );
        const studios = (run.result.studios as { name: string }[] | undefined) ?? [];
        if (!run.ok) return "That search failed on my side. Could you try again in a moment?";
        if (studios.length === 0) return `${String(run.result.note ?? "I couldn't find a match.")} Want to try a different city or date?`;

        const relaxed = (run.result.relaxed_filters as string[] | undefined) ?? [];
        const where = brief.city ? ` in ${brief.city}` : "";
        const forWhat = brief.shootType ? ` for a ${brief.shootType}` : "";
        const cap = brief.budgetPerHour && !relaxed.includes("budget") ? ` under ${rupees(brief.budgetPerHour)} an hour` : "";
        const loosened = relaxed.length
            ? ` Nothing matched everything, so I loosened the ${relaxed.map((key) => key.replace("_", " ")).join(" and ")}.`
            : "";
        const missing = [!brief.city && "the city", !brief.date && "your date", !brief.hours && "how many hours you need"].filter(Boolean);
        const ask = missing.length ? ` Tell me ${missing.join(" and ")} and I'll narrow it down.` : " Want me to check your date on one of these, or send them as a shortlist?";
        return `Here are ${studios.length} studios${where}${forWhat}${cap}.${loosened}${ask}`;
    }

    // 6. Nothing to go on yet.
    if (state.transcript.length === 0 || /\b(hi|hello|hey|namaste|hola)\b/.test(lower)) {
        return "Hi, I'm Cave, ContCave's booking assistant. Tell me the city, what you're shooting and roughly when, and I'll find studios that fit your budget.";
    }
    return "I can help you find and book a studio. Which city is the shoot in, and what are you shooting?";
}
