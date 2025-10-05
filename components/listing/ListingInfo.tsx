"use client";

import useCities from "@/hook/useCities";
import { SafeUser } from "@/types";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import Offers from "../Offers";
import AddonsList from "./AddonList";
import Image from "next/image";
import axios from "axios";
import getAddons from "@/app/actions/getAddons";
import getAmenities from "@/app/actions/getAmenities";

import { FaStar } from "react-icons/fa";
import PackageList from "./PackageList";
import { Package } from "../inputs/PackagesForm";
import Link from "@/node_modules/next/link";

const Map = dynamic(() => import("../Map"), { ssr: false });

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
  onPackageSelect?: (pkg: Package | null) => void;
};

function ListingInfo({
  user,
  description,
  category,
  locationValue,
  fullListing,
  definedAmenities,
  onAddonChange,
  onPackageSelect,
}: Props) {
  const { getByValue } = useCities();
  const coordinates = getByValue(locationValue)?.latlng;

  const relayAddons = useCallback((addons: any) => onAddonChange(addons), [onAddonChange]);

  const [addonList, setAddonList] = useState<any[]>([]);
  const [amenityDefs, setAmenityDefs] = useState<any[]>(definedAmenities ?? []);
  const [reviews, setReviews] = useState<any[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [latestReservationId, setLatestReservationId] = useState("");
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  const limit = 250;
  const shouldTruncate = description.length > limit;
  const displayedText = isExpanded || !shouldTruncate ? description : description.slice(0, limit) + "...";

  useEffect(() => {
    const fetchData = async () => {
      const list = await getAddons();
      setAddonList(list || []);
      try {
        const res = await axios.get(`/api/reviews/list/${fullListing.id}`);
        setReviews(res.data || []);
      } catch {}
    };
    const checkBooking = async () => {
      try {
        const res = await axios.get(`/api/checkbooking/${fullListing.id}`);
        setCanReview(Boolean(res.data?.canReview));
        setLatestReservationId(res.data?.latestReservationId ?? "");
      } catch {
        setCanReview(false);
      }
    };
    fetchData();
    checkBooking();
  }, [fullListing.id]);

  useEffect(() => {
    if (definedAmenities && definedAmenities.length > 0) {
      setAmenityDefs(definedAmenities);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const defs = await getAmenities();
        if (!cancelled) setAmenityDefs(defs || []);
      } catch {
        if (!cancelled) setAmenityDefs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definedAmenities]);

  const normalizeSelectedAmenityKeys = useCallback((raw: any): string[] => {
    try {
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
          raw = JSON.parse(trimmed);
        }
      }
    } catch { }
    const out: string[] = [];
    const pushKey = (k: any) => {
      if (k == null) return;
      const s = String(k).trim();
      if (!s) return;
      out.push(s);
    };
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (typeof item === "string") pushKey(item);
        else if (item && typeof item === "object") pushKey(item.key ?? item.slug ?? item.name ?? item.id);
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]) => {
        if (v) pushKey(k);
      });
    }
    return Array.from(new Set(out));
  }, []);

  const selectedAmenityKeys = useMemo(
    () => normalizeSelectedAmenityKeys(fullListing?.amenities ?? []),
    [fullListing?.amenities, normalizeSelectedAmenityKeys]
  );



  const opDaysStart = fullListing?.operationalDays?.start ?? "";
  const opDaysEnd = fullListing?.operationalDays?.end ?? "";
  const opHoursStart = fullListing?.operationalHours?.start ?? "";
  const opHoursEnd = fullListing?.operationalHours?.end ?? "";
  const carpetArea = fullListing?.carpetArea ?? "";
  const maximumPax = fullListing?.maximumPax ?? 0;
  const minimumBookingHours = fullListing?.minimumBookingHours ?? "";
  const type = Array.isArray(fullListing?.type) ? fullListing.type : [];

  const handleReviewSubmit = async () => {
    try {
      await axios.post("/api/reviews", {
        listingId: fullListing.id,
        reservationId: latestReservationId,
        rating: review.rating,
        comment: review.comment,
      });
      const res = await axios.get(`/api/reviews/list/${fullListing.id}`);
      setReviews(res.data);
      setReview({ rating: 5, comment: "" });
    } catch {
      // ignore
    }
  };

  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex gap-2 justify-between">
        <div className="text-xl font-semibold flex flex-row items-center gap-2">
          <div>Hosted by {user?.name}</div>
          <Avatar src={user?.image} userName={user?.name} />
        </div>
        {fullListing.avgReviewRating && fullListing.avgReviewRating !== 0 && (
          <div className="font-semibold text-lg flex items-center gap-1.5 leading-[18px]">
            <FaStar size={20} color="gold" /> {fullListing.avgReviewRating?.toFixed(1)}
          </div>
        )}
      </div>

      <hr />

      {category && (
        <ListingCategory
          icon={category.icon}
          label={category.label}
          address={fullListing.actualLocation?.display_name ?? ""}
          description={category.description}
        />
      )}

      <div className="text-base font-normal">
        <p>{displayedText}</p>
        {shouldTruncate && (
          <button onClick={toggleExpand} className="underline font-medium text-sm mt-1">
            {isExpanded ? "See less" : "See more"}
          </button>
        )}
      </div>

      <hr />

      <div className="flex flex-col gap-2">
        <p className="text-xl font-semibold">Address</p>
        <p className="font-normal">{fullListing.actualLocation?.display_name ?? ""}</p>
      </div>

      <hr />

      {selectedAmenityKeys.length > 0 && amenityDefs.length > 0 && (
        <>
          <Offers amenities={selectedAmenityKeys} definedAmenities={amenityDefs} />
          <hr />
        </>
      )}

      {Array.isArray(fullListing.addons) && fullListing.addons.length > 0 && (
        <>
          <AddonsList addons={fullListing.addons} onChange={relayAddons} addonList={addonList} />
          <hr />
        </>
      )}

      {Array.isArray(fullListing.packages) && fullListing.packages.length > 0 && (
        <>
          <PackageList
            packages={fullListing.packages}
            onSelect={(pkg) => {
              onPackageSelect?.(pkg ?? null);
            }}
          />
          <hr />
        </>
      )}

      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold">Where you’ll be</p>
        <Map center={fullListing.actualLocation ? fullListing.actualLocation.latlng ?? coordinates : coordinates} locationValue={locationValue} />
      </div>

      <hr />

      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold">Operational Timings</p>
        <div className="flex gap-10">
          {(opDaysStart || opDaysEnd) && (
            <div>
              <strong>
                {opDaysStart} {opDaysStart && opDaysEnd && "-"} {opDaysEnd}
              </strong>
            </div>
          )}
          {(opHoursStart || opHoursEnd) && (
            <div>
              {opHoursStart} {opHoursStart && opHoursEnd && "-"} {opHoursEnd}
            </div>
          )}
        </div>
      </div>

      <hr />

      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold">Additional Information</p>
        {(carpetArea || carpetArea === 0) && (
          <div className="flex gap-10">
            <div className="w-1/2">
              <strong>Carpet Area</strong>
            </div>
            <div>{carpetArea || 0} sqft</div>
          </div>
        )}
        {(maximumPax || maximumPax === 0) && (
          <div className="flex gap-10">
            <div className="w-1/2">
              <strong>Max People</strong>
            </div>
            <div>{maximumPax} People</div>
          </div>
        )}
        {(minimumBookingHours || minimumBookingHours === 0) && (
          <div className="flex gap-10">
            <div className="w-1/2">
              <strong>Min Booking Hours</strong>
            </div>
            <div>{minimumBookingHours || 0} Hrs</div>
          </div>
        )}
      </div>

      <hr />

      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold">Listed Services</p>
        <div className="flex flex-wrap gap-2">
          {type.map((service: string, index: number) => (
            <div key={index} className="bg-black text-white px-3 py-1 rounded-full">
              {service}
            </div>
          ))}
          <p className="text-gray-500 mt-3">
            <strong className="text-black">Note:</strong> Please utilize this space for its intended activities to make the most of your experience.
          </p>
        </div>
      </div>

      <hr />

      {(reviews.length > 0 || canReview) && (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold">Reviews</p>
            <p className="text-lg font-semibold">
              <span className="pr-1">{reviews.length}</span> Ratings
            </p>
          </div>

          {reviews.length > 0 && (
            <>
              <div className="flex flex-col relative gap-4 pb-4">
                {reviews.map((rv: any) => (
                  <div className="flex items-center p-5 shadow-md rounded-2xl border" key={rv.id}>
                    <div className="h-fit">
                      <Avatar src={rv.user?.image} userName={rv.user?.name} size={45} />
                    </div>
                    <div className="pl-4 flex flex-col w-full">
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold">{rv.user?.name}</div>
                      </div>
                      <div>
                        <p>{rv.comment}</p>
                      </div>
                      <div className="text-sm text-neutral-500">
                        {new Date(rv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <hr />
            </>
          )}

          {canReview && (
            <>
              <div className="flex flex-col gap-4">
                <div className="text-xl capitalize font-semibold">Submit your review</div>
                <div className="relative">
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
                <div className="flex gap-2 items-center">
                  <span className="font-semibold">Rate</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setReview({ ...review, rating: v })}
                        className={`text-xl ${review.rating >= v ? "text-yellow-500" : "text-neutral-400"}`}
                        aria-label={`${v} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={handleReviewSubmit} className="rounded-full bg-black w-full py-2.5 text-white hover:opacity-90">
                  Submit
                </button>
              </div>
              <hr />
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold">Cancellation Policy</p>
        <p className="flex flex-wrap">
          Full refund for cancellations made at least 48 hours before the scheduled booking, partial refund for cancellations made
          between 24 and 48 hours before the scheduled booking, and no refund for cancellations made within 24 hours of the scheduled booking.
        </p>

        <Link href="/cancellation" className="text-blue-500 underline cursor-pointer w-fit">
          Know more about Cancellation Policy
        </Link>

      </div>
    </div>
  );
}

export default ListingInfo;
