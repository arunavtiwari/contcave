"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type Origin = { lat: number; lng: number };

function sortByNearest(listings: safeListing[], { lat, lng }: Origin) {
  const ranked = listings
    .map((listing, index) => {
      const coords = getListingLatLng(listing);
      return { listing, index, distance: coords ? haversineDistance(lat, lng, coords[0], coords[1]) : Infinity };
    })
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  return ranked.some((item) => Number.isFinite(item.distance)) ? ranked.map((item) => item.listing) : null;
}

function ListingFeed({ listings, currentUser }: Props) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [prevListings, setPrevListings] = useState(listings);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { setSortedByLocation, registerPrioritize } = useLocationSort();

  if (listings !== prevListings) {
    setPrevListings(listings);
    setOrigin(null);
    setVisibleCount(INITIAL_BATCH_SIZE);
  }

  const nearestFirst = useMemo(() => (origin ? sortByNearest(listings, origin) : null), [listings, origin]);
  const sortedListings = nearestFirst ?? listings;

  useEffect(() => {
    setSortedByLocation(nearestFirst !== null);
  }, [nearestFirst, setSortedByLocation]);

  const prioritizeListings = useCallback((lat: number, lng: number) => setOrigin({ lat, lng }), []);

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

