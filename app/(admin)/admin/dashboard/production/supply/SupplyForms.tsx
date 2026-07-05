"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createCrewMember, createTalentProfile } from "@/app/actions/productionActions";

const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";
const btnCls =
    "mt-4 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50";

const splitCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function CrewForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [role, setRole] = useState("PHOTOGRAPHER");
    const [city, setCity] = useState("");
    const [serviceable, setServiceable] = useState("");
    const [rate, setRate] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await createCrewMember({
            name,
            role: role as "PHOTOGRAPHER",
            city,
            serviceableCities: splitCsv(serviceable),
            dayRateInr: Number(rate),
            contact: phone ? { phone } : undefined,
        });
        setBusy(false);
        if (res.success) {
            setName(""); setCity(""); setServiceable(""); setRate(""); setPhone("");
            router.refresh();
        } else {
            setError(res.error ?? "Failed to add crew member");
        }
    }

    return (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-background p-5">
            <h2 className="mb-4 text-base font-semibold">Add crew member</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className={labelCls}>Name *</label>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <label className={labelCls}>Role</label>
                    <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="PHOTOGRAPHER">Photographer</option>
                        <option value="MUA">MUA</option>
                        <option value="STYLIST">Stylist</option>
                        <option value="DP">DP</option>
                        <option value="ASSISTANT">Assistant</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Home city *</label>
                    <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div>
                    <label className={labelCls}>Also serves (comma-separated)</label>
                    <input
                        className={inputCls}
                        placeholder="Noida, Gurgaon"
                        value={serviceable}
                        onChange={(e) => setServiceable(e.target.value)}
                    />
                </div>
                <div>
                    <label className={labelCls}>Day rate (INR) *</label>
                    <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className={labelCls}>Phone</label>
                    <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button className={btnCls} disabled={busy}>
                {busy ? "Adding…" : "Add crew"}
            </button>
        </form>
    );
}

export function TalentForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [city, setCity] = useState("");
    const [gender, setGender] = useState("");
    const [ageRange, setAgeRange] = useState("");
    const [look, setLook] = useState("");
    const [rate, setRate] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await createTalentProfile({
            name,
            city,
            serviceableCities: [],
            attributes: { gender, ageRange, look: splitCsv(look) },
            dayRateInr: Number(rate),
        });
        setBusy(false);
        if (res.success) {
            setName(""); setCity(""); setGender(""); setAgeRange(""); setLook(""); setRate("");
            router.refresh();
        } else {
            setError(res.error ?? "Failed to add talent");
        }
    }

    return (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-background p-5">
            <h2 className="mb-4 text-base font-semibold">Add talent</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className={labelCls}>Name *</label>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <label className={labelCls}>City *</label>
                    <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div>
                    <label className={labelCls}>Gender *</label>
                    <input className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)} required />
                </div>
                <div>
                    <label className={labelCls}>Age range *</label>
                    <input
                        className={inputCls}
                        placeholder="20-28"
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className={labelCls}>Look (comma-separated)</label>
                    <input
                        className={inputCls}
                        placeholder="editorial, girl-next-door"
                        value={look}
                        onChange={(e) => setLook(e.target.value)}
                    />
                </div>
                <div>
                    <label className={labelCls}>Day rate (INR) *</label>
                    <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        required
                    />
                </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button className={btnCls} disabled={busy}>
                {busy ? "Adding…" : "Add talent"}
            </button>
        </form>
    );
}
