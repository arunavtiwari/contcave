"use client";

import { useSyncExternalStore } from "react";

type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } };

const APPLE_PLATFORM = /mac|iphone|ipad|ipod/i;

const subscribe = () => () => undefined;

const clientModifier = () => {
    const nav = navigator as NavigatorWithUAData;
    return APPLE_PLATFORM.test(nav.userAgentData?.platform || nav.platform || nav.userAgent) ? "⌘" : "Ctrl";
};

export function useShortcutModifier() {
    return useSyncExternalStore(subscribe, clientModifier, () => null);
}
