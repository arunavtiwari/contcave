import ListingFeed from "@/components/listing/ListingFeed";
import Pagination from "@/components/ui/Pagination";
import { FEED_ANCHOR } from "@/lib/listing/feedPages";
import type { SearchParams } from "@/lib/pagination";
import type { StudioFeedItem } from "@/types/listing";
import type { SafeUser } from "@/types/user";

type Props = {
  items: StudioFeedItem[];
  currentUser?: SafeUser | null;
  nearLabel?: string;
  page: number;
  totalPages: number;
  path: string;
  searchParams?: SearchParams;
};

export default function PagedFeed({ items, currentUser, nearLabel, page, totalPages, path, searchParams }: Props) {
  return (
    <div className="space-y-12">
      <ListingFeed items={items} currentUser={currentUser} nearLabel={nearLabel} />
      <Pagination page={page} totalPages={totalPages} path={path} searchParams={searchParams} anchor={FEED_ANCHOR} />
    </div>
  );
}
