"use client";

import { useNearLabel } from "@/hooks/useNearLabel";

export default function ListingFeedHeader({ title = "Explore studios" }: { title?: string }) {
    const { nearLabel } = useNearLabel();

    return (
        <div className="mb-8 flex h-14 items-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
                {nearLabel ? `Studios near ${nearLabel}` : title}
            </h1>
        </div>
    );
}
