"use client";

import useLoginModel from "@/hook/useLoginModal";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import axios from "axios";
import { timeStamp } from "console";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "react-date-range"
import { toast } from "react-toastify";
import { format } from "date-fns";
import Container from "./Container";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import { categories } from "./navbar/Categories";
import getAmenities from "@/app/actions/getAmenities";

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

  //disable time to be implented instead of disable date
  const disableDates  = reservations.map((reservation) => new Date(reservation.startDate));

  const disabledStartTimes = reservations.map((reservations) => new Date(reservations.startTime));
  const disabledEndTimes   = reservations.map((reservations) => new Date(reservations.endTime));
  
  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<[string, string]>(["", ""]);
  const [selectedAddons, setSelectedAddons] = useState<[]>([]);
  const [timeDifferenceInHours, setTimeDifferenceInHours] = useState(0);
  const [definedAmenities, setDefinedAmenities] = useState<any>([]);

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }

    setIsLoading(true);


    axios.post("/api/reservations", {
      totalPrice,
      startDate: selectedDate.toISOString(),
      startTime: new Date(`${selectedDate.toISOString().split('T')[0]} ${selectedTimeSlot[0]}`),
      endTime: new Date(`${selectedDate.toISOString().split('T')[0]} ${selectedTimeSlot[1]}`),
      listingId: listing.id,
      selectedAddons: selectedAddons
    })
      .then(() => {
        toast.success("Reservation Successful!");
        setSelectedDate(initialDate);
        router.push("/bookings");
      })
      .catch(() => {
        toast.error("Error in Reservation");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [totalPrice, selectedDate, selectedTimeSlot, listing?.id, router, currentUser, loginModal]);

  useEffect(() => {
    if(definedAmenities.length == 0){
      getAmenities().then((data:any)=>{
          setDefinedAmenities(data);
      });
    }
    if (selectedDate && selectedTimeSlot) {
      const [startTime, endTime] = selectedTimeSlot;
      
      const startDate = new Date(`${selectedDate.toISOString().split('T')[0]} ${startTime}`);
      const endDate = new Date(`${selectedDate.toISOString().split('T')[0]} ${endTime}`);

      const timeDifferenceInMilliseconds = endDate.getTime() - startDate.getTime();
      const timeDifferenceInHours = timeDifferenceInMilliseconds / (1000 * 60 * 60);
      const totalPrice = calculateTotalPrice(selectedAddons, timeDifferenceInHours);
      setTimeDifferenceInHours(timeDifferenceInHours);
      setTotalPrice(totalPrice);
    }
  }, [selectedDate, selectedTimeSlot, listing.price]);


  const calculateTotalPrice = (addons: any, timeDifference:number = timeDifferenceInHours) => {
    return (timeDifference * listing.price) +  addons.reduce((acc: number, value: { price: number; quantity: any; }) => acc + (value.price * (value.quantity ?? 0)), 0);
  }

  const category = useMemo(() => {
    return categories.find((item) => item.label === listing.category);
  }, [listing.category]);

  const handleAddonChange =(addons:any)=>{
    setTotalPrice((price:number) =>{
      return calculateTotalPrice(addons)
    });
   setSelectedAddons(addons);
  };
  return (
    <Container>
      <div className="max-w-screen-lg mx-auto">
        <div className="flex flex-col gap-6">
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
            />
            <div className="order-first mb-10 md:order-last md:col-span-3">
              <ListingReservation
                price={listing.price}
                totalPrice={totalPrice}
                setSelectDate={(value) => setSelectedDate(value)}
                selectedDate={selectedDate}
                setSelectTimeSlots={(value) => setSelectedTimeSlot(value)}
                selectedTime={selectedTimeSlot}
                onSubmit={onCreateReservation}
                disabled={isLoading}
                disabledDates={disableDates}   
                disabledStartTimes={disabledStartTimes}
                disabledEndTimes={disabledEndTimes}
                />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default ListingClient;


