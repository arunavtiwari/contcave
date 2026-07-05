import { getSupplyRoster } from "@/app/actions/getProductionData";

import { CrewForm, TalentForm } from "./SupplyForms";

export const dynamic = "force-dynamic";

export default async function SupplyPage() {
    const { crew, talent } = await getSupplyRoster();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Crew &amp; talent</h1>
                <p className="text-sm text-muted-foreground">
                    The supply graph beyond studios (studios are Listings). Reliability updates
                    automatically when shoots are logged.
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                    Crew ({crew.length})
                </h2>
                {crew.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">
                        No crew yet — add photographers, MUAs, stylists below.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 font-medium">Role</th>
                                <th className="px-4 py-2 font-medium">City</th>
                                <th className="px-4 py-2 font-medium">Day rate</th>
                                <th className="px-4 py-2 font-medium">Shoots</th>
                                <th className="px-4 py-2 font-medium">Rating</th>
                                <th className="px-4 py-2 font-medium">On-time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {crew.map((c) => (
                                <tr key={c.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2 font-medium">{c.name}</td>
                                    <td className="px-4 py-2">{c.role.toLowerCase()}</td>
                                    <td className="px-4 py-2">{c.city}</td>
                                    <td className="px-4 py-2">₹{c.dayRateInr.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-2">{c.reliability.shootsCompleted}</td>
                                    <td className="px-4 py-2">{c.reliability.avgRating || "—"}</td>
                                    <td className="px-4 py-2">{c.reliability.onTimePct}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                    Talent ({talent.length})
                </h2>
                {talent.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">No talent yet — add models below.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 font-medium">City</th>
                                <th className="px-4 py-2 font-medium">Gender</th>
                                <th className="px-4 py-2 font-medium">Age</th>
                                <th className="px-4 py-2 font-medium">Look</th>
                                <th className="px-4 py-2 font-medium">Day rate</th>
                                <th className="px-4 py-2 font-medium">Shoots</th>
                            </tr>
                        </thead>
                        <tbody>
                            {talent.map((t) => (
                                <tr key={t.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2 font-medium">{t.name}</td>
                                    <td className="px-4 py-2">{t.city}</td>
                                    <td className="px-4 py-2">{t.attributes.gender}</td>
                                    <td className="px-4 py-2">{t.attributes.ageRange}</td>
                                    <td className="px-4 py-2">{t.attributes.look.join(", ") || "—"}</td>
                                    <td className="px-4 py-2">₹{t.dayRateInr.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-2">{t.reliability.shootsCompleted}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <CrewForm />
                <TalentForm />
            </div>
        </div>
    );
}
