"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SearchStreamEvent, SearchView } from "@/lib/search/types";
import { SEARCH_PARAMS } from "@/schemas/search";

const SEARCH_FAILED = "Search failed. Please try again.";

export type AiSearchRequest = { query: string; params: Record<string, string> };

export type AiSearchState =
    | { status: "idle" }
    | { status: "loading"; request: AiSearchRequest }
    | { status: "error"; request: AiSearchRequest; message: string }
    | { status: "done"; request: AiSearchRequest; view: SearchView; sessionToken: string; reasons: Record<string, string[]> };

async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SearchStreamEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunk = await reader.read();
    while (!chunk.done) {
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            if (line.trim()) yield JSON.parse(line) as SearchStreamEvent;
        }
        chunk = await reader.read();
    }
}

export function useAiSearch() {
    const [state, setState] = useState<AiSearchState>({ status: "idle" });
    const controllerRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => {
        controllerRef.current?.abort();
        setState({ status: "idle" });
    }, []);

    const run = useCallback(async (request: AiSearchRequest) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setState({ status: "loading", request });

        try {
            const params = new URLSearchParams({ ...request.params, [SEARCH_PARAMS.query]: request.query });
            const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
            if (!response.ok || !response.body) {
                const body: { error?: string } | null = await response.json().catch(() => null);
                setState({ status: "error", request, message: body?.error ?? SEARCH_FAILED });
                return;
            }
            for await (const event of readEvents(response.body)) {
                if (event.type === "view") {
                    setState({ status: "done", request, view: event.view, sessionToken: event.sessionToken, reasons: {} });
                } else {
                    setState((current) => (current.status === "done" ? { ...current, reasons: event.reasons } : current));
                }
            }
        } catch {
            if (!controller.signal.aborted) setState({ status: "error", request, message: SEARCH_FAILED });
        }
    }, []);

    useEffect(() => () => controllerRef.current?.abort(), []);

    return { state, run, reset };
}
