"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ListingCard from "./ListingCard";
import { SafeUser } from "@/types/user";
import { safeListing } from "@/types/listing";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
  autoSortByLocation?: boolean;
};

const GEO_TIMEOUT = 8000;

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
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
  const latlng = actualLocation.latlng;
  if (!Array.isArray(latlng) || latlng.length < 2) return null;
  const lat = Number(latlng[0]);
  const lng = Number(latlng[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

function ListingFeed({ listings, currentUser, autoSortByLocation = false }: Props) {
  const [sortedListings, setSortedListings] = useState(listings);
  const [sortedByLocation, setSortedByLocation] = useState(false);
  const hasAttemptedSortingRef = useRef(false);
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

  useEffect(() => {
    if (!autoSortByLocation || typeof window === "undefined" || hasAttemptedSortingRef.current) {
      return;
    }
    if (!("geolocation" in navigator)) {
      hasAttemptedSortingRef.current = true;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        hasAttemptedSortingRef.current = true;
        const { latitude, longitude } = position.coords;
        prioritizeListings(latitude, longitude);
      },
      () => {
        hasAttemptedSortingRef.current = true;
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT }
    );
  }, [autoSortByLocation, prioritizeListings]);

  return (
    <div className="space-y-6">
      {sortedByLocation && (
        <p className="text-sm text-neutral-600 font-semibold">Showing spaces near you</p>
      )}
      <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-x-hidden">
        {sortedListings.map((item) => (
          <ListingCard key={item.id} data={item} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
}

export default ListingFeed;
