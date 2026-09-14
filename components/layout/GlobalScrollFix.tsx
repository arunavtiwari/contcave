"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function GlobalScrollFix() {
    const pathname = usePathname();

    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
