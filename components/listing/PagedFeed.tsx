import InfiniteFeed from "@/components/listing/InfiniteFeed";
import type { BrowseSort } from "@/lib/listing/browseSort";
import type { FeedLanding } from "@/lib/listing/feedRequest";
import { pagePath, type SearchParams } from "@/lib/pagination";
import type { StudioFeedPage } from "@/types/listing";
import type { SafeUser } from "@/types/user";

type Props = {
  feed: StudioFeedPage;
  order?: BrowseSort;
  currentUser?: SafeUser | null;
  nearLabel?: string;
  page: number;
  path: string;
  searchParams: SearchParams;
  landing?: FeedLanding;
};

export default function PagedFeed(props: Props) {
  // A new filter, sort or starting page is a new feed: remount so scroll state starts fresh.
  return <InfiniteFeed key={pagePath(props.path, props.page, props.searchParams)} {...props} />;
}
