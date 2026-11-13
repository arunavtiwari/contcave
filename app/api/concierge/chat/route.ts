import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { after, type NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, readJsonObject } from "@/lib/api-utils";
import { conciergeEnabled, RATE_LIMITS, VISITOR_COOKIE } from "@/lib/concierge/config";
import { syncToCrm } from "@/lib/concierge/crm";
import { cleanUserMessage } from "@/lib/concierge/guardrails";
import { runTurn } from "@/lib/concierge/runtime";
import { createConversation, loadConversation } from "@/lib/concierge/store";
import type { ConciergeCard, ConciergeEvent } from "@/lib/concierge/types";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VISITOR_ID = /^[A-Za-z0-9_-]{16,40}$/;

/**
 * Conversations with a reply in progress on this instance. A second message to the same
 * conversation is turned away until the first finishes; across instances the save itself
 * is guarded (store.saveTurn).
 */
const inFlight = new Set<string>();
const MINUTE = 60_000;
const DAY = 86_400_000;

async function visitorId(): Promise<string> {
    const store = await cookies();
    const existing = store.get(VISITOR_COOKIE)?.value;
    if (existing && VISITOR_ID.test(existing)) return existing;
    const id = randomBytes(18).toString("base64url");
    // httpOnly: page scripts never see the id, so it cannot be read or replayed from the browser.
    store.set(VISITOR_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 180 * 24 * 60 * 60,
    });
    return id;
}

function sameOrigin(request: NextRequest): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    try {
        return new URL(origin).host.toLowerCase() === (request.headers.get("host") || request.nextUrl.host).toLowerCase();
    } catch {
        return false;
    }
}

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0]?.slice(0, 30) || null;

/** Restore the visitor's conversation when the chat opens. */
export async function GET() {
    if (!conciergeEnabled()) return createErrorResponse("The assistant is switched off.", 503);
    const store = await cookies();
    const visitor = store.get(VISITOR_COOKIE)?.value;
    if (!visitor || !VISITOR_ID.test(visitor)) return createSuccessResponse({ conversation: null });

    const user = await getCurrentUser();
    const state = await loadConversation({ visitorId: visitor, userId: user?.id });
    return createSuccessResponse({
        conversation: state
            ? { id: state.id, messages: state.transcript.slice(-60), brief: state.brief, handedOff: state.status === "HANDED_OFF" }
            : null,
    });
}

/**
 * One chat turn. The response is newline-delimited JSON (one ConciergeEvent
 * per line) so the reply, tool status and cards arrive as they happen.
 */
export async function POST(request: NextRequest) {
    if (!conciergeEnabled()) return createErrorResponse("The assistant is switched off.", 503);
    if (!sameOrigin(request)) return createErrorResponse("Forbidden", 403);

    const body = await readJsonObject(request, 8_000);
    if (!body.success) return body.response;
    const text = cleanUserMessage(body.data.message);
    if (!text) return createErrorResponse("Type a message first.", 400);
    const requestedId = typeof body.data.conversationId === "string" ? body.data.conversationId : null;
    const startNew = body.data.startNew === true;

    const visitor = await visitorId();
    const ip = getClientIp(request.headers);
    // Both the cookie and the address are limited: clearing cookies does not reset the allowance.
    const limits = [
        rateLimit({ key: `concierge:m:v:${visitor}`, limit: RATE_LIMITS.perMinute, windowMs: MINUTE }),
        rateLimit({ key: `concierge:m:ip:${ip}`, limit: RATE_LIMITS.perMinute * 3, windowMs: MINUTE }),
        rateLimit({ key: `concierge:d:v:${visitor}`, limit: RATE_LIMITS.perDay, windowMs: DAY }),
        rateLimit({ key: `concierge:d:ip:${ip}`, limit: RATE_LIMITS.perDay * 3, windowMs: DAY }),
    ];
    const blocked = limits.find((limit) => !limit.allowed);
    if (blocked) {
        const response = createErrorResponse("You're sending messages quickly. Give it a moment and try again.", 429);
        response.headers.set("Retry-After", formatRetryAfterMs(blocked.resetAt));
        return response;
    }

    const user = await getCurrentUser();
    const state =
        (startNew ? null : await loadConversation({ conversationId: requestedId, visitorId: visitor, userId: user?.id })) ??
        (await createConversation({ visitorId: visitor, userId: user?.id }));

    if (inFlight.has(state.id)) {
        return createErrorResponse("I'm still replying to your last message. Give me a moment.", 409);
    }
    inFlight.add(state.id);

    const encoder = new TextEncoder();
    const cards: ConciergeCard[] = [];
    let handedOff: string | null = null;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let open = true;
            const emit = (event: ConciergeEvent) => {
                if (event.type === "card") cards.push(event.card);
                if (!open) return;
                try {
                    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
                } catch {
                    // The customer closed the chat mid-reply; finish the turn and save it anyway.
                    open = false;
                }
            };

            emit({ type: "start", conversationId: state.id });
            try {
                const result = await runTurn({
                    state,
                    text,
                    user: user ? { id: user.id, firstName: firstName(user.name), isHost: user.role === "OWNER" } : null,
                    baseUrl: SITE_URL,
                    emit,
                });
                handedOff = result.handedOff;
            } catch (error) {
                console.error("[concierge] turn crashed", error instanceof Error ? error.message : error);
                emit({ type: "error", message: "Something went wrong on our side. Please try that again." });
            } finally {
                inFlight.delete(state.id);
                if (open) controller.close();
            }
        },
    });

    // The CRM is updated after the reply has gone out, so it can never slow the chat down.
    after(() =>
        syncToCrm({
            state,
            user: user ? { id: user.id, name: user.name ?? null, email: user.email ?? null, phone: user.phone ?? null } : null,
            cards,
            handedOff,
            siteUrl: SITE_URL,
        })
    );

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
        },
    });
}
