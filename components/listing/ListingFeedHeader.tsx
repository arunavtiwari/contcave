"use client";

import { useNearLabel } from "@/hooks/useNearLabel";

export default function ListingFeedHeader({ title = "Explore studios" }: { title?: string }) {
    const { nearLabel } = useNearLabel();

    const formatHeading = () => {
        if (!nearLabel) return title;
        const normalized = nearLabel.toLowerCase().trim();
        if (normalized === "nearby" || normalized === "you" || normalized === "current location") {
            return "Studios nearby";
        }
        return `Studios near ${nearLabel}`;
    };

    return (
        <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
                {formatHeading()}
            </h1>
        </div>
    );
}
