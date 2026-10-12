"use client";

import { useEffect } from "react";

import ListingCard from "@/components/listing/ListingCard";
import { useNearLabel } from "@/hooks/useNearLabel";
import type { StudioFeedItem } from "@/types/listing";
import type { SafeUser } from "@/types/user";

const PRIORITY_CARDS = 4;

type Props = {
  items: StudioFeedItem[];
  currentUser?: SafeUser | null;
  nearLabel?: string;
};

function ListingFeed({ items, currentUser, nearLabel }: Props) {
  const { setNearLabel } = useNearLabel();

  useEffect(() => {
    setNearLabel(nearLabel ?? null);
  }, [nearLabel, setNearLabel]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden">
      {items.map((item, index) => (
        <ListingCard
          key={item.id}
          data={item}
          currentUser={currentUser}
          priority={index < PRIORITY_CARDS}
          showListingBadge
        />
      ))}
    </div>
  );
}

export default ListingFeed;
