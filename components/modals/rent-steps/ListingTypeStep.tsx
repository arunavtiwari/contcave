"use client";

import { IoCheckmarkCircle } from "react-icons/io5";

interface ListingTypeStepProps {
    listingType: "STANDARD" | "CURATED";
    setCustomValue: (id: string, value: unknown) => void;
}

const OPTIONS = [
    {
        value: "STANDARD" as const,
        label: "Standard Listing",
        badge: "Full onboarding",
        description: "Direct bookings, live availability calendar, full pricing, and a green Verified badge after admin review. Best if you're ready to take bookings right away.",
        features: ["Direct booking with payments", "Verified badge after review", "Full pricing & calendar"],
    },
    {
        value: "CURATED" as const,
        label: "Curated Listing",
        badge: "Quick publish",
        description: "Get listed faster with minimal info. Brands can discover you and enquire via WhatsApp. No booking system required. You can upgrade to Standard anytime.",
        features: ["WhatsApp enquiry CTA", "No pricing or calendar required", "Amber Curated badge"],
    },
];

export default function ListingTypeStep({ listingType, setCustomValue }: ListingTypeStepProps) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">How would you like to list?</h2>
                <p className="text-sm text-muted-foreground">You can always change this later from your property settings.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {OPTIONS.map((opt) => {
                    const selected = listingType === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCustomValue("listingType", opt.value)}
                            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                                selected
                                    ? opt.value === "STANDARD"
                                        ? "border-success bg-success/5"
                                        : "border-warning bg-warning/5"
                                    : "border-border bg-background hover:border-foreground/30"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            opt.value === "STANDARD"
                                                ? "bg-success/10 text-success"
                                                : "bg-warning/10 text-warning"
                                        }`}>
                                            {opt.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{opt.description}</p>
                                    <ul className="space-y-1">
                                        {opt.features.map((f) => (
                                            <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <IoCheckmarkCircle size={13} className={selected ? (opt.value === "STANDARD" ? "text-success" : "text-warning") : "text-muted-foreground/40"} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                                    selected
                                        ? opt.value === "STANDARD" ? "border-success bg-success" : "border-warning bg-warning"
                                        : "border-border"
                                }`}>
                                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
