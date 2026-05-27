import React from "react";

import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import Heading from "@/components/ui/Heading";

export default function FavoritesLoading() {
  return (
    <div className="space-y-8">
      <Heading title="Favorites" subtitle="List of places you favorited!" />
      <ListingGridSkeleton count={6} hideActions />
    </div>
  );
}
