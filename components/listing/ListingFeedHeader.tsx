"use client";

import { FiMapPin, FiNavigation } from "react-icons/fi";

import Button from "@/components/ui/Button";
import { useNearLabel } from "@/hooks/useNearLabel";

export default function ListingFeedHeader({ title = "Explore studios" }: { title?: string }) {
    const { nearLabel, locationBar } = useNearLabel();

    const formatHeading = () => {
        if (!nearLabel) return title;
        const normalized = nearLabel.toLowerCase().trim();
        if (normalized === "nearby" || normalized === "you" || normalized === "current location") {
            return "Studios nearby";
        }
        return `Studios near ${nearLabel}`;
    };

    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
                {formatHeading()}
            </h1>

            {locationBar.label ? (
                <div className="flex shrink-0 items-center gap-1.5 text-sm">
                    <FiMapPin size={15} className="text-foreground" aria-hidden="true" />
                    <span className="text-foreground">{locationBar.label}</span>
                    <button
                        type="button"
                        onClick={locationBar.onEdit}
                        className="font-medium text-foreground underline underline-offset-4"
                    >
                        Change
                    </button>
                </div>
            ) : (
                <div className="flex shrink-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={locationBar.onEdit}
                        className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                        Enter manually
                    </button>
                    <Button
                        label={locationBar.detecting ? "Detecting…" : "Detect my location"}
                        icon={FiNavigation}
                        size="sm"
                        rounded
                        disabled={locationBar.detecting}
                        onClick={locationBar.onDetect}
                    />
                </div>
            )}
        </div>
    );
}
