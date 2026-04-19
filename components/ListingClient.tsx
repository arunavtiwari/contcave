"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Container from "@/components/Container";
import ListingHead from "@/components/listing/ListingHead";
import ListingInfo from "@/components/listing/ListingInfo";
import ListingReservation from "@/components/listing/ListingReservation";
import PackageSetModal from "@/components/modals/PackageSetModal";
import { categories } from "@/components/navbar/Categories";
import {
  calculateSetPricing,
} from "@/lib/pricing";
import {
  asEndOfDayMinutes,
  dateFromLabel,
  getRoundedNowIST_HHMM,
  hhmmToMinutes,
  istSameDay,
  istToDateOnly,
  labelToMinutes,
  toHHMM,
} from "@/lib/scheduling";
import { FullListing } from "@/types/listing";
import { Package } from "@/types/package";
import { SafeReservation } from "@/types/reservation";
import {
  buildOperationalTimings,
  ReservationOperationalTimings,
  TimeHM,
  TimeLabel,
} from "@/types/scheduling";
import { SafeUser } from "@/types/user";

type Props = {
  reservations?: SafeReservation[];
  listing: FullListing;
  currentUser?: SafeUser | null;
  googleCalendarEvents?: GoogleCalendarEvent[];
  processedDescription?: string | null;
  processedTerms?: string | null;
  descriptionShouldTruncate?: boolean;
};

interface GoogleCalendarEvent {
  start?: {
    date?: string | null;
    dateTime?: string | null;
  };
  end?: {
    date?: string | null;
    dateTime?: string | null;
  };
}

type AddonItem = { name?: string; price: number; qty: number };

import { TIME_SLOTS as SLOT_LABELS } from "@/constants/timeSlots";

const EARLIEST_SLOT_HHMM: TimeHM = (toHHMM(SLOT_LABELS[0]) ?? "06:00") as TimeHM;
const LATEST_FAKE_CUTOFF: TimeHM = "23:59" as TimeHM;

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
    .filter((a) => a.price > 0 && a.qty > 0);
};

const addonsSig = (arr: AddonItem[]) =>
  arr.map((a) => `${a.name ?? ""}|${a.price}|${a.qty}`).sort().join(",");

function ListingClient({
  reservations = [],
  listing,
  currentUser = null,
  googleCalendarEvents = [],
  processedDescription,
  processedTerms,
  descriptionShouldTruncate
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[TimeLabel | null, TimeLabel | null]>([null, null]);
  const [selectedAddons, setSelectedAddons] = useState<AddonItem[]>([]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [isEntireStudioBooked, setIsEntireStudioBooked] = useState(false);
  const [isPackageSetModalOpen, setIsPackageSetModalOpen] = useState(false);

  const lastSigRef = useRef("");


  useEffect(() => {
    if (listing.hasSets && listing.sets && listing.sets.length > 0 && selectedSetIds.length === 0 && !selectedPackage) {
      setSelectedSetIds([listing.sets[0].id]);
    }
  }, [listing.hasSets, listing.sets, selectedPackage, selectedSetIds.length]);

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

  const disabledDatesBase = useMemo(() => {
    const set = new Map<string, Date>();
    const addDate = (input: Date) => {
      const normalized = new Date(input.getFullYear(), input.getMonth(), input.getDate());
      set.set(normalized.toDateString(), normalized);
    };

    googleCalendarEvents.forEach((ev) => {
      const startDate = ev?.start?.date;
      const startDateTime = ev?.start?.dateTime;
      const endDateTime = ev?.end?.dateTime;
      if (startDate) {
        addDate(new Date(`${startDate}T00:00:00`));
        return;
      }
      if (startDateTime && endDateTime) {
        const s = new Date(startDateTime);
        const e = new Date(endDateTime);
        const sKey = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const eKey = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        if (sKey.getTime() !== eKey.getTime()) {
          let cursor = new Date(sKey);
          while (cursor <= eKey) {
            addDate(cursor);
            cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
          }
        }
      }
    });

    try {
      const now = new Date();
      const todayKey = istToDateOnly(now);
      const dow = todayKey.getDay();
      const dayTiming = operationalTimings?.byDay?.[dow];
      const isOpen = dayTiming?.open && dayTiming?.close && dayTiming?.enabled !== false;
      if (isOpen) {
        const closeMin = labelToMinutes(String(dayTiming.close));
        if (Number.isFinite(closeMin) && closeMin > 0) {
          const ch = Math.floor(closeMin / 60);
          const cm = closeMin % 60;
          const closeDate = new Date(todayKey.getFullYear(), todayKey.getMonth(), todayKey.getDate(), ch, cm, 0, 0);
          if (now >= closeDate) addDate(todayKey);
        }
      }
      if (dayTiming?.enabled === false) addDate(todayKey);
    } catch { }

    return Array.from(set.values());
  }, [googleCalendarEvents, operationalTimings]);

  const buildMergedIntervalsFor = useCallback((day: Date, currentSelectedSetIds: string[] = []) => {
    const dayStr = istToDateOnly(day).toDateString();
    const listingWideBusy: Array<{ s: TimeHM; e: TimeHM }> = [];
    const setBusyIntervals: Record<string, Array<{ s: TimeHM; e: TimeHM }>> = {};


    const addInterval = (s: TimeHM, e: TimeHM, setIds?: string[]) => {
      if (!s || !e) return;
      const effectiveE = (hhmmToMinutes(e) === 0 ? LATEST_FAKE_CUTOFF : e) as TimeHM;
      if (hhmmToMinutes(s) >= hhmmToMinutes(effectiveE)) return;
      if (!setIds || setIds.length === 0) {
        listingWideBusy.push({ s, e: effectiveE });
      } else {
        setIds.forEach((id) => {
          if (!setBusyIntervals[id]) setBusyIntervals[id] = [];
          setBusyIntervals[id].push({ s, e: effectiveE });
        });
      }
    };

    reservations.forEach((r) => {
      const rDay = istToDateOnly(new Date(r.startDate as unknown as Date)).toDateString();
      if (rDay !== dayStr) return;
      const s = toHHMM(r.startTime);
      const e = toHHMM(r.endTime);
      if (s && e) addInterval(s, e, r.setIds);
    });

    listing.blocks?.forEach((block) => {
      const bDay = istToDateOnly(new Date(block.date)).toDateString();
      if (bDay !== dayStr) return;
      const s = toHHMM(block.startTime);
      const e = toHHMM(block.endTime);
      if (s && e) addInterval(s, e, block.setIds);
    });

    googleCalendarEvents.forEach((ev) => {
      const sISO = ev?.start?.dateTime;
      const eISO = ev?.end?.dateTime;
      if (!sISO || !eISO) return;
      const sDate = new Date(sISO);
      const eDate = new Date(eISO);
      if (istToDateOnly(sDate).toDateString() !== dayStr) return;
      const s = toHHMM(sDate);
      const e = toHHMM(eDate);
      if (s && e) listingWideBusy.push({ s, e });
    });

    if (istSameDay(day, new Date())) {
      const cutoff = getRoundedNowIST_HHMM();
      if (hhmmToMinutes(EARLIEST_SLOT_HHMM) < hhmmToMinutes(cutoff)) {
        listingWideBusy.push({ s: EARLIEST_SLOT_HHMM, e: cutoff });
      }
    }

    const dow = istToDateOnly(day).getDay();
    const dayTiming = operationalTimings?.byDay?.[dow];
    const openHM = dayTiming?.open ? toHHMM(String(dayTiming.open)) : null;
    const closeHM = dayTiming?.close ? toHHMM(String(dayTiming.close)) : null;
    const effectiveCloseMin = closeHM ? asEndOfDayMinutes(hhmmToMinutes(closeHM)) : 0;

    if (dayTiming?.enabled === false) {
      listingWideBusy.push({ s: EARLIEST_SLOT_HHMM, e: LATEST_FAKE_CUTOFF });
    } else if (openHM && closeHM && hhmmToMinutes(openHM) < effectiveCloseMin) {
      if (hhmmToMinutes(EARLIEST_SLOT_HHMM) < hhmmToMinutes(openHM)) {
        listingWideBusy.push({ s: EARLIEST_SLOT_HHMM, e: openHM });
      }
      if (effectiveCloseMin < hhmmToMinutes(LATEST_FAKE_CUTOFF)) {
        listingWideBusy.push({ s: closeHM, e: LATEST_FAKE_CUTOFF });
      }
    }




    const busyIntervals: Array<{ s: TimeHM; e: TimeHM }> = [...listingWideBusy];

    if (listing.hasSets && listing.sets && listing.sets.length > 0) {
      const allSetIds = listing.sets.map(s => s.id);
      const minSets = 1;
      const targetSets = currentSelectedSetIds.length > 0 ? currentSelectedSetIds : null;

      const isBusyAt = (min: number) => {

        if (listingWideBusy.some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))) return true;

        if (targetSets) {

          return targetSets.some(id =>
            (setBusyIntervals[id] || []).some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))
          );
        } else {

          let available = 0;
          for (const id of allSetIds) {
            if (!(setBusyIntervals[id] || []).some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))) {
              available++;
            }
          }
          return available < minSets;
        }
      };

      let currentStart: number | null = null;
      for (let m = 0; m < 24 * 60; m += 15) {
        if (isBusyAt(m)) {
          if (currentStart === null) currentStart = m;
        } else {
          if (currentStart !== null) {
            const s = `${String(Math.floor(currentStart / 60)).padStart(2, "0")}:${String(currentStart % 60).padStart(2, "0")}` as TimeHM;
            const e = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` as TimeHM;
            busyIntervals.push({ s, e });
            currentStart = null;
          }
        }
      }
      if (currentStart !== null) {
        busyIntervals.push({
          s: `${String(Math.floor(currentStart / 60)).padStart(2, "0")}:${String(currentStart % 60).padStart(2, "0")}` as TimeHM,
          e: LATEST_FAKE_CUTOFF
        });
      }
    }

    busyIntervals.sort((a, b) => hhmmToMinutes(a.s) - hhmmToMinutes(b.s));
    const merged: Array<{ s: TimeHM; e: TimeHM }> = [];
    for (const cur of busyIntervals) {
      if (!merged.length) merged.push({ s: cur.s, e: cur.e });
      else {
        const last = merged[merged.length - 1];
        if (hhmmToMinutes(cur.s) <= hhmmToMinutes(last.e)) {
          if (hhmmToMinutes(cur.e) > hhmmToMinutes(last.e)) last.e = cur.e;
        } else {
          merged.push({ s: cur.s, e: cur.e });
        }
      }
    }
    return merged;
  }, [reservations, googleCalendarEvents, operationalTimings, listing]);

  const disabledPairsForPicker = useMemo(() => {
    if (!selectedDate) return { starts: [] as TimeHM[], ends: [] as TimeHM[] };
    const merged = buildMergedIntervalsFor(selectedDate, selectedSetIds);
    return { starts: merged.map(x => x.s), ends: merged.map(x => x.e) };
  }, [selectedDate, buildMergedIntervalsFor, selectedSetIds]);

  const getRequiredMinutes = useCallback((selPkg: Package | null, lst: FullListing) => {
    const pkgMin = Math.max(0, Number(selPkg?.durationHours ?? 0)) * 60;
    const listingMin = Math.max(0, Number(lst.minimumBookingHours ?? 0)) * 60;
    const mins = SLOT_LABELS.map(labelToMinutes).filter(n => Number.isFinite(n));
    const step = mins.length >= 2 ? Math.max(1, mins[1] - mins[0]) : 30;
    const twoSlots = 2 * step;
    return Math.max(twoSlots, listingMin, pkgMin);
  }, []);

  const hasValidStartForDay = useCallback((day: Date) => {
    const required = getRequiredMinutes(selectedPackage, listing);
    const labelMinutes = SLOT_LABELS.map(labelToMinutes);
    const rawStart = operationalTimings?.operationalHours?.start?.trim?.();
    const rawEnd = operationalTimings?.operationalHours?.end?.trim?.();

    const toMinFromOps = (s?: string | null): number | null => {
      if (!s) return null;
      const idx = s ? SLOT_LABELS.indexOf(s) : -1;
      if (idx >= 0) return labelMinutes[idx];
      const m = labelToMinutes(s);
      return Number.isNaN(m) ? null : m;
    };

    const opsStartMin = toMinFromOps(rawStart) ?? labelMinutes[0];
    const opsEndMin = asEndOfDayMinutes(toMinFromOps(rawEnd) ?? labelMinutes[labelMinutes.length - 1]);

    let startIdx = 0;
    while (startIdx < labelMinutes.length && labelMinutes[startIdx] < opsStartMin) startIdx++;
    let endIdx = labelMinutes.length - 1;
    while (endIdx >= 0 && labelMinutes[endIdx] > opsEndMin) endIdx--;

    if (endIdx < startIdx) { startIdx = 0; endIdx = labelMinutes.length - 1; }

    const step = labelMinutes.length >= 2 ? Math.max(1, labelMinutes[1] - labelMinutes[0]) : 30;
    const lastUsableStartIdx = Math.max(startIdx, endIdx - Math.ceil(required / step));
    if (lastUsableStartIdx < startIdx) return false;

    const dayStr = istToDateOnly(day).toDateString();


    const setBusyIntervals: Record<string, Array<{ s: number; e: number }>> = {};
    const listingWideBusy: Array<{ s: number; e: number }> = [];


    reservations.forEach((r) => {
      const rDay = istToDateOnly(new Date(r.startDate as unknown as Date)).toDateString();
      if (rDay !== dayStr) return;
      const s = labelToMinutes(r.startTime);
      const e = asEndOfDayMinutes(labelToMinutes(r.endTime));
      if (Number.isFinite(s) && Number.isFinite(e) && s < e) {
        if (!r.setIds || r.setIds.length === 0) {
          listingWideBusy.push({ s, e });
        } else {
          r.setIds.forEach((id) => {
            if (!setBusyIntervals[id]) setBusyIntervals[id] = [];
            setBusyIntervals[id].push({ s, e });
          });
        }
      }
    });


    listing.blocks?.forEach((b) => {
      const bDay = istToDateOnly(new Date(b.date)).toDateString();
      if (bDay !== dayStr) return;
      const s = labelToMinutes(b.startTime);
      const e = asEndOfDayMinutes(labelToMinutes(b.endTime));
      if (Number.isFinite(s) && Number.isFinite(e) && s < e) {
        if (!b.setIds || b.setIds.length === 0) {
          listingWideBusy.push({ s, e });
        } else {
          b.setIds.forEach((id) => {
            if (!setBusyIntervals[id]) setBusyIntervals[id] = [];
            setBusyIntervals[id].push({ s, e });
          });
        }
      }
    });


    if (istSameDay(day, new Date())) {
      const cutoff = labelToMinutes(getRoundedNowIST_HHMM());
      const start = labelToMinutes(EARLIEST_SLOT_HHMM);
      if (start < cutoff) listingWideBusy.push({ s: start, e: cutoff });
    }

    const overlaps = (a: number, b: number, intervals: Array<{ s: number; e: number }>) =>
      intervals.some(({ s, e }) => !(b <= s || a >= e));

    const minSets = 1;
    const allSetIds = listing.sets?.map((s) => s.id) || [];

    for (let i = startIdx; i <= lastUsableStartIdx; i++) {
      const startMin = labelMinutes[i];
      const endMin = startMin + required;
      if (endMin > opsEndMin + step) continue;


      if (overlaps(startMin, endMin, listingWideBusy)) continue;

      if (!listing.hasSets || allSetIds.length === 0) {

        return true;
      }


      let availableCount = 0;
      for (const setId of allSetIds) {
        if (!overlaps(startMin, endMin, setBusyIntervals[setId] || [])) {
          availableCount++;
        }
      }

      if (availableCount >= minSets) return true;
    }
    return false;
  }, [operationalTimings, reservations, listing, getRequiredMinutes, selectedPackage]);

  const disabledDates = useMemo(() => {
    const set = new Map<string, Date>();
    const add = (d: Date) => {
      const k = istToDateOnly(d);
      set.set(k.toDateString(), k);
    };
    disabledDatesBase.forEach(add);
    const horizonDays = 90;
    const start = istToDateOnly(new Date());
    for (let i = 0; i <= horizonDays; i++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (!hasValidStartForDay(day)) add(day);
    }
    if (selectedDate && !hasValidStartForDay(selectedDate)) add(selectedDate);
    return Array.from(set.values());
  }, [disabledDatesBase, selectedDate, hasValidStartForDay]);

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



  const availableSetIds = useMemo(() => {
    if (!listing.hasSets || !listing.sets || !selectedDate || !selectedTimeSlot[0] || !selectedTimeSlot[1]) {
      return listing.sets?.map(s => s.id) || [];
    }

    const startMin = labelToMinutes(selectedTimeSlot[0]);
    const endMin = asEndOfDayMinutes(labelToMinutes(selectedTimeSlot[1]));
    const dayStr = istToDateOnly(selectedDate).toDateString();

    return listing.sets.filter(set => {

      const hasResConflict = reservations.some(r => {
        const rDay = istToDateOnly(new Date(r.startDate as unknown as Date)).toDateString();
        if (rDay !== dayStr) return false;
        const rs = labelToMinutes(r.startTime);
        const re = asEndOfDayMinutes(labelToMinutes(r.endTime));
        const isSetBooked = !r.setIds || r.setIds.length === 0 || r.setIds.includes(set.id);
        return isSetBooked && (startMin < re && rs < endMin);
      });

      if (hasResConflict) return false;


      const hasBlockConflict = listing.blocks?.some(b => {
        const bDay = istToDateOnly(new Date(b.date)).toDateString();
        if (bDay !== dayStr) return false;
        const bs = labelToMinutes(b.startTime);
        const be = asEndOfDayMinutes(labelToMinutes(b.endTime));

        const isSetBlocked = !b.setIds || b.setIds.length === 0 || b.setIds.includes(set.id);
        return isSetBlocked && (startMin < be && bs < endMin);
      });

      return !hasBlockConflict;
    }).map(s => s.id);
  }, [listing.hasSets, listing.sets, listing.blocks, selectedDate, selectedTimeSlot, reservations]);

  const pricingResult = useMemo(() => {
    if (!listing.hasSets || !listing.sets) return null;
    return calculateSetPricing({
      baseHourlyRate: listing.price,
      durationMinutes: timeDifferenceInHours * 60,
      selectedSetIds,
      sets: listing.sets,
      pricingType: listing.additionalSetPricingType,
      selectedPackage: selectedPackage,
    });
  }, [
    listing.hasSets,
    listing.price,
    timeDifferenceInHours,
    selectedSetIds,
    listing.sets,
    listing.additionalSetPricingType,
    selectedPackage,
  ]);

  const handleSetToggle = useCallback((setId: string) => {
    if (isEntireStudioBooked) return;

    setSelectedSetIds((prev) => {
      if (prev.includes(setId)) {
        return prev.filter((id) => id !== setId);
      }
      return [...prev, setId];
    });
  }, [isEntireStudioBooked]);

  const handleSelectAllSets = useCallback(() => {
    if (!listing.sets) return;

    if (isEntireStudioBooked) {
      setIsEntireStudioBooked(false);
      setSelectedSetIds([listing.sets[0].id]);
    } else {
      setIsEntireStudioBooked(true);
      setSelectedSetIds(listing.sets.map(s => s.id));
    }
  }, [listing.sets, isEntireStudioBooked]);

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
      setIsEntireStudioBooked(false);
      if (listing.sets && listing.sets.length > 0) {
        setSelectedSetIds([listing.sets[0].id]);
      } else {
        setSelectedSetIds([]);
      }
    }
  }, [listing.sets, listing.hasSets]);

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
          <div className="flex flex-col gap-2">
            <ListingHead
              title={listing.title}
              imageSrc={listing.imageSrc}
              locationValue={listing.locationValue}
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
                onAddonChange={handleAddonChange}
                services={[]}
                onPackageSelect={handlePackageSelect}


                selectedSetIds={selectedSetIds}
                onSetToggle={handleSetToggle}
                onSelectAllSets={handleSelectAllSets}
                availableSetIds={availableSetIds}
                isEntireStudioBooked={isEntireStudioBooked}
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
                <ListingReservation
                  listingId={listing.id}
                  price={listing.price}
                  platformFee={0}
                  time={timeDifferenceInHours}
                  setSelectDateAction={setSelectedDate}
                  selectedDate={selectedDate}
                  setSelectTimeSlotsAction={setSelectedTimeSlot}
                  selectedTime={selectedTimeSlot}
                  instantBooking={!!listing.instantBooking}
                  disabledDates={disabledDates}
                  disabledStartTimes={disabledPairsForPicker.starts}
                  disabledEndTimes={disabledPairsForPicker.ends}
                  operationalTimings={operationalTimings}
                  selectedAddons={selectedAddons}
                  currentUserPhone={currentUser?.phone ?? null}
                  isAuthenticated={!!currentUser}
                  minBookingHours={Number(listing.minimumBookingHours)}

                  selectedPackage={selectedPackage}
                  hasSets={listing.hasSets && (listing.sets?.length ?? 0) >= 2}
                  sets={listing.sets}
                  additionalSetPricingType={listing.additionalSetPricingType}


                  selectedSetIds={selectedSetIds}
                  pricingResult={pricingResult}

                  selectedPackageId={selectedPackage?.id || null}
                  setSelectionError={null}

                  reservations={reservations}
                />
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
