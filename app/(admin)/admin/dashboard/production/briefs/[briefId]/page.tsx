import Link from "next/link";
import { notFound } from "next/navigation";

import {
    getBriefWithPlans,
    getHermesSuggestions,
    getSupplyForCity,
} from "@/app/actions/getProductionData";

import PlanBuilder from "./PlanBuilder";

export const dynamic = "force-dynamic";

export default async function BriefDetailPage({
    params,
}: {
    params: Promise<{ briefId: string }>;
}) {
    const { briefId } = await params;
    if (!/^[a-f0-9]{24}$/i.test(briefId)) notFound();

    const brief = await getBriefWithPlans(briefId);
    if (!brief) notFound();

    const [supply, suggestions] = await Promise.all([
        getSupplyForCity(brief.city),
        getHermesSuggestions(briefId),
    ]);
    const feePct = Number(process.env.CONTCAVE_FEE_PCT ?? 15);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {brief.brand.name} — {brief.city}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Budget ₹{brief.budgetInr.toLocaleString("en-IN")} · {brief.dates.join(", ")} · via{" "}
                        {brief.submittedVia.toLowerCase()} · status {brief.status.toLowerCase()}
                    </p>
                </div>
                <Link
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    href="/admin/dashboard/production"
                >
                    ← all briefs
                </Link>
            </div>

            <div className="grid gap-6 rounded-2xl border border-border bg-background p-5 sm:grid-cols-3">
                <div>
                    <h2 className="mb-2 text-sm font-semibold">Deliverables</h2>
                    {brief.deliverables.map((d, i) => (
                        <p key={i} className="text-sm text-muted-foreground">
                            {d.qty}× {d.type}
                        </p>
                    ))}
                </div>
                <div>
                    <h2 className="mb-2 text-sm font-semibold">Mood</h2>
                    <p className="text-sm text-muted-foreground">{brief.moodWords.join(", ") || "—"}</p>
                    {brief.talentPrefs && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            Talent:{" "}
                            {[brief.talentPrefs.gender, brief.talentPrefs.ageRange, ...brief.talentPrefs.look]
                                .filter(Boolean)
                                .join(", ") || "—"}
                        </p>
                    )}
                </div>
                <div>
                    <h2 className="mb-2 text-sm font-semibold">Notes</h2>
                    <p className="text-sm text-muted-foreground">{brief.notes ?? "—"}</p>
                </div>
                {brief.moodboardImages.length > 0 && (
                    <div className="sm:col-span-3">
                        <h2 className="mb-2 text-sm font-semibold">Moodboard</h2>
                        <div className="flex flex-wrap gap-2">
                            {brief.moodboardImages.map((url) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    key={url}
                                    src={url}
                                    alt="moodboard reference"
                                    className="h-24 rounded-xl border border-border object-cover"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {brief.plans.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                    <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                        Plans
                    </h2>
                    <table className="w-full text-sm">
                        <tbody>
                            {brief.plans.map((p) => (
                                <tr key={p.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2 font-medium">v{p.version}</td>
                                    <td className="px-4 py-2">{p.source.toLowerCase()}</td>
                                    <td className="px-4 py-2">
                                        {p.budget ? `₹${p.budget.totalInr.toLocaleString("en-IN")}` : "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        {p.quotedAt ? `quoted ${new Date(p.quotedAt).toLocaleDateString()}` : "draft"}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Link
                                            className="text-blue-600 hover:underline"
                                            href={`/admin/dashboard/production/plans/${p.id}`}
                                        >
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {suggestions && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                    <h2 className="text-sm font-semibold text-foreground">
                        Hermes suggestions{" "}
                        <span className="font-normal text-muted-foreground">
                            — ranked by moodboard match; you assemble the plan
                        </span>
                    </h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <div>
                            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Studios
                            </h3>
                            {suggestions.studios.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No match yet</p>
                            ) : (
                                suggestions.studios.slice(0, 5).map((s) => (
                                    <p key={s.listingId} className="text-sm">
                                        {s.title}{" "}
                                        <span className="text-xs text-muted-foreground">({s.score})</span>
                                    </p>
                                ))
                            )}
                        </div>
                        <div>
                            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Crew
                            </h3>
                            {suggestions.crew.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No match yet</p>
                            ) : (
                                suggestions.crew.slice(0, 5).map((c) => (
                                    <p key={c.id} className="text-sm">
                                        {c.name}{" "}
                                        <span className="text-xs text-muted-foreground">
                                            ({c.role} · {c.score})
                                        </span>
                                    </p>
                                ))
                            )}
                        </div>
                        <div>
                            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Talent
                            </h3>
                            {suggestions.talent.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No match yet</p>
                            ) : (
                                suggestions.talent.slice(0, 5).map((t) => (
                                    <p key={t.id} className="text-sm">
                                        {t.name}{" "}
                                        <span className="text-xs text-muted-foreground">({t.score})</span>
                                    </p>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <PlanBuilder
                briefId={brief.id}
                budgetInr={brief.budgetInr}
                feePct={feePct}
                deliverables={brief.deliverables.map((d) => d.type)}
                studios={supply.studios}
                crew={supply.crew}
                talent={supply.talent}
            />
        </div>
    );
}
