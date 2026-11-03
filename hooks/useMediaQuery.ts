"use client";

import { useEffect, useState } from "react";

/** Tailwind's `md`, the width at which the browse controls change shape. */
export const MD_BREAKPOINT = "(min-width: 768px)";

/**
 * Matches a media query in JS, for cases where hiding with CSS isn't enough - two pickers both
 * mounted would mean two comboboxes in the accessibility tree, only one of them visible.
 *
 * Starts false and settles after mount, so it must not drive anything that has to be right in
 * the first paint; it is fine for what only appears after an interaction.
 */
export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const list = window.matchMedia(query);
        setMatches(list.matches);
        const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
        list.addEventListener("change", onChange);
        return () => list.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}
