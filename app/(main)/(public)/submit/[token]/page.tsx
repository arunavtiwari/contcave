import { Metadata } from "next";

import { getBrandByIntakeToken } from "@/app/actions/getProductionData";

import IntakeForm from "./IntakeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Submit a shoot brief | ContCave",
    robots: { index: false, follow: false },
};

export default async function SubmitBriefPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const brand = await getBrandByIntakeToken(token);

    if (!brand) {
        return (
            <div className="mx-auto max-w-xl px-4 py-24 text-center">
                <h1 className="text-2xl font-semibold">Link not found</h1>
                <p className="mt-2 text-sm text-neutral-500">
                    This intake link is invalid or has been rotated. Ask your ContCave producer for a
                    fresh one.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
            <h1 className="text-2xl font-semibold">Shoot brief — {brand.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
                Tell us what you need. A ContCave producer will come back with a full shoot plan and
                itemised quote — on WhatsApp if you leave a number with us.
            </p>
            <IntakeForm token={token} />
        </div>
    );
}
