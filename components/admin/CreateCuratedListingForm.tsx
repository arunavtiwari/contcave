"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createCuratedListingAction } from "@/app/actions/listingActions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

const CATEGORIES = [
  "Photography",
  "Video",
  "Podcast",
  "Events",
  "Lifestyle",
  "Product",
  "Interview",
  "Content Creation",
] as const;

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

const curatedListingSchema = z.object({
  title: z.string().trim().min(1, "Studio name is required"),
  category: z.string().min(1, "Please select a category"),
  locationValue: z.string().trim().min(1, "Location or area is required"),
  description: z.string().trim().min(1, "Description is required"),
  imageSrc: z.string().trim().min(1, "At least one image URL is required"),
  priceRangeMin: z.string().optional(),
  priceRangeMax: z.string().optional(),
  mapsUrl: z.string().trim().optional(),
  websiteUrl: z.string().trim().optional(),
  instagramHandle: z.string().trim().optional(),
  contactEmail: z
    .string()
    .trim()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    })
    .optional(),
  curatedSource: z.string().trim().optional(),
});

type FormValues = z.infer<typeof curatedListingSchema>;

export default function CreateCuratedListingForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(curatedListingSchema),
    defaultValues: {
      title: "",
      category: "",
      locationValue: "",
      description: "",
      imageSrc: "",
      priceRangeMin: "",
      priceRangeMax: "",
      mapsUrl: "",
      websiteUrl: "",
      instagramHandle: "",
      contactEmail: "",
      curatedSource: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const imageUrls = values.imageSrc
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (imageUrls.length === 0) {
      toast.error("Please enter at least one valid image URL.");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="title"
          label="Studio Name"
          required
          placeholder="The White Loft Studio"
          error={errors.title?.message}
          {...register("title")}
        />

        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              id="category"
              label="Category"
              required
              options={CATEGORY_OPTIONS}
              value={CATEGORY_OPTIONS.find((c) => c.value === field.value) || null}
              onChange={(option) => {
                const selected = option as { value: string; label: string } | null;
                field.onChange(selected?.value ?? "");
              }}
              error={errors.category?.message}
              placeholder="Select category…"
            />
          )}
        />
      </div>

      <Input
        id="locationValue"
        label="Location / Area"
        required
        placeholder="Delhi NCR — Lajpat Nagar"
        error={errors.locationValue?.message}
        {...register("locationValue")}
      />

      <Textarea
        id="description"
        label="Description"
        required
        rows={4}
        placeholder="Cyclorama wall · 1,400 sq ft · Natural light + studio lighting"
        errors={errors}
        {...register("description")}
      />

      <Textarea
        id="imageSrc"
        label="Image URLs (one per line)"
        required
        rows={3}
        className="font-mono text-xs"
        placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
        errors={errors}
        {...register("imageSrc")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="priceRangeMin"
          label="Est. Price Min (₹/hr)"
          type="number"
          min={0}
          placeholder="800"
          error={errors.priceRangeMin?.message}
          {...register("priceRangeMin")}
        />
        <Input
          id="priceRangeMax"
          label="Est. Price Max (₹/hr)"
          type="number"
          min={0}
          placeholder="1500"
          error={errors.priceRangeMax?.message}
          {...register("priceRangeMax")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="mapsUrl"
          label="Google Maps URL"
          placeholder="https://maps.google.com/…"
          error={errors.mapsUrl?.message}
          {...register("mapsUrl")}
        />
        <Input
          id="websiteUrl"
          label="Studio Website"
          placeholder="https://studioname.com"
          error={errors.websiteUrl?.message}
          {...register("websiteUrl")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="instagramHandle"
          label="Instagram Handle"
          placeholder="@studioname"
          error={errors.instagramHandle?.message}
          {...register("instagramHandle")}
        />
        <Input
          id="contactEmail"
          label="Contact Email (Internal)"
          description="Never shown publicly"
          type="email"
          placeholder="owner@studio.com"
          error={errors.contactEmail?.message}
          {...register("contactEmail")}
        />
      </div>

      <Input
        id="curatedSource"
        label="Source Notes"
        placeholder="Google Maps, studio website, Instagram, etc."
        error={errors.curatedSource?.message}
        {...register("curatedSource")}
      />

      <div className="flex justify-end pt-2">
        <Button
          label={isPending ? "Publishing…" : "Publish Curated Listing"}
          type="submit"
          disabled={isPending}
          loading={isPending}
        />
      </div>
    </form>
  );
}
