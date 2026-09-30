import type { ReactNode } from "react";

import Container from "@/components/layout/Container";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import Categories from "@/components/navbar/Categories";
import { LocationSortProvider } from "@/hooks/useLocationSort";

type Props = {
  feed: ReactNode;
  title?: string;
  city?: string;
  children?: ReactNode;
};

export default function StudioBrowse({ feed, title, city, children }: Props) {
  return (
    <main>
      <Container>
        <Categories city={city} />
        <LocationSortProvider>
          <ListingFeedHeader title={title} />
          {feed}
        </LocationSortProvider>
        {children && <div className="flex flex-col gap-12 pb-24">{children}</div>}
      </Container>
    </main>
  );
}
