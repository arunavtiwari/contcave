import type { Metadata } from "next";
import { Suspense } from "react";

import FavoritesClient from "@/app/(main)/dashboard/favorites/FavoritesClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getFavoriteListings from "@/app/actions/getFavoriteListings";
import EmptyState from "@/components/EmptyState";
import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import { safeListing } from "@/types/listing";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved Spaces",
  description: "Quickly access the studios and listings you've marked as favourites on ContCave.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

import Heading from "@/components/ui/Heading";

const FavoritePage = () => {
  return (
    <div className="space-y-8">
      <Heading title="Favorites" subtitle="List of places you favorited!" />
      <Suspense fallback={<ListingGridSkeleton count={6} hideActions />}>
        <FavoriteContent />
      </Suspense>
    </div>
  );
};

async function FavoriteContent() {
  const currentUser = await getCurrentUser();
  const listings = await getFavoriteListings();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No favorites found"
        subtitle="Looks like you have no favorite listings."
      />
    );
  }

  return <FavoritesClient listings={listings as unknown as safeListing[]} currentUser={currentUser} />;
}

export default FavoritePage;
