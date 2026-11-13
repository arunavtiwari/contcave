import "server-only";

import { randomUUID } from "node:crypto";

import { addDaysToDateKey, istDateKey } from "@/lib/booking/dayAvailability";

import { briefPatchSchema, isBriefEmpty, mergeBrief } from "./brief";
import {
    CONCIERGE_HISTORY_CHARS,
    CONCIERGE_MAX_TOKENS,
    CONCIERGE_MODEL,
    CONCIERGE_PROMPT_SUFFIX,
    hasModelAccess,
    MAX_TOOL_ROUNDS,
    MAX_TURNS_PER_CONVERSATION,
} from "./config";
import { fallbackReply } from "./fallback";
import { checkReply, collectDates, collectNumbers, MaskedStream } from "./guardrails";
import { searchHelp } from "./help";
import { windowHistory } from "./history";
import { MarkupFilter, stripMarkup } from "./markup";
import { type ChatMessage, chatStream, type ChatUsage, ModelError } from "./model";
import { extractBriefPatch, findStartTime } from "./parse";
import { conciergeSystemPrompt } from "./prompts";
import { routedReply, routeIntent } from "./router";
import { type ConversationState, logToolCall, saveTurn, type TurnUsage } from "./store";
import { runTool, TOOL_DEFINITIONS, TOOL_STATUS, type ToolContext } from "./tools";
import type { ConciergeCard, ConciergeEvent, TranscriptMessage } from "./types";

export type TurnInput = {
    state: ConversationState;
    text: string;
    /** From the verified session, never from the browser. */
    user: { id: string; firstName: string | null; isHost: boolean } | null;
    baseUrl: string;
    emit: (event: ConciergeEvent) => void;
};

export type TurnResult = { handedOff: string | null; usedModel: boolean };

const LINK_HOSTS = ["contcave.com"];

/**
 * Everything that varies per request goes here, on the customer's message,
 * and is stored with it. The system prompt and tools stay byte-identical, so
 * the model server can reuse its work on that prefix for every conversation.
 */
function contextBlock(input: TurnInput): string {
    const today = istDateKey(new Date());
    const weekday = new Date(`${today}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
    const who = input.user
        ? `signed in${input.user.firstName ? ` as ${input.user.firstName}` : ""}${input.user.isHost ? " (studio host)" : ""}`
        : "not signed in";
    const brief = isBriefEmpty(input.state.brief) ? "none yet" : JSON.stringify(input.state.brief);
    // Weekday-to-date arithmetic is where small models slip, so the next week is spelled out.
    const week = Array.from({ length: 8 }, (_, offset) => {
        const key = addDaysToDateKey(today, offset);
        const name = new Date(`${key}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
        return `${name} ${key}`;
    }).join(", ");
    return [
        "<context>",
        `today: ${weekday}, ${today} (India time)`,
        `coming days: ${week}`,
        `customer: ${who}`,
        `brief so far: ${brief}`,
        // Policy questions get the policy text handed to the model up front. A small model will
        // otherwise answer from memory, and its memory of ContCave's terms is invented.
        ...searchHelp(input.text, 1).map(
            (article) => `ContCave policy that applies (${article.title}), answer only from this: ${article.body}`
        ),
        "reminder: if the brief has a city or a kind of shoot, call search_studios in this turn before asking anything. Reply in at most three short sentences; the cards show the details.",
        "</context>",
    ].join("\n");
}

/** Tap-to-send next steps, chosen in code from what this turn put on screen. */
function suggestionsFor(cards: ConciergeCard[], state: ConversationState): string[] {
    const types = new Set(cards.map((card) => card.type));
    if (types.has("handoff")) return [];
    if (types.has("quote")) return ["Book this studio", "Plan the shoot day", "Show me other options"];
    if (types.has("availability")) return ["Price it for 4 hours", "Try another date", "Show similar studios"];
    if (types.has("plan")) return ["Find studios for this", "Make it a half day", "Send me a shortlist"];
    if (types.has("shortlist") || types.has("book")) return ["Plan the shoot day", "What's the cancellation policy?"];
    if (types.has("studios")) {
        return [state.brief.date ? "Check my date on the first one" : "Check this Saturday", "Show cheaper options", "Send me a shortlist"];
    }
    if (isBriefEmpty(state.brief)) return ["Product shoot in Delhi", "Podcast studio in Mumbai", "Fashion shoot under ₹2,000/hr"];
    return [];
}

/** The studios in the most recent results card, in the order the customer saw them. */
function lastStudiosShown(state: ConversationState) {
    for (let index = state.transcript.length - 1; index >= 0; index--) {
        const card = state.transcript[index].cards.find((entry) => entry.type === "studios");
        if (card && card.type === "studios") return card.items.map((item) => ({ id: item.id, title: item.title, bookable: item.bookable }));
    }
    return [];
}

const addUsage = (total: TurnUsage, usage: ChatUsage) => {
    total.input += usage.input;
    total.output += usage.output;
    total.cacheRead += usage.cached;
};

/**
 * One customer turn: append their message, let the model work through its
 * tools, stream the reply, check it, and save. Never throws to the caller; a
 * model failure falls through to the rule-based fallback so the customer
 * always gets an answer.
 */
export async function runTurn(input: TurnInput): Promise<TurnResult> {
    const { state, emit } = input;
    const usage: TurnUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    const cards: ConciergeCard[] = [];
    let handedOff: string | null = null;
    let streamedText = "";

    const ctx: ToolContext = {
        state,
        baseUrl: input.baseUrl,
        channel: "web",
        emit: (event) => {
            if (event.type === "card") cards.push(event.card);
            emit(event);
        },
    };

    const userMessage: TranscriptMessage = {
        id: randomUUID(),
        role: "user",
        text: input.text,
        cards: [],
        at: new Date().toISOString(),
    };
    // Facts stated outright are saved by rule first, so the brief (and the dates in it) never depend on the model.
    const stated = briefPatchSchema.safeParse(extractBriefPatch(input.text));
    const namedPlaceOrShoot = stated.success && Boolean(stated.data.city || stated.data.shoot_type);
    // A keyword in a later message ("instagram", "video") must not rename a shoot the customer already described.
    if (stated.success && state.brief.shootType) delete stated.data.shoot_type;
    if (stated.success && Object.keys(stated.data).length > 0) {
        state.brief = mergeBrief(state.brief, stated.data);
        emit({ type: "brief", brief: state.brief });
    }
    state.history.push({ role: "user", content: `${contextBlock(input)}\n\n${input.text}` });

    let reply = "";
    let usedModel = false;

    // Tier 0: turns that need no judgement are routed in code (lib/concierge/router.ts). The tool
    // runs here and the model writes its reply with the result already in hand.
    const routed =
        hasModelAccess() && state.turnCount < MAX_TURNS_PER_CONVERSATION
            ? routeIntent({
                  text: input.text,
                  brief: state.brief,
                  namedPlaceOrShoot,
                  studiosShown: state.transcript.some((message) => message.cards.some((card) => card.type === "studios")),
                  alreadyHandedOff: state.status === "HANDED_OFF",
                  shown: lastStudiosShown(state),
                  startTime: findStartTime(input.text),
              })
            : null;
    let routedResult: Record<string, unknown> | null = null;
    if (routed) {
        emit({ type: "status", text: TOOL_STATUS[routed.tool] ?? "Working on it" });
        const run = await runTool(routed.tool, routed.args, ctx);
        routedResult = run.result;
        if (run.handedOff) handedOff = run.handedOff;
        void logToolCall({ conversationId: state.id, tool: routed.tool, input: routed.args, ok: run.ok, error: run.error, ms: run.ms });
        const id = `routed_${state.turnCount}`;
        state.history.push(
            { role: "assistant", content: "", tool_calls: [{ id, type: "function", function: { name: routed.tool, arguments: JSON.stringify(routed.args) } }] },
            { role: "tool", tool_call_id: id, content: JSON.stringify(run.result) }
        );
    }

    if (state.turnCount >= MAX_TURNS_PER_CONVERSATION) {
        // A conversation this long is costing money and not getting anywhere: a person should take it.
        const run = await runTool("handoff_to_human", { reason: "Long conversation", summary: input.text.slice(0, 300) }, ctx);
        handedOff = run.handedOff ?? "Long conversation";
        reply = "We've covered a lot here, so I've asked the ContCave team to pick this up and get it sorted for you. You can continue with them on WhatsApp using the button below.";
        state.history.push({ role: "assistant", content: reply });
        streamedText = reply;
        emit({ type: "text", delta: reply });
    } else if (hasModelAccess()) {
        try {
            const masked = new MaskedStream({ allowLinkHosts: LINK_HOSTS });
            const suffix = CONCIERGE_PROMPT_SUFFIX();
            const system = `${conciergeSystemPrompt("web", { host: input.user?.isHost })}${suffix ? `\n\n${suffix}` : ""}`;
            const show = (text: string) => {
                const safe = masked.push(text);
                if (safe) emit({ type: "text", delta: safe });
            };

            for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                const markup = new MarkupFilter();
                const result = await chatStream({
                    model: CONCIERGE_MODEL(),
                    maxTokens: CONCIERGE_MAX_TOKENS,
                    // The system prompt and tools are identical on every request; only the conversation grows.
                    messages: [{ role: "system", content: system }, ...windowHistory(state.history, CONCIERGE_HISTORY_CHARS)],
                    tools: TOOL_DEFINITIONS,
                    onText: (delta) => show(markup.push(delta)),
                });
                show(markup.flush());
                usedModel = true;
                addUsage(usage, result.usage);

                const text = stripMarkup(result.text);
                // A reply cut off by the token limit can carry a half-written tool call: never run it.
                const calls = result.finishReason === "length" ? [] : result.toolCalls;

                if (calls.length === 0) {
                    state.history.push({ role: "assistant", content: text || "(no reply)" });
                    break;
                }

                state.history.push({
                    role: "assistant",
                    content: text,
                    tool_calls: calls.map((call) => ({ id: call.id, type: "function" as const, function: { name: call.name, arguments: call.arguments } })),
                });

                for (const call of calls) {
                    emit({ type: "status", text: TOOL_STATUS[call.name] ?? "Working on it" });
                    let args: unknown;
                    let parseError: string | null = null;
                    try {
                        args = call.arguments.trim() ? JSON.parse(call.arguments) : {};
                    } catch {
                        parseError = "The arguments were not valid JSON. Call the tool again with a JSON object.";
                    }
                    const run = parseError
                        ? { ok: false, error: parseError, result: { error: parseError }, ms: 0, handedOff: undefined }
                        : await runTool(call.name, args, ctx);
                    if (run.handedOff) handedOff = run.handedOff;
                    void logToolCall({ conversationId: state.id, tool: call.name, input: args ?? call.arguments, ok: run.ok, error: run.error, ms: run.ms });
                    state.history.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(run.result) });
                }

                if (round === MAX_TOOL_ROUNDS - 1) {
                    // Out of rounds with results still unanswered: close the turn ourselves so the history stays well-formed.
                    const closing = "I've pulled that together above. What would you like to do next?";
                    state.history.push({ role: "assistant", content: closing });
                    show(`${masked.text ? "\n\n" : ""}${closing}`);
                } else if (masked.text) {
                    // Text before a tool call and text after it are separate thoughts.
                    masked.push("\n\n");
                }
            }

            const rest = masked.flush();
            if (rest) emit({ type: "text", delta: rest });
            streamedText = masked.text.trim();
            reply ||= streamedText;
        } catch (error) {
            if (error instanceof ModelError) {
                console.error(`[concierge] model server${error.status ? ` ${error.status}` : ""}: ${error.message}`);
            } else {
                console.error("[concierge] turn failed", error instanceof Error ? error.message : error);
            }
            reply = "";
        }
    }

    if (!reply) {
        // No model server, or the call failed: answer from rules over the same tools.
        // If the failure left tool results unanswered, the fallback's text closes that exchange.
        const last = state.history[state.history.length - 1] as ChatMessage | undefined;
        if (last?.role === "assistant") state.history.push({ role: "user", content: "(continue)" });
        // A routed tool has already run and shown its card: say what it is; don't run it again.
        reply = routed && routedResult ? routedReply(routed, routedResult, state.brief) : await fallbackReply(state, input.text, ctx);
        state.history.push({ role: "assistant", content: reply });
        emit(streamedText ? { type: "replace", text: reply } : { type: "text", delta: reply });
        streamedText = reply;
    }

    // Guardrails on the finished reply: amounts must come from a tool or the customer.
    // Only what tools returned and what the customer wrote counts as known. The assistant's own
    // words are left out, or an invented figure would vouch for itself.
    const sources = state.history.filter((message) => message.role === "tool" || message.role === "user").map((message) => message.content);
    const known = collectNumbers([sources, state.brief]);
    const checked = checkReply(reply, known, { allowLinkHosts: LINK_HOSTS, knownDates: collectDates([sources, state.brief]),
        pricesOnScreen: cards.some((card) => card.type === "studios" || card.type === "quote"),
    });
    // Only a real removal is worth redrawing the reply for; tidied whitespace is not.
    if (checked.reasons.length > 0 && checked.text !== streamedText) {
        console.warn(`[concierge] reply rewritten (${checked.reasons.join(", ")}) in ${state.id}`);
        emit({ type: "replace", text: checked.text });
    }

    // What the model remembers saying is the checked text, so a removed claim can't resurface on a later turn.
    // This message has not been sent to the model server yet, so replacing it leaves the reused prefix intact.
    for (let index = state.history.length - 1; index >= 0; index--) {
        const message = state.history[index];
        if (message.role === "assistant" && !message.tool_calls?.length) {
            message.content = checked.text;
            break;
        }
        if (message.role === "user") break;
    }

    const assistantMessage: TranscriptMessage = {
        id: randomUUID(),
        role: "assistant",
        text: checked.text,
        cards,
        at: new Date().toISOString(),
    };
    state.transcript.push(userMessage, assistantMessage);
    state.turnCount += 1;
    if (input.user && !state.userId) state.userId = input.user.id;

    const saved = await saveTurn(state, usage, handedOff);
    if (!saved) console.warn(`[concierge] turn in ${state.id} was not saved: another turn finished first`);

    const suggestions = suggestionsFor(cards, state);
    if (suggestions.length) emit({ type: "suggestions", items: suggestions });
    emit({ type: "done", message: assistantMessage, handedOff: Boolean(handedOff) });

    return { handedOff, usedModel };
}
