import React from "react";

import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import Heading from "@/components/ui/Heading";

export default function PropertiesLoading() {
  return (
    <div className="space-y-8">
      <Heading title="My Properties" subtitle="Efficiently Manage, Update, and Showcase Your Listings with Ease." />
      <ListingGridSkeleton count={6} />
    </div>
  );
}
