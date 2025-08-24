"use client";

import { SafeReservation, SafeUser, safeListing } from "@/types";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Container from "./Container";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import { categories } from "./navbar/Categories";
import { ReservationOperationalTimings, TimeHM, TimeLabel, buildOperationalTimings } from "@/types/scheduling";

type Props = {
  reservations?: SafeReservation[];
  listing: safeListing & { user: SafeUser };
  currentUser?: SafeUser | null;
};

type AddonItem = { name?: string; price: number; qty: number };

const toHHMM = (d: Date): TimeHM => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}` as TimeHM;
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
    const n = parseFloat(v.replace(/[^\d.+-]/g, ""));
    return Number.isFinite(n) ? n : def;
  }
  return def;
};

const normalizeAddons = (input: unknown): AddonItem[] => {
  const base = Array.isArray(input) ? input : input && typeof input === "object" ? Object.values(input as any) : [];
  return base
    .map((a: any) => ({
      name: a?.name,
      price: Math.max(0, toNum(a?.price, 0)),
      qty: Math.max(0, toNum(a?.qty, 0)),
    }))
    .filter(a => a.price > 0 && a.qty > 0);
};

const addonsSig = (arr: AddonItem[]) =>
  arr.map(a => `${a.name ?? ""}|${a.price}|${a.qty}`).sort().join(",");

function ListingClient({ reservations = [], listing }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[TimeLabel | null, TimeLabel | null]>([null, null]);
  const [selectedAddons, setSelectedAddons] = useState<AddonItem[]>([]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);

  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const ownerHasGoogleCalendar = !!listing?.user?.googleCalendarConnected;
  const abortRef = useRef<AbortController | null>(null);
  const lastSigRef = useRef("");

  const localDisabledDates = useMemo(() => reservations.map(r => new Date(r.startDate)), [reservations]);

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

  const disabledDates = useMemo(() => {
    const googleDates = googleCalendarEvents.filter(e => e.start?.dateTime).map(e => new Date(e.start.dateTime));
    const key = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const set = new Map<string, Date>();
    [...localDisabledDates, ...googleDates].forEach(d => set.set(key(d), d));
    return Array.from(set.values());
  }, [localDisabledDates, googleCalendarEvents]);

  const selectedDateStr = selectedDate.toDateString();

  const disabledStartTimes = useMemo(() => {
    const reservationStartTimes = reservations
      .filter(r => new Date(r.startDate).toDateString() === selectedDateStr)
      .map(r => toHHMM(new Date(r.startTime)));
    const googleStartTimes = googleCalendarEvents
      .filter(e => e.start?.dateTime && new Date(e.start.dateTime).toDateString() === selectedDateStr)
      .map(e => toHHMM(new Date(e.start.dateTime)));
    return [...reservationStartTimes, ...googleStartTimes] as readonly TimeHM[];
  }, [reservations, googleCalendarEvents, selectedDateStr]);

  const disabledEndTimes = useMemo(() => {
    const reservationEndTimes = reservations
      .filter(r => new Date(r.startDate).toDateString() === selectedDateStr)
      .map(r => toHHMM(new Date(r.endTime)));
    const googleEndTimes = googleCalendarEvents
      .filter(e => e.end?.dateTime && new Date(e.end.dateTime).toDateString() === selectedDateStr)
      .map(e => toHHMM(new Date(e.end.dateTime)));
    return [...reservationEndTimes, ...googleEndTimes] as readonly TimeHM[];
  }, [reservations, googleCalendarEvents, selectedDateStr]);

  useEffect(() => {
    const [startLabel, endLabel] = selectedTimeSlot;
    if (!selectedDate || !startLabel || !endLabel) return;
    const start = dateFromLabel(selectedDate, startLabel);
    const end = dateFromLabel(selectedDate, endLabel);
    const diffHours = Math.max(0, (end.getTime() - start.getTime()) / 36e5);
    setTimeDifferenceInHours(diffHours);
  }, [selectedDate, selectedTimeSlot]);

  const category = useMemo(() => categories.find(c => c.label === listing.category), [listing.category]);

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

  const operationalTimings: ReservationOperationalTimings = useMemo(() => buildOperationalTimings(listing), [listing]);

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
              />
              <div className="order-first mb-10 md:order-last md:col-span-3">
                <ListingReservation
                  listingId={listing.id}
                  price={listing.price}
                  platformFee={0}
                  time={timeDifferenceInHours}
                  setSelectDate={setSelectedDate}
                  selectedDate={selectedDate}
                  setSelectTimeSlots={setSelectedTimeSlot}
                  selectedTime={selectedTimeSlot as [TimeLabel, TimeLabel]}
                  instantBooking={!!listing.instantBooking}
                  disabledDates={disabledDates}
                  disabledStartTimes={disabledStartTimes}
                  disabledEndTimes={disabledEndTimes}
                  operationalTimings={operationalTimings}
                  selectedAddons={selectedAddons}
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
