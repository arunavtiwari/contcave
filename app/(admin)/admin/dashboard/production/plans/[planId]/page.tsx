import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductionPlan } from "@/app/actions/getProductionData";

import QuoteActions from "./QuoteActions";

export const dynamic = "force-dynamic";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
    const { planId } = await params;
    if (!/^[a-f0-9]{24}$/i.test(planId)) notFound();

    const plan = await getProductionPlan(planId);
    if (!plan) notFound();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Plan v{plan.version} — {plan.brief.brand.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {plan.brief.city} · budget {inr(plan.brief.budgetInr)} · source{" "}
                        {plan.source.toLowerCase()}
                        {plan.quotedAt && ` · quoted ${new Date(plan.quotedAt).toLocaleDateString()}`}
                    </p>
                </div>
                <Link
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    href={`/admin/dashboard/production/briefs/${plan.briefId}`}
                >
                    ← back to brief
                </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                    Team
                </h2>
                <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2 font-medium">Who</th>
                            <th className="px-4 py-2 font-medium">Role</th>
                            <th className="px-4 py-2 font-medium">Rate / cost</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plan.studio && (
                            <tr className="border-b border-border">
                                <td className="px-4 py-2 font-medium">
                                    {plan.studioName ?? plan.studio.listingId}
                                </td>
                                <td className="px-4 py-2">studio — {plan.studio.fitReason}</td>
                                <td className="px-4 py-2">{inr(plan.studio.costInr)}</td>
                                <td className="px-4 py-2">—</td>
                            </tr>
                        )}
                        {plan.crew.map((c, i) => (
                            <tr key={`c${i}`} className="border-b border-border">
                                <td className="px-4 py-2 font-medium">{plan.crewNames[c.crewId] ?? c.crewId}</td>
                                <td className="px-4 py-2">{c.role}</td>
                                <td className="px-4 py-2">{inr(c.rateInr)}</td>
                                <td className="px-4 py-2">{c.status.toLowerCase()}</td>
                            </tr>
                        ))}
                        {plan.talent.map((t, i) => (
                            <tr key={`t${i}`} className="border-b border-border last:border-0">
                                <td className="px-4 py-2 font-medium">
                                    {plan.talentNames[t.talentId] ?? t.talentId}
                                </td>
                                <td className="px-4 py-2">model</td>
                                <td className="px-4 py-2">{inr(t.rateInr)}</td>
                                <td className="px-4 py-2">{t.status.toLowerCase()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                    <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                        Shot list
                    </h2>
                    {plan.shotList.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">No shots defined.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody>
                                {plan.shotList.map((s, i) => (
                                    <tr key={i} className="border-b border-border last:border-0">
                                        <td className="px-4 py-2 font-medium">{s.deliverable}</td>
                                        <td className="px-4 py-2">{s.setup}</td>
                                        <td className="px-4 py-2 text-right text-muted-foreground">
                                            {s.estMinutes}m
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                    <h2 className="border-b border-border bg-neutral-50 px-4 py-3 text-sm font-semibold">
                        Schedule
                    </h2>
                    {plan.schedule.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">No schedule defined.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody>
                                {plan.schedule.map((s, i) => (
                                    <tr key={i} className="border-b border-border last:border-0">
                                        <td className="w-24 px-4 py-2 font-mono text-xs">{s.time}</td>
                                        <td className="px-4 py-2">{s.activity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {plan.budget && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-5 py-4 text-sm">
                    <span>Subtotal {inr(plan.budget.subtotalInr)}</span>
                    <span>ContCave fee {inr(plan.budget.contcaveFeeInr)}</span>
                    <strong>Total {inr(plan.budget.totalInr)}</strong>
                    <span className={plan.budget.withinBudget ? "text-emerald-600" : "text-red-600"}>
                        {plan.budget.withinBudget ? "Within budget" : "Over budget"}
                    </span>
                </div>
            )}

            <QuoteActions
                planId={plan.id}
                alreadyQuoted={Boolean(plan.quotedAt)}
                brandPhone={plan.brief.brand.contact?.phone ?? null}
            />
        </div>
    );
}
