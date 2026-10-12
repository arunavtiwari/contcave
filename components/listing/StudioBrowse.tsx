import type { ReactNode } from "react";

import Container from "@/components/layout/Container";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import PendingFeed from "@/components/listing/PendingFeed";
import Categories from "@/components/navbar/Categories";
import { BrowseLocationProvider } from "@/hooks/useBrowseLocation";
import { FeedSummaryProvider } from "@/hooks/useFeedSummary";
import { FilterNavigationProvider } from "@/hooks/useFilterNavigation";
import type { BrowseLocation } from "@/lib/listing/browseLocation";
import { FEED_ANCHOR } from "@/lib/listing/feedPages";

type Props = {
  feed: ReactNode;
  hero?: ReactNode;
  guide?: ReactNode;
  title?: string;
  city?: string;
  /** Resolved outside the feed's Suspense boundary so the controls render with the page. */
  initialLocation: BrowseLocation | null;
  isLoggedIn: boolean;
};

export default function StudioBrowse({ feed, hero, guide, title, city, initialLocation, isLoggedIn }: Props) {
  return (
    <main>
      <Container>
        <FilterNavigationProvider>
          <BrowseLocationProvider initialLocation={initialLocation} isLoggedIn={isLoggedIn}>
            {hero}
            <Categories city={city} />
            <FeedSummaryProvider>
              <ListingFeedHeader title={hero ? null : title} />
              <div id={FEED_ANCHOR} className="scroll-mt-28 pb-24">
                <PendingFeed>{feed}</PendingFeed>
              </div>
            </FeedSummaryProvider>
          </BrowseLocationProvider>
        </FilterNavigationProvider>
      </Container>
      {guide}
    </main>
  );
}
