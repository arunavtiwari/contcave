"use client";

import { useCallback, useRef, useState } from "react";

import type { ConciergeBrief, ConciergeCard, ConciergeEvent, TranscriptMessage } from "@/lib/concierge/types";

export type PendingReply = {
    text: string;
    cards: ConciergeCard[];
    /** What the assistant is doing right now, e.g. "Searching studios". */
    status: string | null;
};

type State = {
    conversationId: string | null;
    messages: TranscriptMessage[];
    pending: PendingReply | null;
    brief: ConciergeBrief;
    suggestions: string[];
    handedOff: boolean;
    error: string | null;
    restored: boolean;
};

const INITIAL: State = {
    conversationId: null,
    messages: [],
    pending: null,
    brief: {},
    suggestions: [],
    handedOff: false,
    error: null,
    restored: false,
};

const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Chat state for the concierge widget: restores the visitor's conversation,
 * sends a turn, and applies the reply as it streams in.
 */
export function useConcierge() {
    const [state, setState] = useState<State>(INITIAL);
    const abortRef = useRef<AbortController | null>(null);
    const restoringRef = useRef(false);
    const startNewRef = useRef(false);
    // Read by send() at call time; state updaters run later, during render, so they can't supply it.
    const conversationIdRef = useRef<string | null>(null);

    const restore = useCallback(async () => {
        if (restoringRef.current) return;
        restoringRef.current = true;
        try {
            const response = await fetch("/api/concierge/chat", { cache: "no-store" });
            const json = (await response.json()) as {
                data?: { conversation: { id: string; messages: TranscriptMessage[]; brief: ConciergeBrief; handedOff: boolean } | null };
            };
            const conversation = json.data?.conversation;
            if (conversation && !conversationIdRef.current) conversationIdRef.current = conversation.id;
            setState((current) =>
                // Don't overwrite a chat the visitor has already started typing into.
                current.messages.length > 0 || !conversation
                    ? { ...current, restored: true }
                    : {
                          ...current,
                          restored: true,
                          conversationId: conversation.id,
                          messages: conversation.messages,
                          brief: conversation.brief ?? {},
                          handedOff: conversation.handedOff,
                      }
            );
        } catch {
            setState((current) => ({ ...current, restored: true }));
        }
    }, []);

    const apply = useCallback((event: ConciergeEvent) => {
        if (event.type === "start") conversationIdRef.current = event.conversationId;
        setState((current) => {
            const pending = current.pending ?? { text: "", cards: [], status: null };
            switch (event.type) {
                case "start":
                    return { ...current, conversationId: event.conversationId };
                case "status":
                    return { ...current, pending: { ...pending, status: event.text } };
                case "text":
                    return { ...current, pending: { ...pending, text: pending.text + event.delta, status: null } };
                case "replace":
                    return { ...current, pending: { ...pending, text: event.text, status: null } };
                case "card":
                    return { ...current, pending: { ...pending, cards: [...pending.cards, event.card] } };
                case "brief":
                    return { ...current, brief: event.brief };
                case "suggestions":
                    return { ...current, suggestions: event.items };
                case "done":
                    return {
                        ...current,
                        pending: null,
                        messages: [...current.messages, event.message],
                        handedOff: current.handedOff || event.handedOff,
                    };
                case "error":
                    return { ...current, pending: null, error: event.message };
                default:
                    return current;
            }
        });
    }, []);

    const send = useCallback(
        async (raw: string) => {
            const text = raw.trim();
            if (!text || abortRef.current) return;

            const controller = new AbortController();
            abortRef.current = controller;
            const startNew = startNewRef.current;
            startNewRef.current = false;
            const conversationId = startNew ? null : conversationIdRef.current;
            const outgoing: TranscriptMessage = { id: localId(), role: "user", text, cards: [], at: new Date().toISOString() };

            setState((current) => ({
                ...current,
                error: null,
                suggestions: [],
                messages: [...current.messages, outgoing],
                pending: { text: "", cards: [], status: null },
            }));

            try {
                const response = await fetch("/api/concierge/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: text, conversationId, startNew }),
                    signal: controller.signal,
                });

                if (!response.ok || !response.body) {
                    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
                    apply({ type: "error", message: failure?.error ?? "I couldn't reach the server. Please try again." });
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let finished = false;
                for (;;) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let newline = buffer.indexOf("\n");
                    while (newline >= 0) {
                        const line = buffer.slice(0, newline).trim();
                        buffer = buffer.slice(newline + 1);
                        newline = buffer.indexOf("\n");
                        if (!line) continue;
                        try {
                            const event = JSON.parse(line) as ConciergeEvent;
                            if (event.type === "done" || event.type === "error") finished = true;
                            apply(event);
                        } catch {
                            // A malformed line is skipped; the rest of the reply still renders.
                        }
                    }
                }
                if (!finished) apply({ type: "error", message: "The reply was interrupted. Please try again." });
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    apply({ type: "error", message: "I couldn't reach the server. Check your connection and try again." });
                }
            } finally {
                abortRef.current = null;
            }
        },
        [apply]
    );

    const reset = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        startNewRef.current = true;
        conversationIdRef.current = null;
        setState({ ...INITIAL, restored: true });
    }, []);

    return { ...state, busy: state.pending !== null, send, reset, restore };
}
