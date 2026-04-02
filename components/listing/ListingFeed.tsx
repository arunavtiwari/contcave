"use client";

import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import { useCallback, useEffect, useRef, useState } from "react";

import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";

import AutoComplete, { AutoCompleteValue } from "../inputs/AutoComplete";
import ListingCard from "./ListingCard";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

const GEO_TIMEOUT = 8000;

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

type LocationData = {
  latlng?: unknown;
  [key: string]: unknown;
};

const getListingLatLng = (listing: safeListing): [number, number] | null => {
  const actualLocation = listing.actualLocation as LocationData | null | undefined;
  if (!actualLocation || typeof actualLocation !== "object") return null;

  // Prefer privacy-safe jittered latlng if available
  const latlng = actualLocation.latlng;
  if (Array.isArray(latlng) && latlng.length >= 2) {
    const jLat = Number(latlng[0]);
    const jLng = Number(latlng[1]);
    if (Number.isFinite(jLat) && Number.isFinite(jLng)) {
      return [jLat, jLng];
    }
  }

  // Fallback to exact lat/lng for legacy listings
  const exactLat = Number(actualLocation.lat);
  const exactLng = Number(actualLocation.lng);
  if (Number.isFinite(exactLat) && Number.isFinite(exactLng)) {
    return [exactLat, exactLng];
  }

  return null;
};

function ListingFeed({ listings, currentUser }: Props) {
  const [sortedListings, setSortedListings] = useState(listings);
  const [sortedByLocation, setSortedByLocation] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const listingsRef = useRef(listings);

  useEffect(() => {
    listingsRef.current = listings;
    setSortedListings(listings);
    setSortedByLocation(false);
  }, [listings]);

  const prioritizeListings = useCallback((userLat: number, userLng: number) => {
    const baseline = listingsRef.current.map((listing, index) => {
      const listingCoords = getListingLatLng(listing);
      const distance = listingCoords
        ? haversineDistance(userLat, userLng, listingCoords[0], listingCoords[1])
        : Number.POSITIVE_INFINITY;
      return { listing, index, distance };
    });

    baseline.sort((a, b) => {
      if (a.distance === b.distance) {
        return a.index - b.index;
      }
      return a.distance - b.distance;
    });

    const hasAnyDistance = baseline.some((item) => Number.isFinite(item.distance));
    if (hasAnyDistance) {
      setSortedListings(baseline.map((item) => item.listing));
      setSortedByLocation(true);
    }
  }, []);

  const handleDetectLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        prioritizeListings(latitude, longitude);
      },
      () => {
        setIsLocating(false);
        alert("Unable to retrieve your location");
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT }
    );
  };

  const handleManualLocation = (val: AutoCompleteValue) => {
    prioritizeListings(val.latlng[0], val.latlng[1]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold">
            {sortedByLocation ? "Spaces near selected location" : "Showing all spaces"}
          </p>
          <button
            onClick={() => setShowSortOptions(!showSortOptions)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-300 rounded-[10px] hover:border-black transition"
          >
            <MapPin size={16} />
            Sort by distance
          </button>
        </div>

        {showSortOptions && (
          <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50 flex flex-col md:flex-row items-center gap-4">
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="flex items-center justify-center gap-2 px-6 py-2.5 w-full md:w-auto bg-black text-white rounded-[10px] text-sm font-semibold hover:bg-neutral-800 transition disabled:opacity-70 whitespace-nowrap"
            >
              <LocateFixed size={18} />
              {isLocating ? "Locating..." : "Detect my location"}
            </button>
            <div className="text-sm font-medium text-neutral-500 uppercase whitespace-nowrap">or</div>
            <div className="flex-1 w-full min-w-0">
              <AutoComplete
                onChange={handleManualLocation}
                placeholder="Search for a location to sort by..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-x-hidden">
        {sortedListings.map((item) => (
          <ListingCard key={item.id} data={item} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
}

export default ListingFeed;
