import type { ReactNode } from "react";

import Container from "@/components/layout/Container";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import PendingFeed from "@/components/listing/PendingFeed";
import Categories from "@/components/navbar/Categories";
import { FilterNavigationProvider } from "@/hooks/useFilterNavigation";
import { NearLabelProvider } from "@/hooks/useNearLabel";
import { FEED_ANCHOR } from "@/lib/listing/feedPages";

type Props = {
  feed: ReactNode;
  hero?: ReactNode;
  guide?: ReactNode;
  city?: string;
  venueTypeHrefs?: Record<string, string>;
  activeVenueType?: string;
};

export default function StudioBrowse({ feed, hero, guide, city, venueTypeHrefs, activeVenueType }: Props) {
  return (
    <main>
      <Container>
        <FilterNavigationProvider>
          {hero}
          <Categories city={city} venueTypeHrefs={venueTypeHrefs} activeVenueType={activeVenueType} />
          <NearLabelProvider>
            {!hero && <ListingFeedHeader />}
            <div id={FEED_ANCHOR} className="scroll-mt-28 pb-24">
              <PendingFeed>{feed}</PendingFeed>
            </div>
          </NearLabelProvider>
        </FilterNavigationProvider>
      </Container>
      {guide}
    </main>
  );
}
