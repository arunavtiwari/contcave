"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { generateQuote, sendQuoteViaWhatsApp } from "@/app/actions/productionActions";
import type { QuoteArtifact } from "@/types/production";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function QuoteActions({
    planId,
    alreadyQuoted,
    brandPhone,
}: {
    planId: string;
    alreadyQuoted: boolean;
    brandPhone: string | null;
}) {
    const router = useRouter();
    const [quote, setQuote] = useState<QuoteArtifact | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [sending, setSending] = useState(false);

    async function onGenerate() {
        setBusy(true);
        setError(null);
        setNotice(null);
        const res = await generateQuote({ planId });
        setBusy(false);
        if (res.success && res.data) {
            setQuote(res.data);
            router.refresh();
        } else {
            setError(res.error ?? "Failed to generate quote");
        }
    }

    async function onSendWhatsApp() {
        setSending(true);
        setError(null);
        setNotice(null);
        const res = await sendQuoteViaWhatsApp({ planId });
        setSending(false);
        if (res.success) setNotice("Quote sent on WhatsApp via Hermes ✓");
        else setError(res.error ?? "Failed to send WhatsApp message");
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={onGenerate}
                    disabled={busy}
                    className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                >
                    {busy ? "Generating…" : alreadyQuoted ? "Regenerate quote" : "Generate quote"}
                </button>
                <button
                    onClick={onSendWhatsApp}
                    disabled={sending || (!alreadyQuoted && !quote)}
                    title={brandPhone ? `Sends to ${brandPhone}` : "Add a phone under Brands first"}
                    className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                >
                    {sending ? "Sending…" : "Send quote on WhatsApp"}
                </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}

            {quote && (
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                    <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                        Quote — {quote.brand}, {quote.city} ({quote.dates.join(", ")})
                    </h2>
                    <table className="w-full text-sm">
                        <tbody>
                            {quote.lineItems.map((li, i) => (
                                <tr key={i} className="border-b border-border">
                                    <td className="px-4 py-2 text-muted-foreground">{li.kind}</td>
                                    <td className="px-4 py-2 font-medium">{li.name}</td>
                                    <td className="px-4 py-2">{li.detail}</td>
                                    <td className="px-4 py-2 text-right">{inr(li.amountInr)}</td>
                                </tr>
                            ))}
                            <tr className="border-b border-border">
                                <td colSpan={3} className="px-4 py-2">
                                    ContCave fee ({quote.feePct}%)
                                </td>
                                <td className="px-4 py-2 text-right">{inr(quote.budget.contcaveFeeInr)}</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="px-4 py-2 font-semibold">
                                    Total (brief budget {inr(quote.briefBudgetInr)})
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">
                                    {inr(quote.budget.totalInr)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p
                        className={`px-4 py-3 text-sm ${quote.budget.withinBudget ? "text-emerald-600" : "text-red-600"}`}
                    >
                        {quote.budget.withinBudget
                            ? "Within budget ✓"
                            : "Over budget — revise before sending"}
                    </p>
                </div>
            )}
        </div>
    );
}
