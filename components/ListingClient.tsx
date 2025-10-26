"use client";

import { SafeReservation, SafeUser, safeListing } from "@/types";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Container from "./Container";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import { categories } from "./navbar/Categories";
import {
  ReservationOperationalTimings,
  TimeHM,
  TimeLabel,
  buildOperationalTimings,
} from "@/types/scheduling";
import { Package } from "./inputs/PackagesForm";

type Props = {
  reservations?: SafeReservation[];
  listing: safeListing & { user: SafeUser };
  currentUser?: SafeUser | null;
};

type AddonItem = { name?: string; price: number; qty: number };

const SLOT_LABELS: string[] = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM"
];

const IST_OFFSET_MIN = 5 * 60 + 30;
const toISTDateParts = (d: Date) => {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + IST_OFFSET_MIN * 60000);
  return { y: ist.getFullYear(), m: ist.getMonth(), d: ist.getDate(), hh: ist.getHours(), mm: ist.getMinutes() };
};
const istSameDay = (a: Date, b: Date) => {
  const A = toISTDateParts(a);
  const B = toISTDateParts(b);
  return A.y === B.y && A.m === B.m && A.d === B.d;
};
const istToDateOnly = (d: Date) => {
  const p = toISTDateParts(d);
  return new Date(p.y, p.m, p.d);
};

const getRoundedNowIST_HHMM = (): TimeHM => {
  const parts = toISTDateParts(new Date());
  const roundUp = (15 - (parts.mm % 15)) % 15;
  const hh = (parts.hh + Math.floor((parts.mm + roundUp) / 60)) % 24;
  const mm = (parts.mm + roundUp) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` as TimeHM;
};

const toHHMM = (input: unknown): TimeHM | null => {
  const fromDate = (d: Date): TimeHM | null => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}` as TimeHM;
  };
  if (input instanceof Date) return fromDate(input);
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;
    const twelve = s.match(/^(\d{1,2}):([0-5]\d)\s*([AP]M)$/i);
    if (twelve) {
      let h = parseInt(twelve[1], 10);
      const m = twelve[2];
      const ap = twelve[3].toUpperCase();
      if (ap === "PM" && h < 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}` as TimeHM;
    }
    const twentyFour = s.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::\d{2})?$/);
    if (twentyFour) {
      const h = parseInt(twentyFour[1], 10);
      const m = twentyFour[2];
      return `${String(h).padStart(2, "0")}:${m}` as TimeHM;
    }
    return fromDate(new Date(s));
  }
  return null;
};

const parseLabel = (label: string) => {
  const m = label.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (!m) return { hours: 0, minutes: 0 };
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { hours: h, minutes: min };
};
const dateFromLabel = (base: Date, label: string) => {
  const { hours, minutes } = parseLabel(label);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0);
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
  const base = Array.isArray(input) ? input : input && typeof input === "object" ? Object.values(input as any) : [];
  return base
    .map((a: any) => ({ name: a?.name, price: Math.max(0, toNum(a?.price, 0)), qty: Math.max(0, toNum(a?.qty, 0)) }))
    .filter((a) => a.price > 0 && a.qty > 0);
};
const addonsSig = (arr: AddonItem[]) =>
  arr.map((a) => `${a.name ?? ""}|${a.price}|${a.qty}`).sort().join(",");

const hhmmToMinutes = (hm: TimeHM) => {
  const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
};
const ampmToMinutes = (label: string): number => {
  const m = label.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
  if (!m) return NaN;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const period = m[3].toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
};
const labelToMinutes = (s?: string | null): number => {
  if (!s) return NaN;
  const m12 = ampmToMinutes(s);
  if (!Number.isNaN(m12)) return m12;
  const m24 = s.match(/^(\d{1,2}):([0-5]\d)$/);
  return m24 ? Number(m24[1]) * 60 + Number(m24[2]) : NaN;
};

const EARLIEST_SLOT_HHMM: TimeHM = (toHHMM(SLOT_LABELS[0]) ?? "06:00") as TimeHM;
const LATEST_FAKE_CUTOFF: TimeHM = "23:59" as TimeHM;

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
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
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
          signal: controller.signal as any,
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
      const dayTiming = (operationalTimings as any)?.byDay?.[dow];
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

  const buildMergedIntervalsFor = useCallback((day: Date) => {
    const dayStr = istToDateOnly(day).toDateString();
    const intervals: Array<{ s: TimeHM; e: TimeHM }> = [];

    reservations.forEach((r) => {
      const rDay = istToDateOnly(new Date(r.startDate as unknown as Date)).toDateString();
      if (rDay !== dayStr) return;
      const s = toHHMM(r.startTime);
      const e = toHHMM(r.endTime);
      if (s && e && hhmmToMinutes(s) < hhmmToMinutes(e)) intervals.push({ s, e });
    });

    googleCalendarEvents.forEach((ev: any) => {
      const sISO = ev?.start?.dateTime;
      const eISO = ev?.end?.dateTime;
      if (!sISO || !eISO) return;
      const sDate = new Date(sISO);
      const eDate = new Date(eISO);
      if (istToDateOnly(sDate).toDateString() !== dayStr) return;
      const s = toHHMM(sDate);
      const e = toHHMM(eDate);
      if (s && e && hhmmToMinutes(s) < hhmmToMinutes(e)) intervals.push({ s, e });
    });

    if (istSameDay(day, new Date())) {
      const cutoff = getRoundedNowIST_HHMM();
      if (hhmmToMinutes(EARLIEST_SLOT_HHMM) < hhmmToMinutes(cutoff)) {
        intervals.push({ s: EARLIEST_SLOT_HHMM, e: cutoff });
      }
    }

    const dow = istToDateOnly(day).getDay();
    const dayTiming = (operationalTimings as any)?.byDay?.[dow];
    const openHM = dayTiming?.open ? (String(dayTiming.open) as TimeHM) : null;
    const closeHM = dayTiming?.close ? (String(dayTiming.close) as TimeHM) : null;

    if (dayTiming?.enabled === false) {
      intervals.push({ s: EARLIEST_SLOT_HHMM, e: LATEST_FAKE_CUTOFF });
    } else if (openHM && closeHM && hhmmToMinutes(openHM) < hhmmToMinutes(closeHM)) {
      if (hhmmToMinutes(EARLIEST_SLOT_HHMM) < hhmmToMinutes(openHM)) {
        intervals.push({ s: EARLIEST_SLOT_HHMM, e: openHM });
      }
      if (hhmmToMinutes(closeHM) < hhmmToMinutes(LATEST_FAKE_CUTOFF)) {
        intervals.push({ s: closeHM, e: LATEST_FAKE_CUTOFF });
      }
    }

    intervals.sort((a, b) => hhmmToMinutes(a.s) - hhmmToMinutes(b.s));
    const merged: Array<{ s: TimeHM; e: TimeHM }> = [];
    for (const cur of intervals) {
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
  }, [reservations, googleCalendarEvents, operationalTimings]);

  const disabledPairsForPicker = useMemo(() => {
    if (!selectedDate) return { starts: [] as TimeHM[], ends: [] as TimeHM[] };
    const merged = buildMergedIntervalsFor(selectedDate);
    return { starts: merged.map(x => x.s), ends: merged.map(x => x.e) };
  }, [selectedDate, buildMergedIntervalsFor]);

  const getRequiredMinutes = useCallback((selPkg: Package | null, lst: safeListing) => {
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
    const rawStart = (operationalTimings as any)?.operationalHours?.start?.trim?.();
    const rawEnd = (operationalTimings as any)?.operationalHours?.end?.trim?.();
    const toMinFromOps = (s?: string | null): number | null => {
      if (!s) return null;
      const idx = SLOT_LABELS.indexOf(s as any);
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
    const merged = buildMergedIntervalsFor(day);
    const busy: Array<{ s: number; e: number }> = merged
      .map(({ s, e }) => ({ s: labelToMinutes(s), e: labelToMinutes(e) }))
      .filter(({ s, e }) => Number.isFinite(s) && Number.isFinite(e) && s < e);
    const overlapsBusy = (a: number, b: number) => busy.some(({ s, e }) => !(b <= s || a >= e));
    for (let i = startIdx; i <= lastUsableStartIdx; i++) {
      const startMin = labelMinutes[i];
      const endMin = startMin + required;
      if (endMin > opsEndMin + step) continue;
      if (!overlapsBusy(startMin, endMin)) return true;
    }
    return false;
  }, [operationalTimings, buildMergedIntervalsFor, selectedPackage, listing, getRequiredMinutes]);

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
                fullListing={listing}
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
                  setSelectDate={setSelectedDate}
                  selectedDate={selectedDate}
                  setSelectTimeSlots={setSelectedTimeSlot}
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
                  isOwner={!!currentUser?.is_owner}
                  selectedPackage={selectedPackage}
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
