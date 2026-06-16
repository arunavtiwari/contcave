"use client";

import { IoInformationCircleOutline } from "react-icons/io5";

export default function CuratedListingBanner() {
    return (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5 text-sm text-foreground/80 mb-6">
            <IoInformationCircleOutline size={18} className="shrink-0 mt-0.5 text-warning" />
            <p>
                <span className="font-semibold text-foreground">ContCave Curated Listing: </span>{" "}
                Information has been sourced and compiled by the ContCave team and has not been independently 
                verified by the studio. Pricing and live availability are not confirmed.
            </p>
        </div>
    );
}
