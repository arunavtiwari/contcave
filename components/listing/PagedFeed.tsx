import ListingFeed from "@/components/listing/ListingFeed";
import Pagination from "@/components/ui/Pagination";
import type { BrowseSort } from "@/lib/listing/browseSort";
import { FEED_ANCHOR } from "@/lib/listing/feedPages";
import type { SearchParams } from "@/lib/pagination";
import type { StudioFeedPage } from "@/types/listing";
import type { SafeUser } from "@/types/user";

type Props = {
  feed: StudioFeedPage;
  order?: BrowseSort;
  currentUser?: SafeUser | null;
  nearLabel?: string;
  page: number;
  path: string;
  searchParams?: SearchParams;
};

export default function PagedFeed({ feed, order, currentUser, nearLabel, page, path, searchParams }: Props) {
  return (
    <div className="space-y-12">
      <ListingFeed page={feed} order={order} currentUser={currentUser} nearLabel={nearLabel} />
      <Pagination page={page} totalPages={feed.totalPages} path={path} searchParams={searchParams} anchor={FEED_ANCHOR} />
    </div>
  );
}
