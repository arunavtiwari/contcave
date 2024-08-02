"use client";

import useCities from "@/hook/useCities";
import { SafeUser, safeListing } from "@/types";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import Offers from "../Offers";
import AddonsList from "./AddonList";
import { IoIosStar } from "react-icons/io";
import { Listing } from "@prisma/client";
import Image from "next/image";
import axios from "axios";
import getAddons from "@/app/actions/getAddons";

const Map = dynamic(() => import("../Map"), {
  ssr: false,
});

type Props = {
  user: SafeUser;
  description: string;
  category:
  | {
    icon: IconType;
    label: string;
    description: string;
  }
  | undefined;
  locationValue: string;
  fullListing: any;
  definedAmenities?: Array<any>;
  onAddonChange: (addons: any) => void;
  services: string[];
};

function ListingInfo({
  user,
  description,
  category,
  locationValue,
  fullListing,
  definedAmenities,
  onAddonChange,
  services,
}: Props) {
  const { getByValue } = useCities();
  const coordinates = getByValue(locationValue)?.latlng;
  const handleAddonChange = (addons: any) => {
    onAddonChange(addons);
  };
  const [addonList, setAddonList] = useState<any>([]);

  const [reviews, setReviews] = useState<any>([]);
  const [canReview, setCanReview] = useState(false);
  const [latestReservationId, setLatestReservationId] = useState("");

  const [review, setReview] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    const fetchReviews = async () => {
      let addonList:any = await getAddons();
      setAddonList(addonList)
      const response = await axios.get(`/api/reviews/list/${fullListing.id}`);
      setReviews(response.data);
    };

    const checkBooking = async () => {
      try {
        const response = await axios.get(`/api/checkbooking/${fullListing.id}`);
        setCanReview(response.data.canReview);
        setLatestReservationId(response.data.latestReservationId);
      } catch (error) {
        setCanReview(false);
      }
    };

    fetchReviews();
    checkBooking();
  }, [fullListing.id]);

  const handleReviewSubmit = async () => {
    try {
      const response = await axios.post("/api/reviews", {
        listingId: fullListing.id,
        reservationId: latestReservationId,
        rating: review.rating,
        comment: review.comment,
      });
      const reviews = await axios.get(`/api/reviews/list/${fullListing.id}`);
      setReviews(reviews.data);
      setReview({ rating: 5, comment: "" });
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="text-xl font-semibold flex flex-row items-center gap-2">
          <div>Hosted by {user?.name}</div>
          <Avatar src={user?.image} userName={user?.name} />
        </div>
        <div className="flex flex-row items-center gap-4 font-light text-neutral-500">
        </div>
      </div>
      <hr />
      {category && (
        <ListingCategory
          icon={category.icon}
          label={category?.label}
          address={fullListing.actualLocation ? fullListing.actualLocation.display_name : ""}
          description={category?.description}
        />
      )}

      <p className="text-lg font-light text-neutral-500">{description}</p>
      <hr />
      <p className="text-xl font-semibold">{`Address`}</p>
      <p className="text-neutral-500 font-light">{fullListing.actualLocation ? fullListing.actualLocation.display_name : ""}</p>
      <hr />
      {
        fullListing.amenities && fullListing.amenities.length && (
          <>
            <Offers amenities={fullListing.amenities} definedAmenities={definedAmenities} />
            <hr />
          </>
        )
      }

      {fullListing.addons && fullListing.addons.length && (
        <>
          <AddonsList addons={fullListing.addons} onChange={handleAddonChange} addonList={addonList} />
          <hr />
        </>
      )}




      <p className="text-xl font-semibold">{`Where you’ll be`}</p>
      <Map center={fullListing.actualLocation ? (fullListing.actualLocation.latlng ?? coordinates) : coordinates} locationValue={locationValue} />
      <hr />
      <p className="text-xl font-semibold">{`Operational Timings`}</p>
      <div className="flex gap-10" >
        {
          fullListing.otherDetails && (
            <>
              <div className="">
                <strong>{fullListing.otherDetails?.operationalDays?.start} - {fullListing.otherDetails?.operationalDays?.end}</strong>
              </div>
              <div className="">
                {fullListing.otherDetails?.operationalHours?.start} AM - {fullListing.otherDetails?.operationalHours?.end} PM
              </div>
            </>
          )
        }
      </div>
      <hr />

      <p className="text-xl font-semibold">{`Additional Information`}</p>
      <div className="flex gap-10" >
        {
          fullListing.otherDetails && (
            <>
              <div className="w-1/3">
                <strong>Carpet Area</strong>
              </div>
              <div className="text-gray-500">
                {fullListing.otherDetails?.carpetArea ?? 0} sqft
              </div>
            </>
          )
        }
      </div>
      <div className="flex gap-10" >
        {
          fullListing.otherDetails && (
            <>
              <div className="w-1/3">
                <strong>Maximum People</strong>
              </div>
              <div className="text-gray-500">
                {fullListing.otherDetails?.maximumPax ?? 0} People
              </div>
            </>
          )
        }
      </div>
      <div className="flex gap-10" >
        {
          fullListing.otherDetails && (
            <>
              <div className="w-1/3">
                <strong>Minimum Booking Hours</strong>
              </div>
              <div className="text-gray-500">
                {fullListing.otherDetails?.minimumBookingHours ?? 0} Hrs
              </div>
            </>
          )
        }
      </div>
      <p className="text-xl font-semibold">{`Listed Services`}</p>
      <div className="flex flex-wrap gap-2">
        {fullListing.otherDetails && fullListing.otherDetails.selectedTypes && fullListing.otherDetails.selectedTypes.map((service, index) => (
          <div key={index} className="bg-rose-500 text-white px-3 py-1 rounded-full">
            {service}
          </div>
        ))}
        <p className="text-gray-500 mt-3">*Please utilize this space for its intended activities to make the most of your experience.</p>
      </div>
      <hr />

          <>
            <div className="relative mt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xl font-bold">Reviews</div>
                <div className="text-lg font-bold"><span className="pr-2">{reviews.length}</span> Ratings</div>
              </div>
              <div className="relative space-y-8">
                {reviews.map((review: any) => (
                  <div className="flex" key={review.id}>
                    <div className="w-16 h-16">
                      <Image src="/assets/user-review.svg" height={64} width={64} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-[calc(100%-64px)] pl-4">
                      <div className="text-base font-bold">{review.user.name}</div>
                      <div className="space-x-2 flex">
                        {[...Array(5)].map((_, i) => (
                          <IoIosStar key={i} size={18} color={i < review.rating ? "#E4E846" : "black"} />
                        ))}
                      </div>
                      <div className="text-sm mt-2">
                        <p>{review.comment}</p>
                      </div>
                      <div className="text-xs italic mt-2">{new Date(review.createdAt).toLocaleDateString('en-GB')}</div>
                    </div>
                  </div>
                ))}
              </div>
              {canReview && (
                <div className="mt-10">
                  <div className="text-xl capitalize mb-8 font-semibold">Submit your review</div>
                  <div className="relative mb-6">
                    <div className="text-sm font-bold mb-2">Write your message</div>
                    <div className="flex w-full bg-white border border-slate-400 items-end px-2 py-2 rounded-md">
                      <textarea
                        value={review.comment}
                        onChange={(e) => setReview({ ...review, comment: e.target.value })}
                        className="w-[calc(100%-16px)] h-[120px] resize-none text-left border-0 text-sm bg-transparent focus:ring-0"
                      />
                      <div className="w-4 h-4">
                        <Image src="/assets/edit.svg" height={18} width={18} className="w-full h-full object-contain" alt="" />
                      </div>
                    </div>
                  </div>
                  <div className="relative mb-6">
                    <div className="text-sm font-bold flex items-center mb-2"><IoIosStar size={18} color="#E4E846" /><span className="pl-2">Rating</span></div>
                    <div className="flex w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                      <select
                        value={review.rating}
                        onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value, 10) })}
                        className="block appearance-none w-full bg-transparent border-0 text-gray-700 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-0 focus:ring-0"
                        id="rating"
                      >
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Good</option>
                        <option value="2">2 - Average</option>
                        <option value="1">1 - Unsatisfactory</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReviewSubmit}
                    className="bg-[#5D15B9] h-[44px] flex items-center justify-start mt-8 text-white xl:px-6 lg:px-4 md:px-4 px-4 font-bold shadow-lg rounded-xl text-center"
                  >
                    <span className="xl:text-lg lg:text-sm md:text-sm text-base">Submit</span>
                  </button>
                </div>
              )}
            </div>
            <hr />
          </>
     

      <p className="text-xl font-semibold">{`Cancellation Policy`}</p>

      <div className="flex flex-wrap gap-2">

        Full refund for cancellations made at least 48 hours before the scheduled booking, partial refund for cancellations made between 24 and 48 hours
        before the scheduled booking, and no refund for cancellations made within 24 hours of the scheduled booking.
      </div>
      <a href="javascript:void(0)" className="text-blue-500 underline">
        Know more about Cancellation Policy
      </a>
    </div>
  );
}

export default ListingInfo;
