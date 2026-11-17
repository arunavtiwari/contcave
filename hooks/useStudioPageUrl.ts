"use client";

import { usePathname } from "next/navigation";

import { usePublicSiteUrl } from "@/hooks/usePublicSiteUrl";

/**
 * The public link of the studio page being viewed, for WhatsApp messages, so the team can open the
 * exact listing instead of searching by name. Query strings are dropped on purpose: preview
 * tokens and tracking parameters shouldn't end up in a chat. Null outside studio pages.
 */
export function useStudioPageUrl(): string | null {
    const pathname = usePathname();
    const publicUrl = usePublicSiteUrl();
    if (!pathname?.startsWith("/studio/")) return null;
    const url = publicUrl(pathname);
    // Before hydration the origin isn't known yet; a bare path is no use in a chat.
    return url.startsWith("http") ? url : null;
}
