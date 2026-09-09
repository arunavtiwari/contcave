"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Container from "@/components/layout/Container";
import CuratedReservation from "@/components/listing/CuratedReservation";
import ListingHead from "@/components/listing/ListingHead";
import ListingInfo from "@/components/listing/ListingInfo";
import ListingReservation from "@/components/listing/ListingReservation";
import PackageSetModal from "@/components/modals/PackageSetModal";
import { categories } from "@/components/navbar/categoriesData";
import {
  calculateSetPricing,
  validateSetSelection,
} from "@/lib/pricing";
import {
  asEndOfDayMinutes,
  dateFromLabel,
  getRoundedNowIST_HHMM,
  getRoundedNowISTMinutes,
  hhmmToMinutes,
  istToDateOnly,
  labelToMinutes,
  toHHMM,
  toISTDateParts,
} from "@/lib/scheduling";
import { FullListing } from "@/types/listing";
import { Package } from "@/types/package";
import { PublicDayStatus, PublicReservationSlot } from "@/types/reservation";
import {
  buildOperationalTimings,
  ReservationOperationalTimings,
  TimeHM,
  TimeLabel,
} from "@/types/scheduling";
import { SafeUser } from "@/types/user";

type Props = {
  reservations?: PublicReservationSlot[];
  dayStatuses?: PublicDayStatus[];
  listing: FullListing;
  currentUser?: SafeUser | null;
  googleCalendarEvents?: GoogleCalendarEvent[];
  processedDescription?: string | null;
  processedTerms?: string | null;
  descriptionShouldTruncate?: boolean;
  initialSelectedSetIds?: string[];
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

const toCalendarYmd = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toInstantISTYmd = (date: Date) => {
  const { y, m, d } = toISTDateParts(date);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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

function ListingClient({
  reservations = [],
  dayStatuses = [],
  listing,
  currentUser = null,
  googleCalendarEvents = [],
  processedDescription,
  processedTerms,
  descriptionShouldTruncate,
  initialSelectedSetIds = []
}: Props) {
  const isOwnListing = Boolean(currentUser?.id && currentUser.id === listing.userId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[TimeLabel | null, TimeLabel | null]>([null, null]);
  const [selectedAddons, setSelectedAddons] = useState<AddonItem[]>([]);

  useEffect(() => {
    setSelectedTimeSlot([null, null]);
  }, [selectedDate]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(initialSelectedSetIds);
  const [isEntireStudioBooked, setIsEntireStudioBooked] = useState(false);
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

  const dayStatusByDate = useMemo(
    () => new Map(dayStatuses.map((status) => [status.date, status])),
    [dayStatuses]
  );

  const disabledDatesBase = useMemo(() => {
    const set = new Map<string, Date>();
    const addDate = (input: Date) => {
      const normalized = new Date(input.getFullYear(), input.getMonth(), input.getDate());
      set.set(normalized.toDateString(), normalized);
    };

    googleCalendarEvents.forEach((ev) => {
      const startDate = ev?.start?.date;
      const endDate = ev?.end?.date;
      const startDateTime = ev?.start?.dateTime;
      const endDateTime = ev?.end?.dateTime;
      if (startDate) {
        const start = dateFromYmd(startDate);
        const exclusiveEnd = endDate ? dateFromYmd(endDate) : null;
        if (Number.isNaN(start.getTime())) return;
        if (!exclusiveEnd || Number.isNaN(exclusiveEnd.getTime()) || exclusiveEnd <= start) {
          addDate(start);
          return;
        }
        for (let cursor = start; cursor < exclusiveEnd; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
          addDate(cursor);
        }
        return;
      }
      if (startDateTime && endDateTime) {
        const s = new Date(startDateTime);
        const e = new Date(endDateTime);
        const sKey = istToDateOnly(s);
        let eKey = istToDateOnly(e);
        if (toHHMM(e) === "00:00") {
          eKey = new Date(eKey.getFullYear(), eKey.getMonth(), eKey.getDate() - 1);
        }
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
      const override = dayStatusByDate.get(toCalendarYmd(todayKey));
      const open = override ? override.startTime : dayTiming?.open;
      const close = override ? override.endTime : dayTiming?.close;
      const enabled = override ? override.listingActive : dayTiming?.enabled !== false;
      const isOpen = open && close && enabled;
      if (isOpen) {
        const closeMin = asEndOfDayMinutes(labelToMinutes(String(close)));
        if (Number.isFinite(closeMin) && closeMin > 0) {
          const nowMin = getRoundedNowISTMinutes();
          if (nowMin >= closeMin) addDate(todayKey);
        }
      }
      if (!enabled) addDate(todayKey);
    } catch { }

    dayStatuses.forEach((status) => {
      if (!status.listingActive) addDate(dateFromYmd(status.date));
    });

    return Array.from(set.values());
  }, [googleCalendarEvents, operationalTimings, dayStatusByDate, dayStatuses]);

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

      const dayStart = new Date(`${toCalendarYmd(day)}T00:00:00+05:30`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      if (sDate >= dayEnd || eDate <= dayStart) return;

      let sHM: TimeHM = "00:00" as TimeHM;
      if (toInstantISTYmd(sDate) === toCalendarYmd(day)) {
        sHM = toHHMM(sDate) ?? ("00:00" as TimeHM);
      }

      let eHM: TimeHM = "23:59" as TimeHM;
      if (toInstantISTYmd(eDate) === toCalendarYmd(day)) {
        const hhmm = toHHMM(eDate);
        if (hhmm === "00:00") return;
        eHM = hhmm ?? ("23:59" as TimeHM);
      }

      if (sHM && eHM) listingWideBusy.push({ s: sHM, e: eHM });
    });

    if (toCalendarYmd(day) === toCalendarYmd(istToDateOnly(new Date()))) {
      const roundedNow = getRoundedNowISTMinutes();
      const cutoff = roundedNow >= 1440 ? LATEST_FAKE_CUTOFF : getRoundedNowIST_HHMM();
      if (hhmmToMinutes(EARLIEST_SLOT_HHMM) < hhmmToMinutes(cutoff)) {
        listingWideBusy.push({ s: EARLIEST_SLOT_HHMM, e: cutoff });
      }
    }

    const dow = istToDateOnly(day).getDay();
    const dayTiming = operationalTimings?.byDay?.[dow];
    const override = dayStatusByDate.get(toCalendarYmd(day));
    const enabled = override ? override.listingActive : dayTiming?.enabled !== false;
    const openValue = override ? override.startTime : dayTiming?.open;
    const closeValue = override ? override.endTime : dayTiming?.close;
    const openHM = openValue ? toHHMM(String(openValue)) : null;
    const closeHM = closeValue ? toHHMM(String(closeValue)) : null;
    const effectiveCloseMin = closeHM ? asEndOfDayMinutes(hhmmToMinutes(closeHM)) : 0;

    if (!enabled) {
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
      const packageEligibleSetIds = selectedPackage?.eligibleSetIds ?? [];
      const eligibleSetIds = packageEligibleSetIds.length
        ? allSetIds.filter((id) => packageEligibleSetIds.includes(id))
        : allSetIds;
      const minSets = Math.max(1, Number(selectedPackage?.requiredSetCount || 1));
      const targetSets = currentSelectedSetIds.length > 0 ? currentSelectedSetIds : null;

      const isBusyAt = (min: number) => {

        if (listingWideBusy.some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))) return true;

        if (targetSets) {

          return targetSets.some(id =>
            (setBusyIntervals[id] || []).some(b => min >= hhmmToMinutes(b.s) && min < hhmmToMinutes(b.e))
          );
        } else {

          let available = 0;
          for (const id of eligibleSetIds) {
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
  }, [reservations, googleCalendarEvents, operationalTimings, listing, dayStatusByDate, selectedPackage]);

  const disabledPairsForPicker = useMemo(() => {
    if (!selectedDate) return { starts: [] as TimeHM[], ends: [] as TimeHM[] };
    const merged = buildMergedIntervalsFor(selectedDate, selectedSetIds);
    return { starts: merged.map(x => x.s), ends: merged.map(x => x.e) };
  }, [selectedDate, buildMergedIntervalsFor, selectedSetIds]);

  const isCurated = listing.listingType === "CURATED";

  const getRequiredMinutes = useCallback((selPkg: Package | null, lst: FullListing) => {
    const pkgMin = Math.max(0, Number(selPkg?.durationHours ?? 0)) * 60;
    const configuredListingMin = Math.max(0, Number(lst.minimumBookingHours ?? 0)) * 60;
    const listingMin = configuredListingMin > 0 ? configuredListingMin : 90;
    return Math.max(listingMin, pkgMin);
  }, []);

  const hasValidStartForDay = useCallback((day: Date) => {
    const required = getRequiredMinutes(selectedPackage, listing);
    const labelMinutes = SLOT_LABELS.map(labelToMinutes);
    const dayTiming = operationalTimings?.byDay?.[istToDateOnly(day).getDay()];
    const override = dayStatusByDate.get(toCalendarYmd(day));
    if (override ? !override.listingActive : dayTiming?.enabled === false) return false;
    const rawStart = (override ? override.startTime : dayTiming?.open)?.trim?.();
    const rawEnd = (override ? override.endTime : dayTiming?.close)?.trim?.();

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
    const lastUsableStartIdx = endIdx - Math.ceil(required / step);
    if (lastUsableStartIdx < startIdx) return false;

    const dayStr = istToDateOnly(day).toDateString();


    const setBusyIntervals: Record<string, Array<{ s: number; e: number }>> = {};
    const listingWideBusy: Array<{ s: number; e: number }> = [];

    const mergedAvailabilityBusy = buildMergedIntervalsFor(day).flatMap((interval) => {
      const s = hhmmToMinutes(interval.s);
      const e = asEndOfDayMinutes(hhmmToMinutes(interval.e));
      return Number.isFinite(s) && Number.isFinite(e) && s < e ? [{ s, e }] : [];
    });


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


    if (toCalendarYmd(day) === toCalendarYmd(istToDateOnly(new Date()))) {
      const cutoff = getRoundedNowISTMinutes();
      const start = labelToMinutes(EARLIEST_SLOT_HHMM);
      if (start < cutoff) listingWideBusy.push({ s: start, e: cutoff });
    }

    const overlaps = (a: number, b: number, intervals: Array<{ s: number; e: number }>) =>
      intervals.some(({ s, e }) => !(b <= s || a >= e));

    const allSetIds = listing.sets?.map((s) => s.id) || [];
    const packageEligibleSetIds = selectedPackage?.eligibleSetIds ?? [];
    const eligibleSetIds = packageEligibleSetIds.length
      ? allSetIds.filter((id) => packageEligibleSetIds.includes(id))
      : allSetIds;
    const minSets = Math.max(1, Number(selectedPackage?.requiredSetCount || 1));

    for (let i = startIdx; i <= lastUsableStartIdx; i++) {
      const startMin = labelMinutes[i];
      const endMin = startMin + required;
      if (endMin > opsEndMin) continue;


      if (overlaps(startMin, endMin, listingWideBusy)) continue;
      if (overlaps(startMin, endMin, mergedAvailabilityBusy)) continue;

      if (!listing.hasSets || allSetIds.length === 0) {

        return true;
      }


      let availableCount = 0;
      for (const setId of eligibleSetIds) {
        if (!overlaps(startMin, endMin, setBusyIntervals[setId] || [])) {
          availableCount++;
        }
      }

      if (availableCount >= minSets) return true;
    }
    return false;
  }, [operationalTimings, reservations, listing, getRequiredMinutes, selectedPackage, dayStatusByDate, buildMergedIntervalsFor]);

  const selectedOperationalTimings = useMemo<ReservationOperationalTimings>(() => {
    if (!selectedDate) return operationalTimings;
    const override = dayStatusByDate.get(toCalendarYmd(selectedDate));
    if (!override) return operationalTimings;
    const byDay = operationalTimings.byDay ? [...operationalTimings.byDay] : undefined;
    if (byDay) {
      byDay[istToDateOnly(selectedDate).getDay()] = {
        open: override.startTime,
        close: override.endTime,
        enabled: override.listingActive,
      };
    }
    return {
      ...operationalTimings,
      operationalHours: { start: override.startTime, end: override.endTime },
      byDay,
    };
  }, [selectedDate, operationalTimings, dayStatusByDate]);

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
      baseHourlyRate: listing.price ?? 0,
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

  const setSelectionError = useMemo(() => {
    if (!listing.hasSets) return null;
    const validation = validateSetSelection(selectedSetIds, selectedPackage);
    if (!validation.valid) return validation.error || "Select a valid set configuration.";
    if (selectedSetIds.some((setId) => !availableSetIds.includes(setId))) {
      return "One or more selected sets are unavailable for this time slot.";
    }
    return null;
  }, [listing.hasSets, selectedSetIds, selectedPackage, availableSetIds]);

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
      if (defaultSetId) setSelectedSetIds([defaultSetId]);
    } else {
      if (availableSetIds.length !== listing.sets.length) return;
      setIsEntireStudioBooked(true);
      setSelectedSetIds(listing.sets.map(s => s.id));
    }
  }, [listing.sets, isEntireStudioBooked, defaultSetId, availableSetIds]);

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
          <div className="flex flex-col gap-2">
            <ListingHead
              title={listing.title}
              imageSrc={listing.imageSrc}
              videoSrc={listing.videoSrc}
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
                  />
                ) : (
                  <ListingReservation
                    listingId={listing.id}
                    price={listing.price ?? 0}
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
                    reservations={reservations}
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
