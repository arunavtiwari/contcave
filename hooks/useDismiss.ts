"use client";

import { type RefObject, useEffect } from "react";

export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) close();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            close();
            ref.current?.querySelector<HTMLElement>("button")?.focus();
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [ref, open, close]);
}
