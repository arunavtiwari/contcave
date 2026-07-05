import Link from "next/link";

import { getProductionBriefs } from "@/app/actions/getProductionData";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
    NEW: "bg-amber-50 text-amber-700 ring-amber-200",
    PLANNING: "bg-blue-50 text-blue-700 ring-blue-200",
    QUOTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    BOOKED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    COMPLETED: "bg-neutral-100 text-neutral-600 ring-neutral-200",
    LOST: "bg-red-50 text-red-700 ring-red-200",
};

export default async function ProductionBriefsPage() {
    const briefs = await getProductionBriefs();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Production briefs</h1>
                    <p className="text-sm text-muted-foreground">
                        Hermes intake — brand briefs waiting on a shoot plan and quote.
                    </p>
                </div>
                <span className="text-sm text-muted-foreground">{briefs.length} total</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
                {briefs.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">
                        No briefs yet. Create a brand under{" "}
                        <Link className="underline" href="/admin/dashboard/production/brands">
                            Brands
                        </Link>{" "}
                        and share its intake link.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border bg-neutral-50 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Brand</th>
                                <th className="px-4 py-3 font-medium">City</th>
                                <th className="px-4 py-3 font-medium">Dates</th>
                                <th className="px-4 py-3 font-medium">Budget</th>
                                <th className="px-4 py-3 font-medium">Deliverables</th>
                                <th className="px-4 py-3 font-medium">Plans</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {briefs.map((b) => (
                                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            className="hover:underline"
                                            href={`/admin/dashboard/production/briefs/${b.id}`}
                                        >
                                            {b.brand?.name ?? "—"}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">{b.city}</td>
                                    <td className="px-4 py-3">{b.dates.join(", ")}</td>
                                    <td className="px-4 py-3">₹{b.budgetInr.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3">
                                        {b.deliverables.map((d) => `${d.qty}× ${d.type}`).join(", ")}
                                    </td>
                                    <td className="px-4 py-3">{b.planCount}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[b.status] ?? "bg-neutral-100 text-neutral-600 ring-neutral-200"}`}
                                        >
                                            {b.status.toLowerCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
