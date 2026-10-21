import type { ReactNode } from "react";

import Container from "@/components/layout/Container";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import PendingFeed from "@/components/listing/PendingFeed";
import Categories from "@/components/navbar/Categories";
import { FilterNavigationProvider } from "@/hooks/useFilterNavigation";
import { NearLabelProvider } from "@/hooks/useNearLabel";

type Props = {
  feed: ReactNode;
  title?: string;
  city?: string;
};

export default function StudioBrowse({ feed, title, city }: Props) {
  return (
    <main>
      <Container>
        <FilterNavigationProvider>
          <Categories city={city} />
          <NearLabelProvider>
            <ListingFeedHeader title={title} />
            <PendingFeed>{feed}</PendingFeed>
          </NearLabelProvider>
        </FilterNavigationProvider>
      </Container>
    </main>
  );
}
