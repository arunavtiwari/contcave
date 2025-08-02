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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[string, string]>(["", ""]);
  const [selectedAddons, setSelectedAddons] = useState<[]>([]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [definedAmenities, setDefinedAmenities] = useState<any>([]);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [isLoading, setIsLoading] = useState(false);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);

  const localDisabledDates = reservations.map(
    (reservation) => new Date(reservation.startDate)
  );

  useEffect(() => {
    const fetchGoogleCalendarEvents = async () => {
      try {
        const response = await axios.get("/api/calendar/events", {
          params: { listingId: listing.id },
        });
        setGoogleCalendarEvents(response.data);
      } catch (error) {
        console.error("Failed to fetch Google Calendar events", error);
      }
    };
    fetchGoogleCalendarEvents();
  }, [listing.id]);

  const disabledDates = useMemo(() => {
    const googleDates = googleCalendarEvents
      .filter((event) => event.start?.dateTime)
      .map((event) => new Date(event.start.dateTime));
    return [...localDisabledDates, ...googleDates];
  }, [localDisabledDates, googleCalendarEvents]);

  const disabledStartTimes = useMemo(() => {
    const reservationStartTimes = reservations
      .filter(
        (reservation) =>
          new Date(reservation.startDate).toDateString() ===
          selectedDate.toDateString()
      )
      .map((reservation) => new Date(reservation.startTime));
    const googleStartTimes = googleCalendarEvents
      .filter(
        (event) =>
          event.start?.dateTime &&
          new Date(event.start.dateTime).toDateString() ===
          selectedDate.toDateString()
      )
      .map((event) => new Date(event.start.dateTime));
    return [...reservationStartTimes, ...googleStartTimes];
  }, [reservations, googleCalendarEvents, selectedDate]);

  const disabledEndTimes = useMemo(() => {
    const reservationEndTimes = reservations
      .filter(
        (reservation) =>
          new Date(reservation.startDate).toDateString() ===
          selectedDate.toDateString()
      )
      .map((reservation) => new Date(reservation.endTime));
    const googleEndTimes = googleCalendarEvents
      .filter(
        (event) =>
          event.end?.dateTime &&
          new Date(event.end.dateTime).toDateString() ===
          selectedDate.toDateString()
      )
      .map((event) => new Date(event.end.dateTime));
    return [...reservationEndTimes, ...googleEndTimes];
  }, [reservations, googleCalendarEvents, selectedDate]);

  const calculateTotalPrice = (
    addons: any,
    timeDifference: number = timeDifferenceInHours
  ) => {
    return (
      timeDifference * listing.price +
      addons.reduce(
        (acc: number, value: { price: number; qty: any }) =>
          acc + value.price * (value.qty ?? 0),
        0
      )
    );
  };

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }
    setIsLoading(true);

    const dateString = formatInTimeZone(selectedDate, IST_TIMEZONE, "yyyy-MM-dd");
    const startDateTimeStr = `${dateString} ${selectedTimeSlot[0]}`;
    const endDateTimeStr = `${dateString} ${selectedTimeSlot[1]}`;


    const formattedStartTime = formatInTimeZone(
      new Date(startDateTimeStr),
      IST_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
    const formattedEndTime = formatInTimeZone(
      new Date(endDateTimeStr),
      IST_TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );

    axios
      .post("/api/reservations", {
        totalPrice,
        startDate: new Date(dateString),
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        listingId: listing.id,
        instantBooking: listing.instantBooking,
        selectedAddons: selectedAddons,
      })
      .then(() => {
        toast.success("Reservation Successful!", {
          toastId: "Reservation_Successfull",
        });
        setSelectedDate(initialDate);
        router.push("/bookings");
      })
      .catch(() => {
        toast.error("Error in Reservation", {
          toastId: "Reservation_Error_1",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    totalPrice,
    selectedDate,
    selectedTimeSlot,
    listing?.id,
    router,
    currentUser,
    loginModal,
    selectedAddons,
  ]);

  useEffect(() => {
    if (definedAmenities.length === 0) {
      getAmenities().then((data: any) => {
        setDefinedAmenities(data);
      });
    }
    if (selectedDate && selectedTimeSlot) {
      const [startTime, endTime] = selectedTimeSlot;
      const parseTime = (time: string) => {
        const match = time.match(/(\d+):(\d+) (AM|PM)/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3];
          if (period === "PM" && hours < 12) {
            hours += 12;
          }
          if (period === "AM" && hours === 12) {
            hours = 0;
          }
          return { hours, minutes };
        }
        return { hours: 0, minutes: 0 };
      };

      const { hours: startHours, minutes: startMinutes } = parseTime(startTime);
      const { hours: endHours, minutes: endMinutes } = parseTime(endTime);

      const startDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        startHours,
        startMinutes
      );
      const endDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        endHours,
        endMinutes
      );

      const timeDifferenceInMilliseconds =
        endDateTime.getTime() - startDateTime.getTime();
      const calculatedTimeDifferenceInHours =
        timeDifferenceInMilliseconds / (1000 * 60 * 60);
      const newTotalPrice = calculateTotalPrice(selectedAddons, calculatedTimeDifferenceInHours);
      setTimeDifferenceInHours(calculatedTimeDifferenceInHours);
      setTotalPrice(newTotalPrice);
    }
  }, [selectedDate, selectedTimeSlot, listing.price, selectedAddons, definedAmenities]);

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
                  price={listing.price}
                  totalPrice={totalPrice}
                  platformFee={0}
                  time={timeDifferenceInHours}
                  addons={selectedAddons.reduce(
                    (acc: number, value: { price: number; qty: any }) =>
                      acc + value.price * (value.qty ?? 0),
                    0
                  )}
                  setSelectDate={(value) => setSelectedDate(value)}
                  selectedDate={selectedDate}
                  setSelectTimeSlots={(value) => setSelectedTimeSlot(value)}
                  selectedTime={selectedTimeSlot}
                  onSubmit={onCreateReservation}
                  disabled={isLoading}
                  instantBooking={listing.instantBooking ?? 0}
                  disabledDates={disabledDates}
                  disabledStartTimes={disabledStartTimes}
                  disabledEndTimes={disabledEndTimes}
                  operationalTimings={listing.otherDetails}
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
