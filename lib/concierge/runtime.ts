import "server-only";

import { randomUUID } from "node:crypto";

import { addDaysToDateKey, istDateKey } from "@/lib/booking/dayAvailability";

import { isBriefEmpty } from "./brief";
import { CONCIERGE_HISTORY_CHARS, CONCIERGE_MAX_TOKENS, MAX_TOOL_ROUNDS, MAX_TURNS_PER_CONVERSATION } from "./config";
import { checkReply, collectDates, collectNumbers, MaskedStream } from "./guardrails";
import { searchHelp } from "./help";
import { windowHistory } from "./history";
import { chatStream, type ChatUsage } from "./model";
import { conciergeSystemPrompt } from "./prompts";
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
const PARAGRAPH = "\n\n";

/**
 * Everything that varies per request goes here, on the customer's message,
 * and is stored with it. The system prompt and tools stay byte-identical, so
 * Gemini's implicit cache can reuse that prefix for every conversation.
 */
function contextBlock(input: TurnInput): string {
    const today = istDateKey(new Date());
    const weekday = new Date(`${today}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
    const who = input.user
        ? `signed in${input.user.firstName ? ` as ${input.user.firstName}` : ""}${input.user.isHost ? " (studio host)" : ""}`
        : "not signed in";
    const brief = isBriefEmpty(input.state.brief) ? "none yet" : JSON.stringify(input.state.brief);
    // Dates are spelled out so the model never does weekday arithmetic.
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
        // Policy text is handed over up front so answers come from ContCave's terms, not the model's memory.
        ...searchHelp(input.text, 1).map(
            (article) => `ContCave policy that applies (${article.title}), answer only from this: ${article.body}`
        ),
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

const addUsage = (total: TurnUsage, usage: ChatUsage) => {
    total.input += usage.input;
    total.output += usage.output;
    total.cacheRead += usage.cached;
};

/**
 * One customer turn: append their message, let the model work through its
 * tools, stream the reply, check it, and save. Never throws to the caller; a
 * model failure ends the turn with an apology the customer can retry from.
 */
export async function runTurn(input: TurnInput): Promise<TurnResult> {
    const { state, emit } = input;
    const usage: TurnUsage = { input: 0, output: 0, cacheRead: 0 };
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
    state.history.push({ role: "user", content: `${contextBlock(input)}${PARAGRAPH}${input.text}` });

    let reply = "";
    let usedModel = false;

    if (state.turnCount >= MAX_TURNS_PER_CONVERSATION) {
        const run = await runTool("handoff_to_human", { reason: "Long conversation", summary: input.text.slice(0, 300) }, ctx);
        handedOff = run.handedOff ?? "Long conversation";
        reply = "We've covered a lot here, so I've asked the ContCave team to pick this up and get it sorted for you. You can continue with them on WhatsApp using the button below.";
        state.history.push({ role: "assistant", content: reply });
        streamedText = reply;
        emit({ type: "text", delta: reply });
    } else {
        try {
            const masked = new MaskedStream({ allowLinkHosts: LINK_HOSTS });
            const system = conciergeSystemPrompt("web", { host: input.user?.isHost });
            const show = (text: string) => {
                const safe = masked.push(text);
                if (safe) emit({ type: "text", delta: safe });
            };

            for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                const result = await chatStream({
                    maxTokens: CONCIERGE_MAX_TOKENS,
                    messages: [{ role: "system", content: system }, ...windowHistory(state.history, CONCIERGE_HISTORY_CHARS)],
                    tools: TOOL_DEFINITIONS,
                    onText: show,
                });
                usedModel = true;
                addUsage(usage, result.usage);

                const calls = result.finishReason === "length" ? [] : result.toolCalls;

                if (calls.length === 0) {
                    state.history.push({ role: "assistant", content: result.text || "(no reply)" });
                    break;
                }

                state.history.push({
                    role: "assistant",
                    content: result.text,
                    tool_calls: calls.map((call) => ({
                        id: call.id,
                        type: "function" as const,
                        function: { name: call.name, arguments: call.arguments },
                        ...(call.signature ? { signature: call.signature } : {}),
                    })),
                });

                for (const call of calls) {
                    emit({ type: "status", text: TOOL_STATUS[call.name] ?? "Working on it" });
                    const args: unknown = JSON.parse(call.arguments);
                    const run = await runTool(call.name, args, ctx);
                    if (run.handedOff) handedOff = run.handedOff;
                    void logToolCall({ conversationId: state.id, tool: call.name, input: args, ok: run.ok, error: run.error, ms: run.ms });
                    state.history.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(run.result) });
                }

                if (round === MAX_TOOL_ROUNDS - 1) {
                    const closing = "I've pulled that together above. What would you like to do next?";
                    state.history.push({ role: "assistant", content: closing });
                    show(`${masked.text ? PARAGRAPH : ""}${closing}`);
                } else if (masked.text) {
                    masked.push(PARAGRAPH);
                }
            }

            const rest = masked.flush();
            if (rest) emit({ type: "text", delta: rest });
            streamedText = masked.text.trim();
            reply = streamedText;
        } catch (error) {
            console.error("[concierge] model call failed", error instanceof Error ? error.message : error);
        }
    }

    if (!reply) {
        reply = "Sorry, I couldn't finish that just now. Please send it again in a moment, or ask for the ContCave team and a person will help.";
        if (state.history[state.history.length - 1]?.role !== "assistant") state.history.push({ role: "assistant", content: reply });
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
