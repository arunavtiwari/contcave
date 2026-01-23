"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
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

import Container from "./Container";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import { categories } from "./navbar/Categories";

type Props = {
  reservations?: SafeReservation[];
  listing: FullListing;
  currentUser?: SafeUser | null;

};

interface GoogleCalendarEvent {
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
}

type AddonItem = { name?: string; price: number; qty: number };

const SLOT_LABELS: string[] = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM"
];

const EARLIEST_SLOT_HHMM: TimeHM = (toHHMM("6:00 AM") ?? "06:00") as TimeHM;
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

}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[TimeLabel | null, TimeLabel | null]>([null, null]);
  const [selectedAddons, setSelectedAddons] = useState<AddonItem[]>([]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const ownerHasGoogleCalendar = !!listing?.user?.googleCalendarConnected;
  const abortRef = useRef<AbortController | null>(null);
  const lastSigRef = useRef("");

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

  useEffect(() => {
    if (!ownerHasGoogleCalendar) {
      setGoogleCalendarEvents([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        const res = await axios.get("/api/calendar/events", {
          params: { listingId: listing.id },
          signal: controller.signal,
        });
        setGoogleCalendarEvents(Array.isArray(res.data) ? res.data : []);
      } catch {
        setGoogleCalendarEvents([]);
      }
    })();
    return () => controller.abort();
  }, [listing.id, ownerHasGoogleCalendar]);

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
      const startDate: string | undefined = ev?.start?.date;
      const startDateTime: string | undefined = ev?.start?.dateTime;
      const endDateTime: string | undefined = ev?.end?.dateTime;
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
        const [ch, cm] = String(dayTiming.close).split(":").map((n: string) => parseInt(n, 10));
        if (Number.isFinite(ch) && Number.isFinite(cm)) {
          const closeDate = new Date(todayKey.getFullYear(), todayKey.getMonth(), todayKey.getDate(), ch, cm || 0, 0, 0);
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

    // Helper to add intervals
    const addInterval = (s: TimeHM, e: TimeHM, setIds?: string[]) => {
      if (!s || !e || hhmmToMinutes(s) >= hhmmToMinutes(e)) return;
      if (!setIds || setIds.length === 0) {
        listingWideBusy.push({ s, e });
      } else {
        setIds.forEach((id) => {
          if (!setBusyIntervals[id]) setBusyIntervals[id] = [];
          setBusyIntervals[id].push({ s, e });
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
    const openHM = dayTiming?.open ? (String(dayTiming.open) as TimeHM) : null;
    const closeHM = dayTiming?.close ? (String(dayTiming.close) as TimeHM) : null;

    if (dayTiming?.enabled === false) {
      listingWideBusy.push({ s: EARLIEST_SLOT_HHMM, e: LATEST_FAKE_CUTOFF });
    } else if (openHM && closeHM && hhmmToMinutes(openHM) < hhmmToMinutes(closeHM)) {
      if (hhmmToMinutes(EARLIEST_SLOT_HHMM) < hhmmToMinutes(openHM)) {
        listingWideBusy.push({ s: EARLIEST_SLOT_HHMM, e: openHM });
      }
      if (hhmmToMinutes(closeHM) < hhmmToMinutes(LATEST_FAKE_CUTOFF)) {
        listingWideBusy.push({ s: closeHM, e: LATEST_FAKE_CUTOFF });
      }
    }

    // Now we need to determine which slots are "busy" based on set availability
    // This is tricky because we want to return a list of merged intervals.
    // We'll use a 15-minute resolution to find busy slots.
    const busyIntervals: Array<{ s: TimeHM; e: TimeHM }> = [...listingWideBusy];

    if (listing.hasSets && listing.sets && listing.sets.length > 0) {
      const allSetIds = listing.sets.map(s => s.id);
      const minSets = 1;
      const targetSets = currentSelectedSetIds.length > 0 ? currentSelectedSetIds : null;

      const isBusyAt = (min: number) => {
        // Check listing-wide
        if (listingWideBusy.some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))) return true;

        if (targetSets) {
          // If specific sets are selected, any of them being busy makes the slot busy
          return targetSets.some(id =>
            (setBusyIntervals[id] || []).some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))
          );
        } else {
          // If no sets selected, busy if available sets < minSets
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
    const opsEndMin = toMinFromOps(rawEnd) ?? labelMinutes[labelMinutes.length - 1];

    let startIdx = 0;
    while (startIdx < labelMinutes.length && labelMinutes[startIdx] < opsStartMin) startIdx++;
    let endIdx = labelMinutes.length - 1;
    while (endIdx >= 0 && labelMinutes[endIdx] > opsEndMin) endIdx--;

    if (endIdx < startIdx) { startIdx = 0; endIdx = labelMinutes.length - 1; }

    const step = labelMinutes.length >= 2 ? Math.max(1, labelMinutes[1] - labelMinutes[0]) : 30;
    const lastUsableStartIdx = Math.max(startIdx, endIdx - Math.ceil(required / step));
    if (lastUsableStartIdx < startIdx) return false;

    const dayStr = istToDateOnly(day).toDateString();

    // Build set-specific busy intervals
    const setBusyIntervals: Record<string, Array<{ s: number; e: number }>> = {};
    const listingWideBusy: Array<{ s: number; e: number }> = [];

    // Add reservations
    reservations.forEach((r) => {
      const rDay = istToDateOnly(new Date(r.startDate as unknown as Date)).toDateString();
      if (rDay !== dayStr) return;
      const s = labelToMinutes(r.startTime);
      const e = labelToMinutes(r.endTime);
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

    // Add blocks
    listing.blocks?.forEach((b) => {
      const bDay = istToDateOnly(new Date(b.date)).toDateString();
      if (bDay !== dayStr) return;
      const s = labelToMinutes(b.startTime);
      const e = labelToMinutes(b.endTime);
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

    // Add current time cutoff if today
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

      // If listing-wide busy, this slot is out
      if (overlaps(startMin, endMin, listingWideBusy)) continue;

      if (!listing.hasSets || allSetIds.length === 0) {
        // Single unit logic: if no listing-wide busy, it's valid
        return true;
      }

      // Multi-set logic: count available sets
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
    const end = dateFromLabel(selectedDate, endLabel);
    const diffHours = Math.max(0, (end.getTime() - start.getTime()) / 36e5);
    setTimeDifferenceInHours(diffHours);
  }, [selectedDate, selectedTimeSlot]);

  const category = useMemo(
    () => categories.find((c) => c.label === listing.category),
    [listing.category]
  );

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
        <div className="max-w-[1120px] mx-auto pb-24">
          <div className="flex flex-col gap-2">
            <ListingHead
              title={listing.title}
              imageSrc={listing.imageSrc}
              locationValue={listing.locationValue}
              id={listing.id}
              currentUser={null}
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
                onPackageSelect={(pkg) => {
                  setSelectedPackage(pkg);
                  setSelectedDate(null);
                  setSelectedTimeSlot([null, null]);
                }}
              />
              <div className="order-first mb-10 md:order-last md:col-span-3">
                <ListingReservation
                  user={listing.user}
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

                  onSetIdsChangeAction={setSelectedSetIds}
                  reservations={reservations}
                  blocks={listing.blocks}
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default ListingClient;
