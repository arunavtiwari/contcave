import { useCallback, useMemo } from "react";

import {
    asEndOfDayMinutes,
    getRoundedNowIST_HHMM,
    hhmmToMinutes,
    istSameDay,
    istToDateOnly,
    labelToMinutes,
    toHHMM,
} from "@/lib/scheduling";
import { FullListing } from "@/types/listing";
import { SafeReservation } from "@/types/reservation";
import {
    buildOperationalTimings,
    ReservationOperationalTimings,
    TimeHM,
} from "@/types/scheduling";

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

interface UseAvailabilityParams {
    listing: FullListing;
    reservations: SafeReservation[];
    googleCalendarEvents: GoogleCalendarEvent[];
    selectedDate: Date | null;
    selectedSetIds: string[];
}

const EARLIEST_SLOT_HHMM: TimeHM = "06:00" as TimeHM;
const LATEST_FAKE_CUTOFF: TimeHM = "23:59" as TimeHM;

/**
 * Extracts all availability/busy-interval computation logic from ListingClient.
 * Returns disabled dates and the disabled time slot pairs for the date picker.
 *
 * This hook encapsulates ~200 lines of scheduling math that was previously
 * inlined inside ListingClient, making it independently testable.
 */
export function useAvailability({
    listing,
    reservations,
    googleCalendarEvents,
    selectedDate,
    selectedSetIds,
}: UseAvailabilityParams) {
    const operationalTimings: ReservationOperationalTimings = useMemo(
        () => buildOperationalTimings(listing),
        [listing]
    );

    /** Dates that should be fully disabled in the calendar */
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
        } catch (e) {
            console.error("[useAvailability] Failed to compute today availability", e);
        }

        return Array.from(set.values());
    }, [googleCalendarEvents, operationalTimings]);

    /** Builds merged busy intervals for a given day + selected set IDs */
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

    /** Pre-computed disabled pairs for the time slot picker */
    const disabledPairsForPicker = useMemo(() => {
        if (!selectedDate) return { starts: [] as TimeHM[], ends: [] as TimeHM[] };
        const merged = buildMergedIntervalsFor(selectedDate, selectedSetIds);
        return { starts: merged.map(x => x.s), ends: merged.map(x => x.e) };
    }, [selectedDate, buildMergedIntervalsFor, selectedSetIds]);

    return {
        operationalTimings,
        disabledDatesBase,
        disabledPairsForPicker,
        buildMergedIntervalsFor,
    };
}

export type { GoogleCalendarEvent };
