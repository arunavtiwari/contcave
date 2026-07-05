"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createProductionPlan } from "@/app/actions/productionActions";

type StudioOpt = {
    listingId: string;
    title: string;
    pricePerDayInr: number;
    category: string;
    location: string;
    carpetArea: number | null;
};
type CrewOpt = { id: string; name: string; role: string; dayRateInr: number; rating: number };
type TalentOpt = { id: string; name: string; dayRateInr: number; look: string[] };

type Props = {
    briefId: string;
    budgetInr: number;
    feePct: number;
    deliverables: string[];
    studios: StudioOpt[];
    crew: CrewOpt[];
    talent: TalentOpt[];
};

type PickRow = { id: string; rateInr: number };
type ShotRow = { deliverable: string; setup: string; estMinutes: number };
type ScheduleRow = { time: string; activity: string };

const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";
const smallBtn =
    "rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function PlanBuilder({
    briefId,
    budgetInr,
    feePct,
    deliverables,
    studios,
    crew,
    talent,
}: Props) {
    const router = useRouter();
    const [listingId, setListingId] = useState("");
    const [studioCost, setStudioCost] = useState(0);
    const [fitReason, setFitReason] = useState("");
    const [crewRows, setCrewRows] = useState<PickRow[]>([]);
    const [talentRows, setTalentRows] = useState<PickRow[]>([]);
    const [shotRows, setShotRows] = useState<ShotRow[]>(
        deliverables.map((d) => ({ deliverable: d, setup: "", estMinutes: 60 }))
    );
    const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([
        { time: "09:00", activity: "Crew call, setup" },
    ]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const subtotal = useMemo(
        () =>
            studioCost +
            crewRows.reduce((s, r) => s + r.rateInr, 0) +
            talentRows.reduce((s, r) => s + r.rateInr, 0),
        [studioCost, crewRows, talentRows]
    );
    const fee = Math.round((subtotal * feePct) / 100);
    const total = subtotal + fee;
    const withinBudget = total <= budgetInr;

    async function submit() {
        setError(null);
        if (!listingId) {
            setError("Pick a studio (listing)");
            return;
        }
        setBusy(true);
        const res = await createProductionPlan({
            briefId,
            studio: { listingId, fitReason: fitReason || "Producer selection", costInr: studioCost },
            crew: crewRows
                .filter((r) => r.id)
                .map((r) => ({
                    crewId: r.id,
                    role: crew.find((c) => c.id === r.id)?.role.toLowerCase() ?? "crew",
                    styleMatch: 1, // producer-picked; Hermes fills real scores in Phase 2
                    rateInr: r.rateInr,
                })),
            talent: talentRows
                .filter((r) => r.id)
                .map((r) => ({ talentId: r.id, lookMatch: 1, rateInr: r.rateInr })),
            shotList: shotRows.filter((s) => s.setup.trim()),
            schedule: scheduleRows.filter((s) => s.activity.trim()),
            budget: { subtotalInr: subtotal, contcaveFeeInr: fee, totalInr: total, withinBudget },
        });
        setBusy(false);
        if (res.success && res.data) {
            router.push(`/admin/dashboard/production/plans/${res.data.planId}`);
        } else {
            setError(res.error ?? "Failed to save plan");
        }
    }

    return (
        <div className="space-y-5 rounded-2xl border border-border bg-background p-5">
            <h2 className="text-base font-semibold">Build plan</h2>

            <div className="grid gap-4 sm:grid-cols-3">
                <div>
                    <label className={labelCls}>Studio — {studios.length} listings in city</label>
                    <select
                        className={inputCls}
                        value={listingId}
                        onChange={(e) => {
                            setListingId(e.target.value);
                            const s = studios.find((x) => x.listingId === e.target.value);
                            if (s) setStudioCost(s.pricePerDayInr);
                        }}
                    >
                        <option value="">— pick a listing —</option>
                        {studios.map((s) => (
                            <option key={s.listingId} value={s.listingId}>
                                {s.title} ({inr(s.pricePerDayInr)} · {s.category}
                                {s.carpetArea ? ` · ${s.carpetArea} sqft` : ""})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Cost (INR)</label>
                    <input
                        className={inputCls}
                        type="number"
                        value={studioCost}
                        onChange={(e) => setStudioCost(Number(e.target.value))}
                    />
                </div>
                <div>
                    <label className={labelCls}>Fit reason</label>
                    <input
                        className={inputCls}
                        placeholder="North light suits the palette"
                        value={fitReason}
                        onChange={(e) => setFitReason(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <h3 className="mb-2 text-sm font-semibold">Crew</h3>
                {crewRows.map((row, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                        <select
                            className={`${inputCls} flex-1`}
                            value={row.id}
                            onChange={(e) => {
                                const member = crew.find((c) => c.id === e.target.value);
                                setCrewRows((rows) =>
                                    rows.map((r, j) =>
                                        j === i
                                            ? { id: e.target.value, rateInr: member?.dayRateInr ?? r.rateInr }
                                            : r
                                    )
                                );
                            }}
                        >
                            <option value="">— pick crew —</option>
                            {crew.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.role.toLowerCase()} · {inr(c.dayRateInr)}
                                    {c.rating ? ` · ★${c.rating}` : ""})
                                </option>
                            ))}
                        </select>
                        <input
                            className={`${inputCls} w-32`}
                            type="number"
                            value={row.rateInr}
                            onChange={(e) =>
                                setCrewRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, rateInr: Number(e.target.value) } : r))
                                )
                            }
                        />
                        <button
                            type="button"
                            className={smallBtn}
                            onClick={() => setCrewRows((rows) => rows.filter((_, j) => j !== i))}
                        >
                            ✕
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className={smallBtn}
                    onClick={() => setCrewRows((rows) => [...rows, { id: "", rateInr: 0 }])}
                >
                    + Add crew
                </button>
            </div>

            <div>
                <h3 className="mb-2 text-sm font-semibold">Talent</h3>
                {talentRows.map((row, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                        <select
                            className={`${inputCls} flex-1`}
                            value={row.id}
                            onChange={(e) => {
                                const model = talent.find((t) => t.id === e.target.value);
                                setTalentRows((rows) =>
                                    rows.map((r, j) =>
                                        j === i
                                            ? { id: e.target.value, rateInr: model?.dayRateInr ?? r.rateInr }
                                            : r
                                    )
                                );
                            }}
                        >
                            <option value="">— pick talent —</option>
                            {talent.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({inr(t.dayRateInr)}
                                    {t.look.length ? ` · ${t.look.join("/")}` : ""})
                                </option>
                            ))}
                        </select>
                        <input
                            className={`${inputCls} w-32`}
                            type="number"
                            value={row.rateInr}
                            onChange={(e) =>
                                setTalentRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, rateInr: Number(e.target.value) } : r))
                                )
                            }
                        />
                        <button
                            type="button"
                            className={smallBtn}
                            onClick={() => setTalentRows((rows) => rows.filter((_, j) => j !== i))}
                        >
                            ✕
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className={smallBtn}
                    onClick={() => setTalentRows((rows) => [...rows, { id: "", rateInr: 0 }])}
                >
                    + Add talent
                </button>
            </div>

            <div>
                <h3 className="mb-2 text-sm font-semibold">Shot list</h3>
                {shotRows.map((row, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                        <input
                            className={`${inputCls} w-40`}
                            placeholder="deliverable"
                            value={row.deliverable}
                            onChange={(e) =>
                                setShotRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, deliverable: e.target.value } : r))
                                )
                            }
                        />
                        <input
                            className={`${inputCls} flex-1`}
                            placeholder="setup — e.g. product on plinth, north light, 50mm"
                            value={row.setup}
                            onChange={(e) =>
                                setShotRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, setup: e.target.value } : r))
                                )
                            }
                        />
                        <input
                            className={`${inputCls} w-24`}
                            type="number"
                            min={5}
                            title="est. minutes"
                            value={row.estMinutes}
                            onChange={(e) =>
                                setShotRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, estMinutes: Number(e.target.value) } : r))
                                )
                            }
                        />
                        <button
                            type="button"
                            className={smallBtn}
                            onClick={() => setShotRows((rows) => rows.filter((_, j) => j !== i))}
                        >
                            ✕
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className={smallBtn}
                    onClick={() =>
                        setShotRows((rows) => [...rows, { deliverable: "", setup: "", estMinutes: 60 }])
                    }
                >
                    + Add shot
                </button>
            </div>

            <div>
                <h3 className="mb-2 text-sm font-semibold">Schedule</h3>
                {scheduleRows.map((row, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                        <input
                            className={`${inputCls} w-32`}
                            type="time"
                            value={row.time}
                            onChange={(e) =>
                                setScheduleRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, time: e.target.value } : r))
                                )
                            }
                        />
                        <input
                            className={`${inputCls} flex-1`}
                            placeholder="activity"
                            value={row.activity}
                            onChange={(e) =>
                                setScheduleRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, activity: e.target.value } : r))
                                )
                            }
                        />
                        <button
                            type="button"
                            className={smallBtn}
                            onClick={() => setScheduleRows((rows) => rows.filter((_, j) => j !== i))}
                        >
                            ✕
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className={smallBtn}
                    onClick={() => setScheduleRows((rows) => [...rows, { time: "", activity: "" }])}
                >
                    + Add slot
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm ring-1 ring-border">
                <span>Subtotal {inr(subtotal)}</span>
                <span>
                    ContCave fee ({feePct}%) {inr(fee)}
                </span>
                <strong>Total {inr(total)}</strong>
                <span className={withinBudget ? "text-emerald-600" : "text-red-600"}>
                    {withinBudget ? "Within budget" : `Over budget by ${inr(total - budgetInr)}`}
                </span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
                onClick={submit}
                disabled={busy}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
                {busy ? "Saving…" : "Save plan"}
            </button>
        </div>
    );
}
