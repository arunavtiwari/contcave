import Link from "next/link";

import { getShoots } from "@/app/actions/getProductionData";

export const dynamic = "force-dynamic";

export default async function ShootsPage() {
    const shoots = await getShoots();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Executed shoots</h1>
                    <p className="text-sm text-muted-foreground">
                        Logging a shoot updates crew/talent reliability — this is what fills the supply
                        graph.
                    </p>
                </div>
                <Link
                    href="/admin/dashboard/production/shoots/new"
                    className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                >
                    + Log shoot
                </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
                {shoots.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">No executed shoots logged yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border bg-neutral-50 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium">Brand</th>
                                <th className="px-4 py-3 font-medium">Cost</th>
                                <th className="px-4 py-3 font-medium">Fee collected</th>
                                <th className="px-4 py-3 font-medium">Brand rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shoots.map((s) => (
                                <tr key={s.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-3">{s.date}</td>
                                    <td className="px-4 py-3 font-medium">{s.brandName ?? "—"}</td>
                                    <td className="px-4 py-3">₹{s.actualCostInr.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3">
                                        ₹{s.contcaveFeeCollectedInr.toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-4 py-3">{s.outcome?.ratingByBrand ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
