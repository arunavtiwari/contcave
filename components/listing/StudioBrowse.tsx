import type { ReactNode } from "react";

import Container from "@/components/layout/Container";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import PendingFeed from "@/components/listing/PendingFeed";
import Categories from "@/components/navbar/Categories";
import { FilterNavigationProvider } from "@/hooks/useFilterNavigation";
import { LocationSortProvider } from "@/hooks/useLocationSort";

type Props = {
  feed: ReactNode;
  title?: string;
  city?: string;
  venueTypeHrefs?: Record<string, string>;
  activeVenueType?: string;
};

export default function StudioBrowse({ feed, title, city, venueTypeHrefs, activeVenueType }: Props) {
  return (
    <main>
      <Container>
        <FilterNavigationProvider>
          <Categories city={city} venueTypeHrefs={venueTypeHrefs} activeVenueType={activeVenueType} />
          <LocationSortProvider>
            <ListingFeedHeader title={title} />
            <PendingFeed>{feed}</PendingFeed>
          </LocationSortProvider>
        </FilterNavigationProvider>
      </Container>
    </main>
  );
}
