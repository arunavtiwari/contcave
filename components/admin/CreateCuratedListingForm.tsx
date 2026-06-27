"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createCuratedListingAction } from "@/app/actions/listingActions";
import Button from "@/components/ui/Button";

interface FormValues {
    title: string;
    description: string;
    category: string;
    locationValue: string;
    imageSrc: string;
    mapsUrl: string;
    websiteUrl: string;
    instagramHandle: string;
    priceRangeMin: string;
    priceRangeMax: string;
    contactEmail: string;
    curatedSource: string;
}

const CATEGORIES = [
    "Photography", "Video", "Podcast", "Events", "Lifestyle",
    "Product", "Interview", "Content Creation",
];

export default function CreateCuratedListingForm({ onSuccess }: { onSuccess?: () => void }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

    const onSubmit = (values: FormValues) => {
        const imageUrls = values.imageSrc
            .split("\n")
            .map(s => s.trim())
            .filter(Boolean);

        if (imageUrls.length === 0) {
            toast.error("At least one image URL is required.");
            return;
        }

        startTransition(async () => {
            const result = await createCuratedListingAction({
                title: values.title,
                description: values.description,
                category: values.category,
                locationValue: values.locationValue,
                imageSrc: imageUrls,
                mapsUrl: values.mapsUrl || undefined,
                websiteUrl: values.websiteUrl || undefined,
                instagramHandle: values.instagramHandle || undefined,
                priceRangeMin: values.priceRangeMin ? Number(values.priceRangeMin) : undefined,
                priceRangeMax: values.priceRangeMax ? Number(values.priceRangeMax) : undefined,
                contactEmail: values.contactEmail || undefined,
                curatedSource: values.curatedSource || undefined,
            });

            if (result.success) {
                toast.success("Curated listing created and published.");
                router.refresh();
                onSuccess?.();
            } else {
                toast.error(result.error ?? "Failed to create listing.");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Studio Name *</label>
                    <input {...register("title", { required: true })}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="The White Loft Studio" />
                    {errors.title && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Category *</label>
                    <select {...register("category", { required: true })}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <option value="">Select…</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-xs text-destructive">Required</p>}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Location / Area *</label>
                <input {...register("locationValue", { required: true })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Delhi NCR — Lajpat Nagar" />
                {errors.locationValue && <p className="text-xs text-destructive">Required</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description *</label>
                <textarea {...register("description", { required: true })} rows={4}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                    placeholder="Cyclorama wall · 1,400 sq ft · Natural light + studio lighting" />
                {errors.description && <p className="text-xs text-destructive">Required</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Image URLs * (one per line)</label>
                <textarea {...register("imageSrc", { required: true })} rows={3}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono resize-none"
                    placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg" />
                {errors.imageSrc && <p className="text-xs text-destructive">At least one URL required</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Est. Price Min (₹/hr)</label>
                    <input {...register("priceRangeMin")} type="number" min={0}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="800" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Est. Price Max (₹/hr)</label>
                    <input {...register("priceRangeMax")} type="number" min={0}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="1500" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Google Maps URL</label>
                    <input {...register("mapsUrl")}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="https://maps.google.com/…" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Studio Website</label>
                    <input {...register("websiteUrl")}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="https://studioname.com" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Instagram Handle</label>
                    <input {...register("instagramHandle")}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="@studioname" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Contact Email (internal only — never shown publicly)</label>
                    <input {...register("contactEmail")} type="email"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="owner@studio.com" />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Source Notes</label>
                <input {...register("curatedSource")}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Google Maps, studio website, etc." />
            </div>

            <div className="flex justify-end pt-2">
                <Button label={isPending ? "Publishing…" : "Publish Curated Listing"}
                    disabled={isPending} loading={isPending} />
            </div>
        </form>
    );
}
