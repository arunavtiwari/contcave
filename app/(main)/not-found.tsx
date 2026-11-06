import type { Metadata } from "next";

import PublicPageShell from "@/components/layout/PublicPageShell";
import NotFoundState, { NOT_FOUND_METADATA } from "@/components/ui/NotFoundState";

export const metadata: Metadata = NOT_FOUND_METADATA;

export default function NotFound() {
    return (
        <PublicPageShell>
            <NotFoundState />
        </PublicPageShell>
    );
}
