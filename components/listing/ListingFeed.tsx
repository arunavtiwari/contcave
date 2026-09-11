"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ListingCard from "@/components/listing/ListingCard";
import { useLocationSort } from "@/hooks/useLocationSort";
import { getListingLatLng, haversineDistance } from "@/lib/geo";
import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";

const INITIAL_BATCH_SIZE = 12;
const BATCH_INCREMENT = 8;

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function ListingFeed({ listings, currentUser }: Props) {
  const [sortedListings, setSortedListings] = useState(listings);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { setSortedByLocation, registerPrioritize } = useLocationSort();
  const listingsRef = useRef(listings);

  useEffect(() => {
    listingsRef.current = listings;
    setSortedListings(listings);
    setSortedByLocation(false);
    setVisibleCount(INITIAL_BATCH_SIZE);
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

  useEffect(() => {
    registerPrioritize(prioritizeListings);
  }, [registerPrioritize, prioritizeListings]);

  const hasMore = visibleCount < sortedListings.length;

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, sortedListings.length));
        }
      },
      { rootMargin: "600px" }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMore, sortedListings.length]);

  return (
    <div className="space-y-6">
      <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden">
        {sortedListings.slice(0, visibleCount).map((item: safeListing, index: number) => (
          <ListingCard
            key={item.id}
            data={item}
            currentUser={currentUser}
            priority={index < 4}
            showListingBadge
          />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} className="h-1 w-full pointer-events-none" />}
    </div>
  );
}

export default ListingFeed;

