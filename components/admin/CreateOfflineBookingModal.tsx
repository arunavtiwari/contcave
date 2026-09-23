"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  FiAlertCircle,
  FiClock,
  FiCreditCard,
  FiHome,
  FiLayers,
  FiPackage,
  FiUser,
} from "react-icons/fi";
import { toast } from "sonner";

import {
  createAdminOfflineBookingAction,
  getAdminStudioForOfflineBookingAction,
  getAdminStudiosForOfflineBookingAction,
} from "@/app/actions/adminBookingActions";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import Pill from "@/components/ui/Pill";
import Select, { SelectOption } from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";
import { AdminStudioOption, AdminStudioSummary } from "@/lib/admin/offlineBooking";
import { calculateSetPricing } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";
import {
  CreateAdminOfflineBookingInput,
  createAdminOfflineBookingSchema,
} from "@/schemas/offlineBooking";

interface CreateOfflineBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "Bank Transfer (NEFT/RTGS/IMPS)", label: "Bank Transfer (NEFT / RTGS / IMPS)" },
  { value: "UPI (GPay/PhonePe/Paytm)", label: "UPI (Google Pay / PhonePe / Paytm)" },
  { value: "Cash", label: "Cash" },
  { value: "Credit/Debit Card (POS)", label: "Credit / Debit Card (Card Machine / POS)" },
  { value: "Cheque", label: "Cheque / Demand Draft" },
  { value: "Other Offline Method", label: "Other Offline Method" },
];

const PAYMENT_TERMS_PRESETS = [
  "100% advance payment received offline",
  "50% advance received, balance payable on shoot day",
  "Full payment settled post-shoot",
  "Net 15 days payment terms",
];

const TIME_OPTIONS: SelectOption[] = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
  return { value: timeStr, label: timeStr };
});

function calculateEndTime(startTime: string, hours: number): string {
  const match = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return startTime;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const totalMinutes = hour * 60 + minute + Math.round(hours * 60);
  const endHour24 = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  const endPeriod = endHour24 >= 12 ? "PM" : "AM";
  const endDisplayHour = endHour24 === 0 ? 12 : endHour24 > 12 ? endHour24 - 12 : endHour24;

  return `${String(endDisplayHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")} ${endPeriod}`;
}

/**
 * Shared across mounts so the studio selector is only built once per page session.
 * Creating a booking refreshes both, since the new reservation can change availability.
 */
let studioCache: AdminStudioSummary[] | null = null;
const studioDetailCache = new Map<string, AdminStudioOption>();

function resetStudioCaches() {
  studioCache = null;
  studioDetailCache.clear();
}

/** Matches the studio overview panel, so selecting a studio doesn't shift the dialog. */
function StudioOverviewSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-background p-3.5 space-y-3"
      aria-label="Loading studio details"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-3 w-60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Host, phone, email, bank, GSTIN, property state */}
      <div className="grid gap-3 pt-2 border-t border-border/70 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-full rounded" />
          </div>
        ))}
      </div>

      {/* Configured sets and packages */}
      <div className="space-y-1.5 border-t border-border/70 pt-2">
        <Skeleton className="h-3 w-40 rounded" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-24 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CreateOfflineBookingModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOfflineBookingModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [studios, setStudios] = useState<AdminStudioSummary[]>([]);
  const [isLoadingStudios, setIsLoadingStudios] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<AdminStudioOption | null>(null);
  // The id the selector is showing, which is set before its details finish loading.
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [isLoadingStudio, setIsLoadingStudio] = useState(false);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [showCustomerGst, setShowCustomerGst] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAdminOfflineBookingInput>({
    resolver: zodResolver(createAdminOfflineBookingSchema),
    defaultValues: {
      listingId: "",
      studioName: "",
      studioEmail: "",
      studioAddress: "",
      studioGst: "",
      propertyStateCode: "07",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerGst: "",
      customerCompanyName: "",
      customerBillingAddress: "",
      bookingDate: defaultDate,
      startTime: "10:00 AM",
      endTime: "02:00 PM",
      bookingType: "HOURLY",
      packageId: "",
      packageName: "",
      setIds: [],
      hoursBooked: 4,
      price: 4000,
      paymentMadeVia: "Bank Transfer (NEFT/RTGS/IMPS)",
      paymentTerms: "100% advance payment received offline",
      internalNotes: "",
    },
  });

  const watchBookingType = watch("bookingType");
  const watchHoursBooked = watch("hoursBooked");
  const watchStartTime = watch("startTime");

  // Fetch available studios when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setServerError(null);

    // Reopening the dialog reuses the studios already fetched in this session; the list
    // is expensive to build server-side and barely changes between two bookings.
    if (studioCache) {
      setStudios(studioCache);
      return;
    }

    setIsLoadingStudios(true);

    getAdminStudiosForOfflineBookingAction({})
      .then((res) => {
        if (res.success && res.data) {
          studioCache = res.data;
          if (active) setStudios(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load studios for offline booking:", err);
      })
      .finally(() => {
        if (active) setIsLoadingStudios(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Pure helper to calculate suggested price based on studio rates, sets, and packages
  const calculateSuggestedPrice = (
    targetStudio: AdminStudioOption | null,
    targetBookingType: "HOURLY" | "PACKAGE",
    targetPackageId: string | null | undefined,
    targetSetIds: string[],
    hours: number
  ): number => {
    if (!targetStudio) return 0;

    if (targetBookingType === "PACKAGE") {
      const pkg = targetStudio.packages.find((p) => p.id === targetPackageId);
      if (pkg) return pkg.offeredPrice;
    }

    // Hourly mode:
    if (targetStudio.hasSets && targetStudio.sets.length > 0 && targetSetIds.length > 0) {
      const formattedSets = targetStudio.sets.map((s) => ({
        ...s,
        listingId: targetStudio.id,
        images: [],
        description: null,
        aesthetics: [],
        setFeatures: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const res = calculateSetPricing({
        baseHourlyRate: targetStudio.price,
        durationMinutes: Math.max(1, Math.round(hours * 60)),
        selectedSetIds: targetSetIds,
        sets: formattedSets,
        pricingType: targetStudio.additionalSetPricingType,
        selectedPackage: null,
      });

      return res.subtotal;
    }

    return Math.round((targetStudio.price || 0) * hours);
  };

  // Handle studio selection auto-population. The studio's sets, packages and host payout
  // details are fetched on demand — loading them for every studio on the platform is what
  // used to make this dialog slow to open.
  const handleStudioSelect = async (studioId: string) => {
    setSelectedStudioId(studioId);
    setSelectedStudio(null);
    setServerError(null);

    let studio = studioDetailCache.get(studioId) || null;
    if (!studio) {
      setIsLoadingStudio(true);
      const res = await getAdminStudioForOfflineBookingAction({ listingId: studioId });
      setIsLoadingStudio(false);

      if (!res.success || !res.data) {
        toast.error(res.error || "Couldn't load that studio");
        setSelectedStudioId(null);
        return;
      }
      studio = res.data as AdminStudioOption;
      studioDetailCache.set(studioId, studio);
    }

    setSelectedStudio(studio);

    if (studio) {
      setValue("listingId", studio.id, { shouldValidate: true });
      setValue("studioName", studio.title, { shouldValidate: true });
      setValue("studioEmail", studio.hostEmail, { shouldValidate: true });
      setValue("studioAddress", studio.address, { shouldValidate: true });
      setValue("studioGst", studio.gstin || "", { shouldValidate: true });
      setValue("propertyStateCode", studio.propertyStateCode || "07", { shouldValidate: true });

      // Default sets: If studio has sets, select all sets (Entire Studio) by default
      const defaultSetIds = studio.hasSets && studio.sets.length > 0
        ? studio.sets.map((s) => s.id)
        : [];
      setSelectedSetIds(defaultSetIds);
      setValue("setIds", defaultSetIds, { shouldValidate: true });

      // If studio has packages and package mode is selected, select the first package
      if (watchBookingType === "PACKAGE" && studio.packages.length > 0) {
        handlePackageSelect(studio.packages[0].id, studio);
      } else {
        const suggested = calculateSuggestedPrice(
          studio,
          "HOURLY",
          null,
          defaultSetIds,
          watchHoursBooked || 4
        );
        setValue("price", suggested, { shouldValidate: true });
      }
    }
  };

  // Handle package selection
  const handlePackageSelect = (packageId: string, studioOverride?: AdminStudioOption | null) => {
    const studio = studioOverride !== undefined ? studioOverride : selectedStudio;
    setValue("packageId", packageId, { shouldValidate: true });
    if (!studio) return;

    const pkg = studio.packages.find((p) => p.id === packageId);
    if (pkg) {
      setValue("packageName", pkg.title, { shouldValidate: true });
      setValue("hoursBooked", pkg.durationHours, { shouldValidate: true });
      setValue("price", pkg.offeredPrice, { shouldValidate: true });
      setValue("endTime", calculateEndTime(watchStartTime, pkg.durationHours), { shouldValidate: true });

      // If package specifies eligible sets, sync them
      if (pkg.eligibleSetIds && pkg.eligibleSetIds.length > 0) {
        setSelectedSetIds(pkg.eligibleSetIds);
        setValue("setIds", pkg.eligibleSetIds, { shouldValidate: true });
      }
    }
  };

  // Handle set selection toggling
  const handleToggleSet = (setId: string) => {
    if (!selectedStudio) return;

    const isCurrentlySelected = selectedSetIds.includes(setId);
    const newSetIds = isCurrentlySelected
      ? selectedSetIds.filter((id) => id !== setId)
      : [...selectedSetIds, setId];

    setSelectedSetIds(newSetIds);
    setValue("setIds", newSetIds, { shouldValidate: true });

    if (watchBookingType === "HOURLY") {
      const suggested = calculateSuggestedPrice(
        selectedStudio,
        "HOURLY",
        null,
        newSetIds,
        watchHoursBooked || 4
      );
      setValue("price", suggested, { shouldValidate: true });
    }
  };

  const handleSelectAllSets = () => {
    if (!selectedStudio) return;
    const allIds = selectedStudio.sets.map((s) => s.id);
    setSelectedSetIds(allIds);
    setValue("setIds", allIds, { shouldValidate: true });

    if (watchBookingType === "HOURLY") {
      const suggested = calculateSuggestedPrice(
        selectedStudio,
        "HOURLY",
        null,
        allIds,
        watchHoursBooked || 4
      );
      setValue("price", suggested, { shouldValidate: true });
    }
  };

  const handleClearSets = () => {
    setSelectedSetIds([]);
    setValue("setIds", [], { shouldValidate: true });

    if (watchBookingType === "HOURLY" && selectedStudio) {
      const suggested = calculateSuggestedPrice(
        selectedStudio,
        "HOURLY",
        null,
        [],
        watchHoursBooked || 4
      );
      setValue("price", suggested, { shouldValidate: true });
    }
  };

  // Auto-recalculate end time when start time changes
  const handleStartTimeChange = (newStartTime: string) => {
    setValue("startTime", newStartTime, { shouldValidate: true });
    setValue("endTime", calculateEndTime(newStartTime, watchHoursBooked || 4), { shouldValidate: true });
  };

  // Auto-recalculate end time and suggested price when hours change in hourly mode
  const handleHoursChange = (hours: number) => {
    setValue("hoursBooked", hours, { shouldValidate: true });
    setValue("endTime", calculateEndTime(watchStartTime, hours), { shouldValidate: true });
    if (watchBookingType === "HOURLY" && selectedStudio) {
      const suggested = calculateSuggestedPrice(
        selectedStudio,
        "HOURLY",
        null,
        selectedSetIds,
        hours
      );
      setValue("price", suggested, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateAdminOfflineBookingInput) => {
    setServerError(null);

    startTransition(async () => {
      try {
        const res = await createAdminOfflineBookingAction(data);

        if (!res.success) {
          setServerError(res.error || "Failed to create booking");
          toast.error(res.error || "Failed to create booking");
          return;
        }

        const details = res.data;
        toast.success(
          `Booking ${details?.bookingId || ""} created successfully! Invoice generated.`,
          { duration: 5000 }
        );

        resetStudioCaches();
        reset();
        setSelectedStudio(null);
        setSelectedStudioId(null);
        setSelectedSetIds([]);
        setShowCustomerGst(false);
        onClose();
        router.refresh();
        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setServerError(message);
        toast.error(message);
      }
    });
  };

  const studioOptions: SelectOption[] = useMemo(() => {
    return studios.map((s) => ({
      value: s.id,
      label: `${s.title} — ${s.hostName || "Host"} (${s.address})`,
    }));
  }, [studios]);

  const packageOptions: SelectOption[] = useMemo(() => {
    if (!selectedStudio || selectedStudio.packages.length === 0) return [];
    return selectedStudio.packages.map((p) => ({
      value: p.id,
      label: `${p.title} (${p.durationHours}h) — ${formatINR(p.offeredPrice)}`,
    }));
  }, [selectedStudio]);

  const modalBody = (
    <form id="create-offline-booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{serverError}</span>
        </div>
      )}

      {/* SECTION 1: STUDIO SELECTION & OVERVIEW */}
      <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiHome size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">1. Studio Selection</h3>
            <p className="text-xs text-muted-foreground">Select a verified studio from the ContCave platform</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Select
              id="studioSelect"
              label="Select Studio from Platform"
              required
              isSearchable
              placeholder={isLoadingStudios ? "Loading ContCave studios…" : "Search by studio name, host or location…"}
              options={studioOptions}
              value={selectedStudioId ? studioOptions.find((o) => o.value === selectedStudioId) || null : null}
              onChange={(opt) => {
                const selected = opt as SelectOption | null;
                if (selected?.value) void handleStudioSelect(selected.value);
              }}
              isDisabled={isLoadingStudios || isLoadingStudio || isPending}
              error={errors.listingId?.message}
            />
          </div>

          {isLoadingStudio ? (
            <StudioOverviewSkeleton />
          ) : selectedStudio ? (
            <div className="rounded-xl border border-border bg-background p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{selectedStudio.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedStudio.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill label={`${formatINR(selectedStudio.price)}/hr`} variant="neutral" size="xs" />
                  {selectedStudio.hasSets && selectedStudio.sets.length > 0 && (
                    <Pill label={`${selectedStudio.sets.length} Sets`} variant="secondary" size="xs" />
                  )}
                  {selectedStudio.packages.length > 0 && (
                    <Pill label={`${selectedStudio.packages.length} Packages`} variant="neutral" size="xs" />
                  )}
                </div>
              </div>

              {/* OWNER & BANKING DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2.5 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Space Owner / Host:</span>
                  <span className="font-medium text-foreground inline-flex items-center gap-1.5 mt-0.5">
                    {selectedStudio.hostName || "Host"}
                    {selectedStudio.hostIsVerified && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Verified
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Owner Phone:</span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {selectedStudio.hostPhone || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Owner Email:</span>
                  <span className="font-medium text-foreground mt-0.5 block truncate" title={selectedStudio.hostEmail}>
                    {selectedStudio.hostEmail || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Bank / Payout Info:</span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {selectedStudio.bankAccountLast4 ? (
                      <span className="font-mono text-[11px]">
                        ••••{selectedStudio.bankAccountLast4} {selectedStudio.bankIfsc ? `(${selectedStudio.bankIfsc})` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">No Bank Added</span>
                    )}
                  </span>
                </div>
              </div>

              {/* STUDIO GSTIN & STATE */}
              <div className="pt-2 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Studio GSTIN:{" "}
                  <span className="font-mono text-foreground font-medium">
                    {selectedStudio.gstin || "Non-GST / None"}
                  </span>
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Property State: <span className="font-mono text-foreground font-medium">{selectedStudio.propertyStateCode || "07"}</span>
                </span>
              </div>

              {/* CONFIGURED SETS DETAILS */}
              {selectedStudio.hasSets && selectedStudio.sets.length > 0 && (
                <div className="pt-2 border-t border-border/70 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground font-medium mb-1.5">
                    <FiLayers size={13} className="text-primary" />
                    <span>Configured Studio Sets ({selectedStudio.sets.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudio.sets.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-foreground"
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">
                          ({selectedStudio.setsHaveSamePrice && selectedStudio.unifiedSetPrice
                            ? `${formatINR(selectedStudio.unifiedSetPrice)}/hr`
                            : `${formatINR(s.price)}/hr`})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CONFIGURED PACKAGES DETAILS */}
              {selectedStudio.packages.length > 0 && (
                <div className="pt-2 border-t border-border/70 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground font-medium mb-1.5">
                    <FiPackage size={13} className="text-primary" />
                    <span>Configured Studio Packages ({selectedStudio.packages.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudio.packages.map((pkg) => (
                      <span
                        key={pkg.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-foreground"
                      >
                        <span className="font-medium">{pkg.title}</span>
                        <span className="text-muted-foreground">
                          ({pkg.durationHours}h — {formatINR(pkg.offeredPrice)})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3.5 text-center text-xs text-muted-foreground">
              Please choose a studio from the dropdown above to load its sets, packages, and auto-populate rates.
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: CUSTOMER DETAILS */}
      <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiUser size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">2. Customer Details</h3>
            <p className="text-xs text-muted-foreground">Booking confirmation, invoice PDF & WhatsApp sent here</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="customerName"
              label="Customer Name"
              required
              register={register("customerName")}
              error={errors.customerName?.message}
              disabled={isPending}
              placeholder="Full name"
            />
            <Input
              id="customerPhone"
              label="Customer Phone (for WhatsApp)"
              required
              register={register("customerPhone")}
              error={errors.customerPhone?.message}
              disabled={isPending}
              placeholder="e.g. 9876543210"
              description="WhatsApp confirmation will be sent here"
            />
            <Input
              id="customerEmail"
              label="Customer Email (for Invoice)"
              type="email"
              required
              register={register("customerEmail")}
              error={errors.customerEmail?.message}
              disabled={isPending}
              placeholder="client@example.com"
              description="Invoice PDF will be attached to email"
            />
          </div>

          <div>
            <Checkbox
              id="toggleCustomerGst"
              label="Add Customer GST Details (for Tax Invoice)"
              checked={showCustomerGst}
              onCheckedChange={(checked) => {
                setShowCustomerGst(checked);
                if (!checked) {
                  setValue("customerGst", "");
                  setValue("customerCompanyName", "");
                  setValue("customerBillingAddress", "");
                }
              }}
              disabled={isPending}
            />

            {showCustomerGst && (
              <div className="mt-3 space-y-3 rounded-lg border border-border/80 bg-background/60 p-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    id="customerGst"
                    label="Customer GSTIN"
                    register={register("customerGst")}
                    error={errors.customerGst?.message}
                    disabled={isPending}
                    placeholder="e.g. 07BBBBB1111B1Z2"
                  />
                  <Input
                    id="customerCompanyName"
                    label="Company / Firm Name"
                    register={register("customerCompanyName")}
                    error={errors.customerCompanyName?.message}
                    disabled={isPending}
                    placeholder="Registered business name"
                  />
                </div>
                <Input
                  id="customerBillingAddress"
                  label="Customer Billing Address"
                  register={register("customerBillingAddress")}
                  error={errors.customerBillingAddress?.message}
                  disabled={isPending}
                  placeholder="Registered billing address for invoice"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: BOOKING SCHEDULE & PRICING */}
      <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiClock size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">3. Booking Schedule & Price</h3>
            <p className="text-xs text-muted-foreground">Specify the session duration and agreed booking price</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Controller
              name="bookingDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="bookingDate"
                  label="Booking Date"
                  required
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  error={errors.bookingDate?.message}
                  disabled={isPending}
                  size="sm"
                />
              )}
            />

            <Controller
              name="bookingType"
              control={control}
              render={({ field }) => (
                <Select
                  id="bookingType"
                  label="Booking Mode"
                  required
                  options={[
                    { value: "HOURLY", label: "Hourly Booking" },
                    { value: "PACKAGE", label: "Package Booking" },
                  ]}
                  value={
                    field.value === "PACKAGE"
                      ? { value: "PACKAGE", label: "Package Booking" }
                      : { value: "HOURLY", label: "Hourly Booking" }
                  }
                  onChange={(opt) => {
                    const selected = opt as SelectOption | null;
                    const nextVal = (selected?.value as "HOURLY" | "PACKAGE") || "HOURLY";
                    field.onChange(nextVal);
                    if (nextVal === "PACKAGE" && selectedStudio && selectedStudio.packages.length > 0) {
                      handlePackageSelect(selectedStudio.packages[0].id);
                    } else if (nextVal === "HOURLY" && selectedStudio) {
                      const suggested = calculateSuggestedPrice(
                        selectedStudio,
                        "HOURLY",
                        null,
                        selectedSetIds,
                        watchHoursBooked || 4
                      );
                      setValue("price", suggested, { shouldValidate: true });
                    }
                  }}
                  isDisabled={isPending}
                />
              )}
            />

            {watchBookingType === "PACKAGE" ? (
              packageOptions.length > 0 ? (
                <Controller
                  name="packageId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="packageId"
                      label="Select Package"
                      required
                      options={packageOptions}
                      value={packageOptions.find((p) => p.value === field.value) || null}
                      onChange={(opt) => {
                        const selected = opt as SelectOption | null;
                        if (selected?.value) handlePackageSelect(selected.value);
                      }}
                      isDisabled={isPending}
                      error={errors.packageId?.message}
                    />
                  )}
                />
              ) : (
                <Input
                  id="packageName"
                  label="Package Name"
                  required
                  register={register("packageName")}
                  error={errors.packageName?.message}
                  disabled={isPending}
                  placeholder="e.g. 8-Hour Full Day Shoot"
                  description="This studio has no pre-set packages"
                />
              )
            ) : (
              <Input
                id="hoursBooked"
                label="Duration (Hours)"
                type="number"
                step="0.5"
                min="0.5"
                required
                register={register("hoursBooked", { valueAsNumber: true })}
                error={errors.hoursBooked?.message}
                disabled={isPending}
                onChange={(e) => handleHoursChange(Number(e.target.value))}
              />
            )}
          </div>

          {/* DEDICATED SETS SELECTION (When studio has configured sets) */}
          {selectedStudio && selectedStudio.hasSets && selectedStudio.sets.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FiLayers size={14} className="text-primary" />
                  <span>Select Sets for this Booking</span>
                  <span className="text-muted-foreground font-normal">
                    ({selectedSetIds.length} of {selectedStudio.sets.length} selected)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSets}
                    className="text-[11px] font-medium text-primary hover:underline transition-colors"
                    disabled={isPending}
                  >
                    Entire Studio (All Sets)
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={handleClearSets}
                    className="text-[11px] font-medium text-muted-foreground hover:underline transition-colors"
                    disabled={isPending}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedStudio.sets.map((set) => {
                  const isSelected = selectedSetIds.includes(set.id);
                  const displayRate = selectedStudio.setsHaveSamePrice && selectedStudio.unifiedSetPrice
                    ? selectedStudio.unifiedSetPrice
                    : set.price;

                  return (
                    <div
                      key={set.id}
                      onClick={() => !isPending && handleToggleSet(set.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors select-none text-xs",
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Checkbox
                          id={`set-${set.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSet(set.id)}
                          disabled={isPending}
                        />
                        <span className="truncate">{set.name}</span>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground font-mono">
                        {formatINR(displayRate)}/hr
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sets selection automatically suggests the booking rate, but the final price remains fully editable below.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <Select
                  id="startTime"
                  label="Start Time"
                  required
                  options={TIME_OPTIONS}
                  value={TIME_OPTIONS.find((t) => t.value === field.value) || null}
                  onChange={(opt) => {
                    const selected = opt as SelectOption | null;
                    if (selected?.value) handleStartTimeChange(selected.value);
                  }}
                  isDisabled={isPending}
                />
              )}
            />

            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <Select
                  id="endTime"
                  label="End Time (Auto-calculated)"
                  required
                  options={TIME_OPTIONS}
                  value={TIME_OPTIONS.find((t) => t.value === field.value) || null}
                  onChange={(opt) => {
                    const selected = opt as SelectOption | null;
                    field.onChange(selected?.value || "");
                  }}
                  isDisabled={isPending}
                />
              )}
            />

            <Input
              id="price"
              label="Agreed Price (₹ INR)"
              type="number"
              required
              formatPrice
              register={register("price", { valueAsNumber: true })}
              error={errors.price?.message}
              disabled={isPending}
              description="Pre-filled based on selection, but freely editable"
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: PAYMENT TERMS & INTERNAL INFO */}
      <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiCreditCard size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">4. Payment Terms & Internal Notes</h3>
            <p className="text-xs text-muted-foreground">Internal payment tracking and offline payment terms</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="paymentMadeVia"
              control={control}
              render={({ field }) => (
                <Select
                  id="paymentMadeVia"
                  label="Payment Made Via"
                  required
                  options={PAYMENT_METHOD_OPTIONS}
                  value={PAYMENT_METHOD_OPTIONS.find((o) => o.value === field.value) || null}
                  onChange={(opt) => {
                    const selected = opt as SelectOption | null;
                    field.onChange(selected?.value || "");
                  }}
                  isDisabled={isPending}
                />
              )}
            />

            <div>
              <Input
                id="paymentTerms"
                label="Payment Terms"
                required
                register={register("paymentTerms")}
                error={errors.paymentTerms?.message}
                disabled={isPending}
                placeholder="e.g. 100% advance received offline"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {PAYMENT_TERMS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue("paymentTerms", preset, { shouldValidate: true })}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Textarea
            id="internalNotes"
            label="Internal Notes (Optional)"
            placeholder="e.g. Booking taken directly via studio manager phone call. Payment verified via bank statement."
            {...register("internalNotes")}
            disabled={isPending}
            rows={2}
          />
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          label="Cancel"
          outline
          onClick={onClose}
          disabled={isPending}
        />
        <Button
          type="submit"
          label={isPending ? "Creating Booking & Generating Invoice…" : "Create Booking"}
          disabled={isPending}
        />
      </div>
    </form>
  );

  return (
    <Modal
      isOpen={isOpen}
      onCloseAction={onClose}
      onSubmitAction={() => {}}
      title="Create Booking"
      customWidth="max-w-4xl"
      body={modalBody}
      selfActionButton
      actionLabel=""
    />
  );
}
