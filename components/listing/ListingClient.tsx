"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEye } from "react-icons/fi";

import Container from "@/components/layout/Container";
import CuratedReservation from "@/components/listing/CuratedReservation";
import ListingHead from "@/components/listing/ListingHead";
import ListingInfo from "@/components/listing/ListingInfo";
import ListingReservation from "@/components/listing/ListingReservation";
import PackageSetModal from "@/components/modals/PackageSetModal";
import { categories } from "@/components/navbar/categoriesData";
import Callout from "@/components/ui/Callout";
import {
  addDaysToDateKey,
  BOOKING_HORIZON_DAYS,
  busyRanges,
  checkWindow,
  dayAvailabilityFromRecords,
  freeSetIds,
  isBookable,
  istDateKey,
  minutesToClock,
  minutesToLabel,
} from "@/lib/booking/dayAvailability";
import {
  calculateSetPricing,
  suggestWholeStudioPackage,
  validateSetSelection,
} from "@/lib/pricing";
import {
  asEndOfDayMinutes,
  dateFromLabel,
  labelToMinutes,
} from "@/lib/scheduling";
import { SafeAmenity } from "@/types/amenity";
import { FullListing } from "@/types/listing";
import { Package } from "@/types/package";
import {
  CalendarBusyEvent,
  ListingAvailability,
  PublicDayStatus,
  PublicReservationSlot,
} from "@/types/reservation";
import { PublicReview } from "@/types/review";
import {
  buildOperationalTimings,
  ReservationOperationalTimings,
  TimeHM,
  TimeLabel,
} from "@/types/scheduling";
import { SafeUser } from "@/types/user";

type Props = {
  listing: FullListing;
  isPreview?: boolean;
  currentUser?: SafeUser | null;
  availability: Promise<ListingAvailability>;
  reviews?: PublicReview[];
  amenities?: SafeAmenity[];
  processedDescription?: string | null;
  processedTerms?: string | null;
  descriptionShouldTruncate?: boolean;
  initialSelectedSetIds?: string[];
  initialDate?: string | null;
  initialTimeSlot?: [TimeLabel, TimeLabel] | null;
};

type AddonItem = { name?: string; price: number; qty: number };

const toCalendarYmd = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const dateFromYmd = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toNum = (v: unknown, def = 0) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.+-]/g, ""));
    return Number.isFinite(n) ? n : def;
  }
  return def;
};

const normalizeAddons = (input: unknown): AddonItem[] => {
  const base = Array.isArray(input) ? input : input && typeof input === "object" ? (Object.values(input as Record<string, unknown>) as unknown[]) : [];
  return base
    .map((a: unknown) => {
      const item = a as Record<string, unknown>;
      return {
        name: typeof item?.name === 'string' ? item.name : undefined,
        price: Math.max(0, toNum(item?.price, 0)),
        qty: Math.max(0, toNum(item?.qty, 0))
      };
    })
    .filter((a) => a.price >= 0 && a.qty > 0);
};

const addonsSig = (arr: AddonItem[]) =>
  arr.map((a) => `${a.name ?? ""}|${a.price}|${a.qty}`).sort().join(",");

const NO_RESERVATIONS: PublicReservationSlot[] = [];
const NO_DAY_STATUSES: PublicDayStatus[] = [];
const NO_CALENDAR_EVENTS: CalendarBusyEvent[] = [];
const NO_AVAILABILITY: ListingAvailability = {
  reservations: NO_RESERVATIONS,
  dayStatuses: NO_DAY_STATUSES,
  googleCalendarEvents: NO_CALENDAR_EVENTS,
};

function useAvailability(promise: Promise<ListingAvailability>) {
  const [availability, setAvailability] = useState<ListingAvailability | null>(null);

  useEffect(() => {
    let current = true;
    promise.then(
      (value) => {
        if (current) setAvailability(value);
      },
      () => {
        if (current) setAvailability(NO_AVAILABILITY);
      }
    );
    return () => {
      current = false;
    };
  }, [promise]);

  return availability;
}

function ListingClient({
  listing,
  isPreview = false,
  currentUser = null,
  availability: availabilityPromise,
  reviews,
  amenities,
  processedDescription,
  processedTerms,
  descriptionShouldTruncate,
  initialSelectedSetIds = [],
  initialDate = null,
  initialTimeSlot = null,
}: Props) {
  const availability = useAvailability(availabilityPromise);
  const reservations = availability?.reservations ?? NO_RESERVATIONS;
  const dayStatuses = availability?.dayStatuses ?? NO_DAY_STATUSES;
  const googleCalendarEvents = availability?.googleCalendarEvents ?? NO_CALENDAR_EVENTS;

  const isOwnListing = Boolean(currentUser?.id && currentUser.id === listing.userId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => (initialDate ? dateFromYmd(initialDate) : null));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[TimeLabel | null, TimeLabel | null]>(() => initialTimeSlot ?? [null, null]);
  const [selectedAddons, setSelectedAddons] = useState<AddonItem[]>([]);

  const selectDate = useCallback((value: Date | null) => {
    setSelectedDate(value);
    setSelectedTimeSlot([null, null]);
  }, []);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(initialSelectedSetIds);
  const [isPackageSetModalOpen, setIsPackageSetModalOpen] = useState(false);

  const lastSigRef = useRef("");


  const defaultSetId = useMemo(() => {
    return listing.sets?.[0]?.id || null;
  }, [listing.sets]);

  useEffect(() => {
    if (listing.hasSets && defaultSetId && selectedSetIds.length === 0 && !selectedPackage && initialSelectedSetIds.length === 0) {
      setSelectedSetIds([defaultSetId]);
    }
  }, [listing.hasSets, defaultSetId, selectedPackage, selectedSetIds.length, initialSelectedSetIds.length]);

  useEffect(() => {
    if (!selectedDate || !selectedPackage || !selectedTimeSlot[0]) return;
    const startLabel = selectedTimeSlot[0];
    const startDate = dateFromLabel(selectedDate, startLabel);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + selectedPackage.durationHours);
    const hh = endDate.getHours() % 12 || 12;
    const mm = endDate.getMinutes().toString().padStart(2, "0");
    const ampm = endDate.getHours() >= 12 ? "PM" : "AM";
    const endLabel = `${hh}:${mm} ${ampm}` as TimeLabel;
    if (selectedTimeSlot[1] !== endLabel) setSelectedTimeSlot([startLabel, endLabel]);
  }, [selectedDate, selectedPackage, selectedTimeSlot]);



  const operationalTimings: ReservationOperationalTimings = useMemo(
    () => buildOperationalTimings(listing),
    [listing]
  );

  const scheduleInput = useMemo(() => ({
    operationalDays: listing.operationalDays,
    operationalHours: listing.operationalHours,
    minimumBookingHours: listing.minimumBookingHours,
    hasSets: listing.hasSets,
    setIds: listing.sets?.map((set) => set.id) ?? [],
  }), [listing]);

  const datedReservations = useMemo(
    () => reservations.map((reservation) => ({ ...reservation, date: reservation.startDate })),
    [reservations]
  );

  const dayAvailabilityFor = useCallback((dateKey: string) => dayAvailabilityFromRecords({
    date: dateKey,
    listing: scheduleInput,
    dayStatuses,
    reservations: datedReservations,
    blocks: listing.blocks ?? [],
    calendarEvents: googleCalendarEvents,
    now: new Date(),
  }), [scheduleInput, dayStatuses, datedReservations, listing.blocks, googleCalendarEvents]);

  const setRequirement = useMemo(() => ({
    eligibleSetIds: selectedPackage?.eligibleSetIds ?? [],
    minSets: selectedPackage?.requiredSetCount ?? 1,
  }), [selectedPackage]);

  const selectedDay = useMemo(
    () => (selectedDate ? dayAvailabilityFor(toCalendarYmd(selectedDate)) : null),
    [selectedDate, dayAvailabilityFor]
  );

  const disabledPairsForPicker = useMemo(() => {
    if (!selectedDay) return { starts: [] as TimeHM[], ends: [] as TimeHM[] };
    const ranges = busyRanges(selectedDay, { ...setRequirement, setIds: selectedSetIds });
    return { starts: ranges.map((range) => minutesToClock(range.start) as TimeHM), ends: ranges.map((range) => minutesToClock(range.end) as TimeHM) };
  }, [selectedDay, setRequirement, selectedSetIds]);

  const isCurated = listing.listingType === "CURATED";

  const selectedOperationalTimings = useMemo<ReservationOperationalTimings>(() => {
    if (!selectedDay?.hours) return operationalTimings;
    return {
      ...operationalTimings,
      operationalHours: { start: minutesToLabel(selectedDay.hours.start), end: minutesToLabel(selectedDay.hours.end) },
    };
  }, [selectedDay, operationalTimings]);

  const disabledDates = useMemo(() => {
    const today = istDateKey(new Date());
    return Array.from({ length: BOOKING_HORIZON_DAYS + 1 }, (_, offset) => addDaysToDateKey(today, offset))
      .filter((dateKey) => !isBookable(dayAvailabilityFor(dateKey), selectedPackage?.durationHours, setRequirement))
      .map(dateFromYmd);
  }, [dayAvailabilityFor, selectedPackage, setRequirement]);

  useEffect(() => {
    const [startLabel, endLabel] = selectedTimeSlot;
    if (!selectedDate || !startLabel || !endLabel) {
      setTimeDifferenceInHours(0);
      return;
    }
    const start = dateFromLabel(selectedDate, startLabel);
    let end = dateFromLabel(selectedDate, endLabel);
    // "12:00 AM" as end time means next midnight, not start-of-day
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, end.getHours(), end.getMinutes());
    }
    const diffHours = (end.getTime() - start.getTime()) / 36e5;
    setTimeDifferenceInHours(diffHours);
  }, [selectedDate, selectedTimeSlot]);

  const category = useMemo(
    () => categories.find((c) => c.label === listing.category),
    [listing.category]
  );
  const kindLabel = listing.venueTypes?.[0] || listing.category || "Studio";



  const availableSetIds = useMemo(() => {
    const allSetIds = listing.sets?.map((set) => set.id) ?? [];
    if (!listing.hasSets || !selectedDay || !selectedTimeSlot[0] || !selectedTimeSlot[1]) return allSetIds;
    return freeSetIds(
      selectedDay,
      labelToMinutes(selectedTimeSlot[0]),
      asEndOfDayMinutes(labelToMinutes(selectedTimeSlot[1]))
    );
  }, [listing.hasSets, listing.sets, selectedDay, selectedTimeSlot]);

  const pricingInput = useMemo(() => (listing.hasSets && listing.sets ? {
    baseHourlyRate: listing.price ?? 0,
    durationMinutes: timeDifferenceInHours * 60,
    selectedSetIds,
    sets: listing.sets,
    pricingType: listing.additionalSetPricingType,
  } : null), [
    listing.hasSets,
    listing.price,
    timeDifferenceInHours,
    selectedSetIds,
    listing.sets,
    listing.additionalSetPricingType,
  ]);

  const pricingResult = useMemo(
    () => (pricingInput ? calculateSetPricing({ ...pricingInput, selectedPackage }) : null),
    [pricingInput, selectedPackage]
  );

  const wholeStudioSuggestion = useMemo(
    () => (pricingInput && !selectedPackage ? suggestWholeStudioPackage({ ...pricingInput, packages: listing.packages ?? [] }) : null),
    [pricingInput, selectedPackage, listing.packages]
  );

  const setSelectionError = useMemo(() => {
    if (!listing.hasSets) return null;
    const validation = validateSetSelection(selectedSetIds, selectedPackage);
    return validation.valid ? null : validation.error || "Select a valid set configuration.";
  }, [listing.hasSets, selectedSetIds, selectedPackage]);

  const slotError = useMemo(() => {
    const [startLabel, endLabel] = selectedTimeSlot;
    if (!selectedDay || !startLabel || !endLabel) return null;
    return checkWindow(selectedDay, {
      start: labelToMinutes(startLabel),
      end: asEndOfDayMinutes(labelToMinutes(endLabel)),
      setIds: listing.hasSets ? selectedSetIds : [],
      packageMinutes: (selectedPackage?.durationHours ?? 0) * 60,
    });
  }, [selectedDay, selectedTimeSlot, listing.hasSets, selectedSetIds, selectedPackage]);

  const handleSetToggle = useCallback((setId: string) => {
    setSelectedSetIds((prev) => {
      if (prev.includes(setId)) {
        return prev.filter((id) => id !== setId);
      }
      return [...prev, setId];
    });
  }, []);

  const handlePackageSelect = useCallback((pkg: Package | null) => {
    setSelectedPackage(pkg);

    if (pkg) {
      if (listing.hasSets && pkg.requiredSetCount && pkg.requiredSetCount > 0) {
        setIsPackageSetModalOpen(true);
      } else {
        setIsPackageSetModalOpen(false);
      }
    } else {
      setIsPackageSetModalOpen(false);
      if (defaultSetId) {
        setSelectedSetIds([defaultSetId]);
      } else {
        setSelectedSetIds([]);
      }
    }
  }, [listing.hasSets, defaultSetId]);

  const handlePackageSetConfirm = useCallback((setIds: string[]) => {
    setSelectedSetIds(setIds);
    setIsPackageSetModalOpen(false);
  }, []);



  const handleAddonChange = useCallback((payload: unknown) => {
    const next = normalizeAddons(payload);
    const sig = addonsSig(next);
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setSelectedAddons(next);
    }
  }, []);
  useEffect(() => {
    const sig = addonsSig(selectedAddons);
    if (sig !== lastSigRef.current) lastSigRef.current = sig;
  }, [selectedAddons]);

  return (
    <div className="pt-10">
      <Container>
        <div className="max-w-280 mx-auto pb-24">
          {isPreview && (
            <Callout role="status" icon={FiEye} title="Preview: this studio isn't live yet" className="mb-6">
              This is how guests will see it once it&apos;s approved. It&apos;s hidden from search, and bookings and enquiries are turned off until then.
            </Callout>
          )}
          <div className="flex flex-col gap-2">
            <ListingHead
              title={listing.title}
              imageSrc={listing.imageSrc}
              videoSrc={listing.videoSrc}
              locationValue={listing.locationValue}
              kind={kindLabel}
              id={listing.id}
              currentUser={currentUser}
            />
            <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
              <ListingInfo
                user={listing.user}
                category={category}
                description={listing.description}
                locationValue={listing.locationValue}
                fullListing={listing as unknown as FullListing}
                definedAmenities={amenities}
                initialReviews={reviews}
                onAddonChange={handleAddonChange}
                services={[]}
                onPackageSelect={handlePackageSelect}


                selectedSetIds={selectedSetIds}
                onSetToggle={handleSetToggle}
                wholeStudioSuggestion={wholeStudioSuggestion}
                onUsePackage={setSelectedPackage}
                availableSetIds={availableSetIds}
                setPricingType={listing.additionalSetPricingType}
                setHours={timeDifferenceInHours || 1}
                includedSetId={pricingResult?.includedSetId || null}
                selectedPackage={selectedPackage}
                isSetSelectionDisabled={!!selectedPackage}
                processedDescription={processedDescription}
                processedTerms={processedTerms}
                descriptionShouldTruncate={descriptionShouldTruncate}
              />
              <div className="order-first mb-10 md:order-last md:col-span-3">
                {isOwnListing ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                    This is your listing. Owners cannot book or enquire on their own studio.
                  </div>
                ) : isCurated ? (
                  <CuratedReservation
                    listingId={listing.id}
                    studioName={listing.title}
                    area={listing.locationValue}
                    priceRangeMin={listing.priceRangeMin}
                    priceRangeMax={listing.priceRangeMax}
                    mapsUrl={listing.mapsUrl}
                    websiteUrl={listing.websiteUrl}
                    instagramHandle={listing.instagramHandle}
                    disabled={isPreview}
                  />
                ) : (
                  <ListingReservation
                    listingId={listing.id}
                    price={listing.price ?? 0}
                    platformFee={0}
                    time={timeDifferenceInHours}
                    setSelectDateAction={selectDate}
                    selectedDate={selectedDate}
                    setSelectTimeSlotsAction={setSelectedTimeSlot}
                    selectedTime={selectedTimeSlot}
                    instantBooking={!!listing.instantBooking}
                    availabilityLoading={!availability}
                    disabledDates={disabledDates}
                    disabledStartTimes={disabledPairsForPicker.starts}
                    disabledEndTimes={disabledPairsForPicker.ends}
                    operationalTimings={selectedOperationalTimings}
                    selectedAddons={selectedAddons}
                    currentUserPhone={currentUser?.phone ?? null}
                    isAuthenticated={!!currentUser}
                    minBookingHours={Number(listing.minimumBookingHours ?? 0)}
                    selectedPackage={selectedPackage}
                    hasSets={listing.hasSets && (listing.sets?.length ?? 0) >= 1}
                    sets={listing.sets}
                    additionalSetPricingType={listing.additionalSetPricingType}
                    selectedSetIds={selectedSetIds}
                    pricingResult={pricingResult}
                    selectedPackageId={selectedPackage?.id || null}
                    setSelectionError={setSelectionError}
                    slotError={slotError}
                    reservations={reservations}
                    disabled={isPreview}
                    contcaveNote={listing.contcaveNote}
                  />
                )}
              </div>
            </div>
          </div>
        </div>


        {selectedPackage && (
          <PackageSetModal
            isOpen={isPackageSetModalOpen}
            onClose={() => {
              handlePackageSelect(null);
            }}
            onConfirm={handlePackageSetConfirm}
            sets={listing.sets || []}
            packageItem={selectedPackage}
            availableSetIds={availableSetIds}
          />
        )}
      </Container>
    </div>
  );
}

export default ListingClient;
