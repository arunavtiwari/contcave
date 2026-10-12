"use client";

import { type RefObject, useEffect, useState } from "react";

const BOTTOM_GAP = 24;

export function useStickyTop(ref: RefObject<HTMLElement | null>, offset: number) {
    const [top, setTop] = useState(offset);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const update = () => setTop(Math.min(offset, window.innerHeight - element.offsetHeight - BOTTOM_GAP));
        update();

        const observer = new ResizeObserver(update);
        observer.observe(element);
        window.addEventListener("resize", update);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", update);
        };
    }, [ref, offset]);

    return top;
}
