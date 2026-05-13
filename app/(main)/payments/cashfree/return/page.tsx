import type { Metadata } from "next";

import CashfreeReturnStatus from "@/components/payments/CashfreeReturnStatus";

export const metadata: Metadata = {
    title: "Payment Status",
    description: "Review the outcome of your recent ContCave payment and see next steps.",
    robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
    },
};

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

export default async function CashfreeReturnCompatibilityPage({ searchParams }: Props) {
    return <CashfreeReturnStatus searchParams={await searchParams} />;
}
