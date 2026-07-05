"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { logShoot } from "@/app/actions/productionActions";

type Participant = { id: string; name: string };
type PlanOpt = {
    id: string;
    briefId: string;
    label: string;
    date: string;
    totalInr: number;
    feeInr: number;
    studio: Participant | null;
    crew: Participant[];
    talent: Participant[];
};

type Punctuality = "ONTIME" | "LATE" | "NOSHOW";

const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

export default function ShootForm({ plans }: { plans: PlanOpt[] }) {
    const router = useRouter();
    const [planId, setPlanId] = useState("");
    const [date, setDate] = useState("");
    const [cost, setCost] = useState("");
    const [fee, setFee] = useState("");
    const [rating, setRating] = useState("");
    const [notes, setNotes] = useState("");
    const [events, setEvents] = useState<Record<string, Punctuality>>({});
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const plan = plans.find((p) => p.id === planId);
    const participants = plan ? [...plan.crew, ...plan.talent] : [];

    function selectPlan(id: string) {
        setPlanId(id);
        const p = plans.find((x) => x.id === id);
        if (p) {
            setDate(p.date);
            setCost(String(p.totalInr));
            setFee(String(p.feeInr));
            setEvents({});
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!plan) return;
        setBusy(true);
        setError(null);

        const res = await logShoot({
            planId: plan.id,
            briefId: plan.briefId,
            date,
            actualListingId: plan.studio?.id,
            actualCrewIds: plan.crew.map((c) => c.id),
            actualTalentIds: plan.talent.map((t) => t.id),
            actualCostInr: Number(cost),
            contcaveFeeCollectedInr: Number(fee),
            outcome:
                rating || notes
                    ? { ratingByBrand: rating ? Number(rating) : undefined, notes: notes || undefined }
                    : undefined,
            reliabilityEvents: participants.map((p) => ({
                entityType: plan.crew.some((c) => c.id === p.id) ? ("CREW" as const) : ("TALENT" as const),
                entityId: p.id,
                event: events[p.id] ?? "ONTIME",
            })),
        });
        setBusy(false);
        if (res.success) router.push("/admin/dashboard/production/shoots");
        else setError(res.error ?? "Failed to log shoot");
    }

    return (
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-background p-5">
            <div>
                <label className={labelCls}>Plan</label>
                <select className={inputCls} value={planId} onChange={(e) => selectPlan(e.target.value)} required>
                    <option value="">— pick a quoted/booked plan —</option>
                    {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label}
                        </option>
                    ))}
                </select>
            </div>

            {plan && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className={labelCls}>Shoot date</label>
                            <input
                                className={inputCls}
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Actual cost (INR)</label>
                            <input
                                className={inputCls}
                                type="number"
                                min={0}
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelCls}>ContCave fee collected (INR)</label>
                            <input
                                className={inputCls}
                                type="number"
                                min={0}
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Punctuality</h3>
                        {plan.studio && (
                            <p className="mb-2 text-sm text-muted-foreground">Studio: {plan.studio.name}</p>
                        )}
                        {participants.map((p) => (
                            <div key={p.id} className="mb-2 flex items-center gap-3">
                                <span className="flex-1 text-sm">{p.name}</span>
                                <select
                                    className={`${inputCls} max-w-40`}
                                    value={events[p.id] ?? "ONTIME"}
                                    onChange={(e) =>
                                        setEvents((prev) => ({ ...prev, [p.id]: e.target.value as Punctuality }))
                                    }
                                >
                                    <option value="ONTIME">On time</option>
                                    <option value="LATE">Late</option>
                                    <option value="NOSHOW">No-show</option>
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Brand rating (0–5)</label>
                            <input
                                className={inputCls}
                                type="number"
                                min={0}
                                max={5}
                                step={0.5}
                                value={rating}
                                onChange={(e) => setRating(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Notes</label>
                            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                disabled={busy || !plan}
            >
                {busy ? "Logging…" : "Log shoot + update reliability"}
            </button>
        </form>
    );
}
