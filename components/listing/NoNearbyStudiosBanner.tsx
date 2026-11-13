"use client";

import { FiArrowRight } from "react-icons/fi";

import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import { trackLead } from "@/lib/analytics/tracking";
import { formatDistanceKm } from "@/lib/listing/browseLocation";
import { findRegion } from "@/lib/listing/regions";
import { buildWhatsAppUrl, cityRequestMessage } from "@/lib/whatsapp/urls";

/**
 * Past this, the nearest studio is in another city rather than across town - no metro region we
 * serve is wider than this (see lib/listing/regions.ts).
 */
const ANOTHER_CITY_KM = 60;

type Props = {
    nearestKm: number | null;
    nearestCity: string | null;
};

/**
 * Picking a city we don't serve yet used to empty the page. The feed now keeps showing the
 * closest studios, and this says why they are far away and offers to go looking.
 */
export default function NoNearbyStudiosBanner({ nearestKm, nearestCity }: Props) {
    const { location } = useBrowseLocation();

    if (!location || nearestKm === null || nearestKm <= ANOTHER_CITY_KM) return null;

    // The region reads better than the exact area picked: "No studios in Lucknow yet" rather
    // than "No studios in Gomti Nagar yet".
    const place = findRegion(location.region)?.name ?? location.label;

    return (
        <div className="mb-6 rounded-2xl border border-border bg-muted/50 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-foreground">
                <strong className="font-bold">No studios in {place} yet</strong> — we&apos;re showing the closest
                ones instead.
                {nearestCity && ` The nearest is in ${nearestCity}, about ${formatDistanceKm(nearestKm)} away.`}
            </p>
            <a
                href={buildWhatsAppUrl(cityRequestMessage(place))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackLead({ source: "no_studios_in_city", city: place })}
                data-tracking-ignore="whatsapp"
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 hover:opacity-80"
            >
                Ask us to find you a space in {place}
                <FiArrowRight size={15} aria-hidden="true" />
            </a>
        </div>
    );
}
