"use client";

import Link from "next/link";
import { useTransition } from "react";
import { IoLogoWhatsapp } from "react-icons/io";

import { trackEnquiryAction } from "@/app/actions/listingActions";
import { buildWhatsAppUrl, curatedEnquiryMessage } from "@/lib/whatsapp";

import CuratedListingBanner from "./CuratedListingBanner";

interface CuratedReservationProps {
    listingId: string;
    studioName: string;
    area: string;
    priceRangeMin?: number | null;
    priceRangeMax?: number | null;
    mapsUrl?: string | null;
    websiteUrl?: string | null;
    instagramHandle?: string | null;
}

export default function CuratedReservation({
    listingId,
    studioName,
    area,
    priceRangeMin,
    priceRangeMax,
    mapsUrl,
    websiteUrl,
    instagramHandle,
}: CuratedReservationProps) {
    const [, startTransition] = useTransition();

    const waUrl = buildWhatsAppUrl(curatedEnquiryMessage(studioName, area));

    function handleEnquiry() {
        startTransition(() => {
            trackEnquiryAction(listingId).catch(() => {});
        });
    }

    return (
        <div className="sticky top-24 rounded-2xl border border-border bg-background p-6 shadow-sm flex flex-col gap-5">
            {/* Price */}
            <div>
                {priceRangeMin && priceRangeMax ? (
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-muted-foreground">Est.</span>
                        <span className="text-2xl font-bold">
                            ₹{priceRangeMin.toLocaleString("en-IN")}–{priceRangeMax.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-muted-foreground">/ hr</span>
                    </div>
                ) : (
                    <p className="text-xl font-semibold text-muted-foreground">Price on Demand</p>
                )}
                {!!(priceRangeMin && priceRangeMax) && (
                    <p className="text-xs text-muted-foreground mt-1">Estimated — confirm with ContCave</p>
                )}
            </div>

            {/* WhatsApp CTA */}
            <Link
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleEnquiry}
                className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] transition-colors px-4 py-3.5 text-white font-semibold text-sm shadow-sm"
            >
                <IoLogoWhatsapp size={20} />
                Request Price
            </Link>

            {/* Links */}
            {(mapsUrl || websiteUrl || instagramHandle) && (
                <div className="flex flex-col gap-2 pt-1 border-t border-border text-sm">
                    {mapsUrl && (
                        <Link href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            View on Google Maps →
                        </Link>
                    )}
                    {websiteUrl && (
                        <Link href={websiteUrl} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            Visit Studio Website →
                        </Link>
                    )}
                    {instagramHandle && (
                        <Link href={`https://instagram.com/${instagramHandle.replace(/^@/, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            @{instagramHandle.replace(/^@/, "")} on Instagram →
                        </Link>
                    )}
                </div>
            )}

            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                This studio is not directly bookable on ContCave.
                Contact us via WhatsApp to enquire.
            </p>
             <CuratedListingBanner />
        </div>
    );
}
