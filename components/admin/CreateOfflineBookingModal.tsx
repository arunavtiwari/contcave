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
  FiUser,
} from "react-icons/fi";
import { toast } from "sonner";

import {
  createAdminOfflineBookingAction,
  getAdminStudiosForOfflineBookingAction,
} from "@/app/actions/adminBookingActions";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Select, { SelectOption } from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { AdminStudioOption } from "@/lib/admin/offlineBooking";
import { formatINR } from "@/lib/utils";
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

export default function CreateOfflineBookingModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOfflineBookingModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [studios, setStudios] = useState<AdminStudioOption[]>([]);
  const [isLoadingStudios, setIsLoadingStudios] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<AdminStudioOption | null>(null);
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
    setIsLoadingStudios(true);
    setServerError(null);

    getAdminStudiosForOfflineBookingAction({})
      .then((res) => {
        if (active && res.success && res.data) {
          setStudios(res.data);
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

  // Handle studio selection auto-population
  const handleStudioSelect = (studioId: string) => {
    const studio = studios.find((s) => s.id === studioId) || null;
    setSelectedStudio(studio);

    if (studio) {
      setValue("listingId", studio.id, { shouldValidate: true });
      setValue("studioName", studio.title, { shouldValidate: true });
      setValue("studioEmail", studio.hostEmail, { shouldValidate: true });
      setValue("studioAddress", studio.address, { shouldValidate: true });
      setValue("studioGst", studio.gstin || "", { shouldValidate: true });
      setValue("propertyStateCode", studio.propertyStateCode || "07", { shouldValidate: true });

      // If studio has packages, default to first package if package type selected
      if (watchBookingType === "PACKAGE" && studio.packages.length > 0) {
        const firstPkg = studio.packages[0];
        setValue("packageId", firstPkg.id);
        setValue("packageName", firstPkg.title);
        setValue("hoursBooked", firstPkg.durationHours);
        setValue("price", firstPkg.offeredPrice);
        setValue("endTime", calculateEndTime(watchStartTime, firstPkg.durationHours));
      } else if (studio.price > 0) {
        const calculated = studio.price * (watchHoursBooked || 4);
        setValue("price", calculated, { shouldValidate: true });
      }
    }
  };

  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    setValue("packageId", packageId);
    if (!selectedStudio) return;

    const pkg = selectedStudio.packages.find((p) => p.id === packageId);
    if (pkg) {
      setValue("packageName", pkg.title, { shouldValidate: true });
      setValue("hoursBooked", pkg.durationHours, { shouldValidate: true });
      setValue("price", pkg.offeredPrice, { shouldValidate: true });
      setValue("endTime", calculateEndTime(watchStartTime, pkg.durationHours));
    }
  };

  // Auto-recalculate end time when start time or hours change
  const handleStartTimeChange = (newStartTime: string) => {
    setValue("startTime", newStartTime, { shouldValidate: true });
    setValue("endTime", calculateEndTime(newStartTime, watchHoursBooked || 4), { shouldValidate: true });
  };

  const handleHoursChange = (hours: number) => {
    setValue("hoursBooked", hours, { shouldValidate: true });
    setValue("endTime", calculateEndTime(watchStartTime, hours), { shouldValidate: true });
    if (watchBookingType === "HOURLY" && selectedStudio && selectedStudio.price > 0) {
      setValue("price", Math.round(selectedStudio.price * hours), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateAdminOfflineBookingInput) => {
    setServerError(null);

    startTransition(async () => {
      try {
        const res = await createAdminOfflineBookingAction(data);

        if (!res.success) {
          setServerError(res.error || "Failed to create offline booking");
          toast.error(res.error || "Failed to create booking");
          return;
        }

        const details = res.data;
        toast.success(
          `Offline booking ${details?.bookingId || ""} created successfully! Invoice generated.`,
          { duration: 5000 }
        );

        reset();
        setSelectedStudio(null);
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
      label: `${p.title} (${p.durationHours}h) - ${formatINR(p.offeredPrice)}`,
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

      {/* SECTION 1: STUDIO DETAILS */}
      <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiHome size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">1. Studio Details</h3>
            <p className="text-xs text-muted-foreground">Select an existing studio or enter custom studio info</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <Select
              id="studioSelect"
              label="Select Studio from Platform (Auto-fill)"
              placeholder={isLoadingStudios ? "Loading ContCave studios…" : "Search ContCave studio…"}
              options={studioOptions}
              value={selectedStudio ? studioOptions.find((o) => o.value === selectedStudio.id) || null : null}
              onChange={(opt) => {
                const selected = opt as SelectOption | null;
                if (selected?.value) handleStudioSelect(selected.value);
              }}
              isDisabled={isLoadingStudios || isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="studioName"
              label="Studio Name"
              required
              register={register("studioName")}
              error={errors.studioName?.message}
              disabled={isPending}
              placeholder="Studio title"
            />
            <Input
              id="studioEmail"
              label="Studio / Host Email"
              type="email"
              required
              register={register("studioEmail")}
              error={errors.studioEmail?.message}
              disabled={isPending}
              placeholder="host@example.com"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input
                id="studioAddress"
                label="Studio Address"
                required
                register={register("studioAddress")}
                error={errors.studioAddress?.message}
                disabled={isPending}
                placeholder="Full studio physical address"
              />
            </div>
            <Input
              id="studioGst"
              label="Studio GSTIN (Optional)"
              register={register("studioGst")}
              error={errors.studioGst?.message}
              disabled={isPending}
              placeholder="e.g. 07AAAAA0000A1Z5"
            />
          </div>
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
            <p className="text-xs text-muted-foreground">Specify the session duration and agreed offline price</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="bookingDate"
              label="Booking Date"
              type="date"
              required
              register={register("bookingDate")}
              error={errors.bookingDate?.message}
              disabled={isPending}
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
              label="Total Price (₹ INR)"
              type="number"
              required
              formatPrice
              register={register("price", { valueAsNumber: true })}
              error={errors.price?.message}
              disabled={isPending}
              description="Total agreed offline booking amount"
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
            placeholder="e.g. Booking taken directly via studio manager phone call on 19th Sep. Payment verified via bank statement."
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
      title="Create Offline Booking"
      customWidth="max-w-4xl"
      body={modalBody}
      selfActionButton
      actionLabel=""
    />
  );
}
