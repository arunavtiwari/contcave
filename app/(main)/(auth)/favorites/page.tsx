import type { Metadata } from "next";

import FavoritesClient from "@/app/(main)/(auth)/favorites/FavoritesClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getFavoriteListings from "@/app/actions/getFavoriteListings";
import EmptyState from "@/components/EmptyState";
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

const FavoritePage = async () => {
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

  return <FavoritesClient listings={listings} currentUser={currentUser} />;
};

export default FavoritePage;
