"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ListingCard from "@/components/listing/ListingCard";
import { useLocationSort } from "@/hooks/useLocationSort";
import { getListingLatLng, haversineDistance } from "@/lib/geo";
import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function ListingFeed({ listings, currentUser }: Props) {
  const [sortedListings, setSortedListings] = useState(listings);
  const { setSortedByLocation, registerPrioritize } = useLocationSort();

  const listingsRef = useRef(listings);

  useEffect(() => {
    listingsRef.current = listings;
    setSortedListings(listings);
    setSortedByLocation(false);
  }, [listings, setSortedByLocation]);

  const prioritizeListings = useCallback((userLat: number, userLng: number) => {
    const baseline = listingsRef.current.map((listing: safeListing, index: number) => {
      const listingCoords = getListingLatLng(listing);
      const distance = listingCoords
        ? haversineDistance(userLat, userLng, listingCoords[0], listingCoords[1])
        : Number.POSITIVE_INFINITY;
      return { listing, index, distance };
    });

    baseline.sort((a: { distance: number; index: number }, b: { distance: number; index: number }) => {
      if (a.distance === b.distance) {
        return a.index - b.index;
      }
      return a.distance - b.distance;
    });

    const hasAnyDistance = baseline.some((item: { distance: number }) => Number.isFinite(item.distance));
    if (hasAnyDistance) {
      setSortedListings(baseline.map((item: { listing: safeListing }) => item.listing));
      setSortedByLocation(true);
    }
  }, [setSortedByLocation]);

  // Register prioritize function in context
  useEffect(() => {
    registerPrioritize(prioritizeListings);
  }, [registerPrioritize, prioritizeListings]);

  return (
    <div className="space-y-6">

      <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 overflow-x-hidden">
        {sortedListings.map((item: safeListing) => (
          <ListingCard key={item.id} data={item} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
}

export default ListingFeed;

