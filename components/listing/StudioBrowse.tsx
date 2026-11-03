import type { ReactNode } from "react";

import Container from "@/components/layout/Container";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import PendingFeed from "@/components/listing/PendingFeed";
import Categories from "@/components/navbar/Categories";
import { BrowseLocationProvider } from "@/hooks/useBrowseLocation";
import { FeedSummaryProvider } from "@/hooks/useFeedSummary";
import { FilterNavigationProvider } from "@/hooks/useFilterNavigation";
import type { BrowseLocation } from "@/lib/listing/browseLocation";

type Props = {
  feed: ReactNode;
  title?: string;
  city?: string;
  /** Resolved outside the feed's Suspense boundary so the controls render with the page. */
  initialLocation: BrowseLocation | null;
  isLoggedIn: boolean;
};

export default function StudioBrowse({ feed, title, city, initialLocation, isLoggedIn }: Props) {
  return (
    <main>
      <Container>
        <FilterNavigationProvider>
          <BrowseLocationProvider initialLocation={initialLocation} isLoggedIn={isLoggedIn}>
            <Categories city={city} />
            <FeedSummaryProvider>
              <ListingFeedHeader title={title} />
              <PendingFeed>{feed}</PendingFeed>
            </FeedSummaryProvider>
          </BrowseLocationProvider>
        </FilterNavigationProvider>
      </Container>
    </main>
  );
}
