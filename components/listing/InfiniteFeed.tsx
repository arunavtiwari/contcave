"use client";

import Link from "next/link";
import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import ListingFeed from "@/components/listing/ListingFeed";
import { type BrowseSort } from "@/lib/listing/browseSort";
import { appendUnique, type FeedLanding, feedRequestPath, pageAtLine } from "@/lib/listing/feedRequest";
import { pagePath, type SearchParams } from "@/lib/pagination";
import { cn, isPlainClick } from "@/lib/utils";
import type { StudioFeedItem, StudioFeedPage } from "@/types/listing";
import type { SafeUser } from "@/types/user";

type Props = {
  feed: StudioFeedPage;
  page: number;
  path: string;
  searchParams: SearchParams;
  landing?: FeedLanding;
  order?: BrowseSort;
  currentUser?: SafeUser | null;
  nearLabel?: string;
};

type LoadedPage = { page: number; firstId: string };
type Status = "idle" | "loading" | "error";

const PREFETCH_MARGIN = "800px 0px";
const LINK_CLASS = "inline-flex min-h-11 items-center justify-center rounded-full bg-muted px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted/70";

const feedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(z.object({ id: z.string() }).passthrough()), totalPages: z.number().int().nonnegative() }),
});

async function fetchFeedPage(href: string) {
  const response = await fetch(href, { cache: "no-store" });
  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  const { data } = feedResponseSchema.parse(await response.json());
  // The schema checks the envelope and ids; the items come from our own toStudioFeedItem.
  return { items: data.items as StudioFeedItem[], totalPages: data.totalPages };
}

export default function InfiniteFeed({ feed, page, path, searchParams, landing, order, currentUser, nearLabel }: Props) {
  const [items, setItems] = useState(feed.items);
  const [loaded, setLoaded] = useState<LoadedPage[]>(() => (feed.items[0] ? [{ page, firstId: feed.items[0].id }] : []));
  const [totalPages, setTotalPages] = useState(feed.totalPages);
  const [status, setStatus] = useState<Status>("idle");
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLAnchorElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const lastPage = loaded.at(-1)?.page ?? page;
  const hasMore = lastPage < totalPages;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setStatus("loading");
    const nextPage = lastPage + 1;
    try {
      const next = await fetchFeedPage(feedRequestPath(nextPage, searchParams, landing));
      setItems((shown) => appendUnique(shown, next.items));
      const first = next.items[0];
      setTotalPages(first ? next.totalPages : lastPage);
      if (first) setLoaded((pages) => [...pages, { page: nextPage, firstId: first.id }]);
      setStatus("idle");
    } catch (error) {
      console.error("Failed to load more studios", error);
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, lastPage, searchParams, landing]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || status !== "idle") return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && void loadMore(), { rootMargin: PREFETCH_MARGIN });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, status]);

  useEffect(() => {
    if (loaded.length < 2) return;
    let frame = 0;
    let shownPage = page;
    const syncUrl = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const starts = loaded.flatMap(({ page: number, firstId }) => {
        const card = grid.querySelector(`[data-feed-id="${firstId}"]`);
        return card ? [{ page: number, top: card.getBoundingClientRect().top }] : [];
      });
      const current = pageAtLine(starts, window.innerHeight / 2);
      if (current === null || current === shownPage) return;
      shownPage = current;
      window.history.replaceState(null, "", pagePath(path, current, searchParams));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncUrl);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [loaded, page, path, searchParams]);

  const onShowMore = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    void loadMore();
  };

  return (
    <div className="space-y-10">
      {page > 1 && (
        <div className="flex justify-center">
          <Link href={pagePath(path, page - 1, searchParams)} rel="prev" className={LINK_CLASS}>
            Show earlier studios
          </Link>
        </div>
      )}

      <div ref={gridRef}>
        <ListingFeed page={{ ...feed, items }} order={order} currentUser={currentUser} nearLabel={nearLabel} />
      </div>

      {hasMore && (
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          {status === "error" && <p className="text-sm text-muted-foreground">Couldn&apos;t load more studios.</p>}
          <a
            ref={sentinelRef}
            href={pagePath(path, lastPage + 1, searchParams)}
            rel="next"
            onClick={onShowMore}
            aria-busy={status === "loading"}
            className={cn(LINK_CLASS, status === "loading" && "pointer-events-none opacity-60")}
          >
            {status === "loading" ? "Loading studios…" : status === "error" ? "Try again" : "Show more studios"}
          </a>
        </div>
      )}
    </div>
  );
}
