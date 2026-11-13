import "server-only";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";

import type { ChatMessage } from "./model";
import type { ConciergeBrief, TranscriptMessage } from "./types";

export type ConversationState = {
    id: string;
    channel: "WEB" | "WHATSAPP";
    visitorId: string;
    userId: string | null;
    status: "OPEN" | "HANDED_OFF" | "CLOSED";
    brief: ConciergeBrief;
    history: ChatMessage[];
    transcript: TranscriptMessage[];
    turnCount: number;
    crmContactId: string | null;
    crmEnquiryId: string | null;
};

const OBJECT_ID = /^[a-f\d]{24}$/i;
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

type Row = NonNullable<Awaited<ReturnType<typeof prisma.conciergeConversation.findFirst>>>;

const toState = (row: Row): ConversationState => ({
    id: row.id,
    channel: row.channel,
    visitorId: row.visitorId,
    userId: row.userId,
    status: row.status,
    brief: (row.brief ?? {}) as ConciergeBrief,
    history: (row.history ?? []) as unknown as ChatMessage[],
    transcript: (row.transcript ?? []) as unknown as TranscriptMessage[],
    turnCount: row.turnCount,
    crmContactId: row.crmContactId,
    crmEnquiryId: row.crmEnquiryId,
});

/**
 * A conversation belongs to the visitor cookie that started it (and to the
 * signed-in user, once there is one). An id from the browser is only honoured
 * when it belongs to this visitor, so one person can never read another's chat.
 */
export async function loadConversation(params: {
    conversationId?: string | null;
    visitorId: string;
    userId?: string | null;
}): Promise<ConversationState | null> {
    const owner: Prisma.ConciergeConversationWhereInput = params.userId
        ? { OR: [{ visitorId: params.visitorId }, { userId: params.userId }] }
        : { visitorId: params.visitorId };

    if (params.conversationId) {
        if (!OBJECT_ID.test(params.conversationId)) return null;
        const row = await prisma.conciergeConversation.findFirst({ where: { id: params.conversationId, ...owner } });
        return row ? toState(row) : null;
    }
    // No id: pick up the visitor's most recent conversation from the last week.
    const row = await prisma.conciergeConversation.findFirst({
        where: { ...owner, channel: "WEB", lastMessageAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        orderBy: { lastMessageAt: "desc" },
    });
    return row ? toState(row) : null;
}

export async function createConversation(params: { visitorId: string; userId?: string | null }): Promise<ConversationState> {
    const row = await prisma.conciergeConversation.create({
        data: { channel: "WEB", visitorId: params.visitorId, userId: params.userId ?? null, history: [], transcript: [], brief: {} },
    });
    return toState(row);
}

/** cacheRead and cacheWrite stay zero on servers that don't report prompt-cache use. */
export type TurnUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

/**
 * Save a finished turn. The write only lands if no other turn was saved in the
 * meantime (the turn count still matches), so two requests racing on one
 * conversation can never interleave their histories. Returns false when it lost.
 */
export async function saveTurn(state: ConversationState, usage: TurnUsage, handoffReason?: string | null): Promise<boolean> {
    const result = await prisma.conciergeConversation.updateMany({
        where: { id: state.id, turnCount: state.turnCount - 1 },
        data: {
            status: state.status,
            userId: state.userId,
            brief: asJson(state.brief),
            history: asJson(state.history),
            transcript: asJson(state.transcript),
            turnCount: state.turnCount,
            // crmContactId / crmEnquiryId are deliberately not written here. Only the CRM sync
            // sets them, after the reply has gone out; a turn that loaded the conversation a moment
            // earlier would otherwise write stale nulls back over them.
            lastMessageAt: new Date(),
            inputTokens: { increment: usage.input },
            outputTokens: { increment: usage.output },
            cacheReadTokens: { increment: usage.cacheRead },
            cacheWriteTokens: { increment: usage.cacheWrite },
            ...(handoffReason ? { handoffReason } : {}),
        },
    });
    return result.count === 1;
}

export async function logToolCall(entry: { conversationId: string; tool: string; input: unknown; ok: boolean; error?: string; ms: number }) {
    try {
        await prisma.conciergeToolCall.create({
            data: {
                conversationId: entry.conversationId,
                tool: entry.tool,
                input: asJson(entry.input ?? {}),
                ok: entry.ok,
                error: entry.error?.slice(0, 300) ?? null,
                ms: Math.round(entry.ms),
            },
        });
    } catch (error) {
        // The audit row must never break a customer's turn.
        console.error("[concierge] tool log failed", error instanceof Error ? error.message : error);
    }
}
