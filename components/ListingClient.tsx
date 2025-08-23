"use client";

import useLoginModel from "@/hook/useLoginModal";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { formatInTimeZone } from "date-fns-tz";
import Container from "./Container";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import { categories } from "./navbar/Categories";
import getAmenities from "@/app/actions/getAmenities";

const IST_TIMEZONE = "Asia/Kolkata";
const initialDate = new Date();

type TimeHM = `${number}${number}:${number}${number}`;

type ReservationOperationalTimings = {
  operationalHours: { start: string; end: string };
  operationalDays: { start: string; end: string };
};

const toHHMM = (d: Date): TimeHM => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}` as TimeHM;
};

const parseLabel = (label: string) => {
  const m = label.match(/(\d+):(\d+)\s(AM|PM)/i);
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
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    minutes,
    0,
    0
  );
};

const ensureOps = (val: unknown): ReservationOperationalTimings => {
  const defaults: ReservationOperationalTimings = {
    operationalDays: { start: "mon", end: "sun" },
    operationalHours: { start: "06:00", end: "22:00" },
  };

  if (!val || typeof val !== "object") return defaults;

  const obj = val as Partial<ReservationOperationalTimings> & {
    operationalDays?: { start?: unknown; end?: unknown };
    operationalHours?: { start?: unknown; end?: unknown };
  };

  const startDay =
    typeof obj.operationalDays?.start === "string"
      ? obj.operationalDays!.start
      : defaults.operationalDays.start;
  const endDay =
    typeof obj.operationalDays?.end === "string"
      ? obj.operationalDays!.end
      : defaults.operationalDays.end;

  const startHour =
    typeof obj.operationalHours?.start === "string"
      ? obj.operationalHours!.start
      : defaults.operationalHours.start;
  const endHour =
    typeof obj.operationalHours?.end === "string"
      ? obj.operationalHours!.end
      : defaults.operationalHours.end;

  return {
    operationalDays: { start: startDay, end: endDay },
    operationalHours: { start: startHour, end: endHour },
  };
};

type Props = {
  reservations?: SafeReservation[];
  listing: safeListing & {
    user: SafeUser;
  };
  currentUser?: SafeUser | null;
};

function ListingClient({ reservations = [], listing, currentUser }: Props) {
  const router = useRouter();
  const loginModal = useLoginModel();

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[string | null, string | null]>([null, null]);

  const [selectedAddons, setSelectedAddons] = useState<[]>([]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [definedAmenities, setDefinedAmenities] = useState<any>([]);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [isLoading, setIsLoading] = useState(false);

  // Google events are fetched only when owner connected
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const ownerHasGoogleCalendar = !!listing?.user?.googleCalendarConnected;

  const localDisabledDates = useMemo(
    () => reservations.map((r) => new Date(r.startDate)),
    [reservations]
  );

  // fetch Google Calendar events ONLY if connected
  useEffect(() => {
    const controller = new AbortController();

    async function fetchGoogleCalendarEvents() {
      if (!ownerHasGoogleCalendar) {
        setGoogleCalendarEvents([]);
        return;
      }
      try {
        const response = await axios.get("/api/calendar/events", {
          params: { listingId: listing.id },
          signal: controller.signal as any,
        });
        setGoogleCalendarEvents(Array.isArray(response.data) ? response.data : []);
      } catch (error: any) {
        if (error?.name !== "CanceledError") {
          console.error("Failed to fetch Google Calendar events", error);
          setGoogleCalendarEvents([]);
        }
      }
    }

    fetchGoogleCalendarEvents();
    return () => controller.abort();
  }, [listing.id, ownerHasGoogleCalendar]);

  const disabledDates = useMemo(() => {
    const googleDates = googleCalendarEvents
      .filter((event) => event.start?.dateTime)
      .map((event) => new Date(event.start.dateTime));
    return [...localDisabledDates, ...googleDates];
  }, [localDisabledDates, googleCalendarEvents]);

  const selectedDateStr = selectedDate.toDateString();

  const disabledStartTimes = useMemo(() => {
    const reservationStartTimes = reservations
      .filter((r) => new Date(r.startDate).toDateString() === selectedDateStr)
      .map((r) => toHHMM(new Date(r.startTime)));

    const googleStartTimes = googleCalendarEvents
      .filter(
        (e) =>
          e.start?.dateTime &&
          new Date(e.start.dateTime).toDateString() === selectedDateStr
      )
      .map((e) => toHHMM(new Date(e.start.dateTime)));

    return [...reservationStartTimes, ...googleStartTimes] as readonly TimeHM[];
  }, [reservations, googleCalendarEvents, selectedDateStr]);

  const disabledEndTimes = useMemo(() => {
    const reservationEndTimes = reservations
      .filter((r) => new Date(r.startDate).toDateString() === selectedDateStr)
      .map((r) => toHHMM(new Date(r.endTime)));

    const googleEndTimes = googleCalendarEvents
      .filter(
        (e) =>
          e.end?.dateTime &&
          new Date(e.end.dateTime).toDateString() === selectedDateStr
      )
      .map((e) => toHHMM(new Date(e.end.dateTime)));

    return [...reservationEndTimes, ...googleEndTimes] as readonly TimeHM[];
  }, [reservations, googleCalendarEvents, selectedDateStr]);

  const calculateTotalPrice = useCallback(
    (addons: any, timeDifference: number = timeDifferenceInHours) => {
      return (
        timeDifference * listing.price +
        addons.reduce(
          (acc: number, value: { price: number; qty: any }) =>
            acc + value.price * (value.qty ?? 0),
          0
        )
      );
    },
    [listing.price, timeDifferenceInHours]
  );

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }

    const [startSlot, endSlot] = selectedTimeSlot;
    if (!startSlot || !endSlot) {
      toast.error("Please select a valid start and end time.");
      return;
    }

    setIsLoading(true);

    const startDt = dateFromLabel(selectedDate, startSlot);
    const endDt = dateFromLabel(selectedDate, endSlot);

    const formattedStartTime = formatInTimeZone(
      startDt,
      IST_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
    const formattedEndTime = formatInTimeZone(
      endDt,
      IST_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );

    const startDateOnly = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    axios
      .post("/api/reservations", {
        totalPrice,
        startDate: startDateOnly,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        listingId: listing.id,
        instantBooking: listing.instantBooking,
        selectedAddons: selectedAddons,
      })
      .then(() => {
        toast.success("Reservation Successful!", { toastId: "Reservation_Successfull" });
        setSelectedDate(initialDate);
        router.push("/bookings");
      })
      .catch(() => {
        toast.error("Error in Reservation", { toastId: "Reservation_Error_1" });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    currentUser,
    loginModal,
    selectedTimeSlot,
    selectedDate,
    totalPrice,
    listing.id,
    listing.instantBooking,
    selectedAddons,
    router,
  ]);

  useEffect(() => {
    if (definedAmenities.length === 0) {
      getAmenities().then((data: any) => setDefinedAmenities(data));
    }

    const [startTime, endTime] = selectedTimeSlot;
    if (!selectedDate || !startTime || !endTime) return;

    const startDateTime = dateFromLabel(selectedDate, startTime);
    const endDateTime = dateFromLabel(selectedDate, endTime);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const newTotalPrice = calculateTotalPrice(selectedAddons, diffHours);

    setTimeDifferenceInHours(diffHours);
    setTotalPrice(newTotalPrice);
  }, [
    selectedDate,
    selectedTimeSlot,
    listing.price,
    selectedAddons,
    definedAmenities,
    calculateTotalPrice,
  ]);

  const category = useMemo(() => {
    return categories.find((item) => item.label === listing.category);
  }, [listing.category]);

  const handleAddonChange = (addons: any) => {
    setTotalPrice(calculateTotalPrice(addons));
    setSelectedAddons(addons);
  };

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
              currentUser={currentUser}
            />
            <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
              <ListingInfo
                definedAmenities={definedAmenities}
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
                  totalPrice={totalPrice}
                  platformFee={0}
                  time={timeDifferenceInHours}
                  addons={selectedAddons.reduce(
                    (acc: number, value: { price: number; qty: any }) =>
                      acc + value.price * (value.qty ?? 0),
                    0
                  )}
                  setSelectDate={setSelectedDate}
                  selectedDate={selectedDate}
                  setSelectTimeSlots={setSelectedTimeSlot}
                  selectedTime={selectedTimeSlot as [string, string]}
                  onSubmit={onCreateReservation}
                  disabled={isLoading}
                  instantBooking={listing.instantBooking ?? 0}
                  disabledDates={disabledDates}
                  disabledStartTimes={disabledStartTimes}
                  disabledEndTimes={disabledEndTimes}
                  operationalTimings={ensureOps(listing.otherDetails)}
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
