"use client";

import { useState } from "react";

import { submitBrief } from "@/app/actions/productionActions";

type DeliverableRow = { type: string; qty: number };

const inputCls =
    "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20";
const labelCls = "mb-1 block text-xs font-medium text-neutral-500";
const cardCls = "rounded-2xl border border-neutral-200 bg-white p-5";
const smallBtn =
    "rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 transition hover:text-neutral-900";

async function uploadMoodboardImage(token: string, file: File): Promise<string> {
    const presign = await fetch("/api/hermes/intake-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeToken: token, contentType: file.type }),
    });
    if (!presign.ok) throw new Error("Could not prepare upload");
    const { data } = await presign.json();

    const put = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
    });
    if (!put.ok) throw new Error("Upload failed");
    return data.publicUrl as string;
}

export default function IntakeForm({ token }: { token: string }) {
    const [deliverables, setDeliverables] = useState<DeliverableRow[]>([{ type: "reel", qty: 1 }]);
    const [moodWords, setMoodWords] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [budget, setBudget] = useState("");
    const [city, setCity] = useState("");
    const [dates, setDates] = useState<string[]>([]);
    const [dateInput, setDateInput] = useState("");
    const [gender, setGender] = useState("");
    const [ageRange, setAgeRange] = useState("");
    const [look, setLook] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    async function onFiles(files: FileList | null) {
        if (!files?.length) return;
        setUploading(true);
        setError(null);
        try {
            for (const file of Array.from(files)) {
                const url = await uploadMoodboardImage(token, file);
                setImages((prev) => [...prev, url]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (dates.length === 0) {
            setError("Add at least one preferred shoot date");
            return;
        }
        setBusy(true);
        const res = await submitBrief({
            intakeToken: token,
            submittedVia: "WEB",
            deliverables: deliverables.filter((d) => d.type.trim()),
            moodWords: moodWords.split(",").map((s) => s.trim()).filter(Boolean),
            moodboardImages: images,
            budgetInr: Number(budget),
            city,
            dates,
            talentPrefs:
                gender || ageRange || look
                    ? {
                          gender: gender || undefined,
                          ageRange: ageRange || undefined,
                          look: look.split(",").map((s) => s.trim()).filter(Boolean),
                      }
                    : undefined,
            notes: notes || undefined,
        });
        setBusy(false);
        if (res.success) setDone(true);
        else setError(res.error ?? "Submission failed — check the fields and try again");
    }

    if (done) {
        return (
            <div className={`${cardCls} mt-6 text-center`}>
                <h2 className="text-lg font-semibold">Brief received ✓</h2>
                <p className="mt-1 text-sm text-neutral-500">
                    Your producer is on it. Expect a shoot plan and itemised quote shortly.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div className={cardCls}>
                <h2 className="mb-3 text-sm font-semibold">Deliverables</h2>
                {deliverables.map((d, i) => (
                    <div key={i} className="mb-2 flex items-end gap-2">
                        <div className="flex-1">
                            <label className={labelCls}>Type</label>
                            <select
                                className={inputCls}
                                value={d.type}
                                onChange={(e) =>
                                    setDeliverables((rows) =>
                                        rows.map((r, j) => (j === i ? { ...r, type: e.target.value } : r))
                                    )
                                }
                            >
                                <option value="reel">Reel</option>
                                <option value="static">Static / product still</option>
                                <option value="campaign">Campaign shoot</option>
                                <option value="lookbook">Lookbook</option>
                                <option value="ugc">UGC-style video</option>
                            </select>
                        </div>
                        <div className="w-24">
                            <label className={labelCls}>Qty</label>
                            <input
                                className={inputCls}
                                type="number"
                                min={1}
                                value={d.qty}
                                onChange={(e) =>
                                    setDeliverables((rows) =>
                                        rows.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r))
                                    )
                                }
                            />
                        </div>
                        {deliverables.length > 1 && (
                            <button
                                type="button"
                                className={`${smallBtn} mb-1`}
                                onClick={() => setDeliverables((rows) => rows.filter((_, j) => j !== i))}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    className={smallBtn}
                    onClick={() => setDeliverables((rows) => [...rows, { type: "static", qty: 1 }])}
                >
                    + Add deliverable
                </button>
            </div>

            <div className={cardCls}>
                <h2 className="mb-3 text-sm font-semibold">Moodboard</h2>
                <label className={labelCls}>Mood words (comma-separated)</label>
                <input
                    className={inputCls}
                    placeholder="minimal, warm, editorial"
                    value={moodWords}
                    onChange={(e) => setMoodWords(e.target.value)}
                />
                <label className={`${labelCls} mt-3`}>Reference images</label>
                <input
                    className="text-sm"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => onFiles(e.target.files)}
                />
                {uploading && <p className="mt-2 text-sm text-neutral-500">Uploading…</p>}
                {images.length > 0 && (
                    <p className="mt-2 text-sm text-emerald-600">{images.length} image(s) attached</p>
                )}
            </div>

            <div className={cardCls}>
                <h2 className="mb-3 text-sm font-semibold">Logistics</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelCls}>City *</label>
                        <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div>
                        <label className={labelCls}>Budget (INR) *</label>
                        <input
                            className={inputCls}
                            type="number"
                            min={1}
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <label className={`${labelCls} mt-3`}>Preferred dates *</label>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        className={`${inputCls} max-w-44`}
                        type="date"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                    />
                    <button
                        type="button"
                        className={smallBtn}
                        onClick={() => {
                            if (dateInput && !dates.includes(dateInput)) setDates([...dates, dateInput]);
                            setDateInput("");
                        }}
                    >
                        + Add date
                    </button>
                    {dates.map((d) => (
                        <span
                            key={d}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs"
                        >
                            {d}
                            <button type="button" onClick={() => setDates(dates.filter((x) => x !== d))}>
                                ✕
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            <div className={cardCls}>
                <h2 className="mb-3 text-sm font-semibold">Talent preferences (optional)</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label className={labelCls}>Gender</label>
                        <input className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Age range</label>
                        <input
                            className={inputCls}
                            placeholder="20-28"
                            value={ageRange}
                            onChange={(e) => setAgeRange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Look</label>
                        <input
                            className={inputCls}
                            placeholder="editorial"
                            value={look}
                            onChange={(e) => setLook(e.target.value)}
                        />
                    </div>
                </div>
                <label className={`${labelCls} mt-3`}>Anything else</label>
                <textarea
                    className={inputCls}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                disabled={busy || uploading}
            >
                {busy ? "Submitting…" : "Submit brief"}
            </button>
        </form>
    );
}
