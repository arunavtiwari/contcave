"use client";

import { useEffect } from "react";

import ListingCard from "@/components/listing/ListingCard";
import NoNearbyStudiosBanner from "@/components/listing/NoNearbyStudiosBanner";
import { useFeedSummary } from "@/hooks/useFeedSummary";
import { type BrowseSort, DEFAULT_BROWSE_SORT } from "@/lib/listing/browseSort";
import type { StudioFeedItem, StudioFeedPage } from "@/types/listing";
import type { SafeUser } from "@/types/user";

const PRIORITY_CARDS = 4;

type Props = {
  page: StudioFeedPage;
  currentUser?: SafeUser | null;
  nearLabel?: string;
  order?: BrowseSort;
};

function ListingFeed({ page, currentUser, nearLabel, order = DEFAULT_BROWSE_SORT }: Props) {
  const { setFeedSummary } = useFeedSummary();

  useEffect(() => {
    setFeedSummary({ nearLabel: nearLabel ?? null, total: page.total });
  }, [nearLabel, page.total, setFeedSummary]);

  // The closest studio on the page; under a non-distance order it may not be first.
  const nearest = page.items.reduce<StudioFeedItem | null>(
    (closest, item) =>
      typeof item.distanceKm === "number" && (closest?.distanceKm == null || item.distanceKm < closest.distanceKm)
        ? item
        : closest,
    null
  );

  return (
    <div className="space-y-8">
      <NoNearbyStudiosBanner nearestKm={page.nearestKm} nearestCity={nearest?.locationValue ?? null} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden">
        {page.items.map((item, index) => (
          <ListingCard
            key={item.id}
            data={item}
            currentUser={currentUser}
            priority={index < PRIORITY_CARDS}
            showListingBadge
            showDistance={order === "distance"}
          />
        ))}
      </div>
    </div>
  );
}

export default ListingFeed;
