"use client";

import useCities from "@/hook/useCities";
import { SafeUser, safeListing } from "@/types";
import dynamic from "next/dynamic";
import React from "react";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import Offers from "../Offers";
import AddonsList from "./AddonList";
import { Listing } from "@prisma/client";

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
  definedAmenities?:Array<any>,
  onAddonChange:(addons:any) =>void;
};

function ListingInfo({
  user,
  description,
  category,
  locationValue,
  fullListing,
  definedAmenities,
  onAddonChange
}: Props) {
  const { getByValue } = useCities();
  const coordinates = getByValue(locationValue)?.latlng;
  const handleAddonChange = (addons:any) =>{
      onAddonChange(addons);
  }
  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className=" text-xl font-semibold flex flex-row items-center gap-2">
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
          description={category?.description}
        />
      )}

      <p className="text-lg font-light text-neutral-500">{description}</p>
      <hr />
      <Offers amenities={fullListing.amenities} definedAmenities={definedAmenities}/>
      <hr />
      <AddonsList addons={fullListing.addons} onChange={handleAddonChange} />
      <hr />
      <p className="text-xl font-semibold">{`Where you’ll be`}</p>
      <Map center={coordinates} locationValue={locationValue} />
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
                {fullListing.otherDetails?.carpetArea ?? 0 } sqft 
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
                {fullListing.otherDetails?.maximumPax ?? 0 } People
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
                {fullListing.otherDetails?.minimumBookingHours ?? 0 } Hrs
              </div>
            </>
          )
        }
        </div>
    </div>
  );
}

export default ListingInfo;
