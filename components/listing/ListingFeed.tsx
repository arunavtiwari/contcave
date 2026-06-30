"use client";

import ListingCard from "@/components/listing/ListingCard";
import { safeListing } from "@/types/listing";
import { SafeUser } from "@/types/user";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

function ListingFeed({ listings, currentUser }: Props) {
  return (
    <div className="space-y-6">
      <div className="pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden">
        {listings.map((item: safeListing, index: number) => (
          <ListingCard
            key={item.id}
            data={item}
            currentUser={currentUser}
            priority={index < 4}
          />
        ))}
      </div>
    </div>
  );
}

export default ListingFeed;

