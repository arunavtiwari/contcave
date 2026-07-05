"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClientBrand } from "@/app/actions/productionActions";

const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

export default function BrandForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [city, setCity] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await createClientBrand({
            name,
            category: category || undefined,
            city: city || undefined,
            contact: phone ? { phone } : undefined,
        });
        setBusy(false);
        if (res.success) {
            setName("");
            setCategory("");
            setCity("");
            setPhone("");
            router.refresh();
        } else {
            setError(res.error ?? "Failed to create brand");
        }
    }

    return (
        <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-background p-5"
        >
            <h2 className="mb-4 text-base font-semibold text-foreground">Add brand</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <label className={labelCls}>Name *</label>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <label className={labelCls}>Category</label>
                    <input
                        className={inputCls}
                        placeholder="D2C skincare"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    />
                </div>
                <div>
                    <label className={labelCls}>City</label>
                    <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>WhatsApp phone</label>
                    <input
                        className={inputCls}
                        placeholder="+91…"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
                className="mt-4 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                disabled={busy}
            >
                {busy ? "Creating…" : "Create brand + intake link"}
            </button>
        </form>
    );
}
