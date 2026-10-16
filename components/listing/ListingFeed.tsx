"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadMoreStudios } from "@/app/actions/studioFeedActions";
import ListingCard from "@/components/listing/ListingCard";
import Button from "@/components/ui/Button";
import { useNearLabel } from "@/hooks/useNearLabel";
import { studioFeedKey } from "@/lib/listing/studioFeedKey";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem, StudioFeedPage } from "@/types/listing";
import type { SafeUser } from "@/types/user";

const PREFETCH_MARGIN = "600px";
const LOADING_PLACEHOLDERS = 4;
const MAX_REMEMBERED_FEEDS = 10;

type Props = {
  page: StudioFeedPage;
  filters: StudioFeedFilters;
  currentUser?: SafeUser | null;
  nearLabel?: string;
};

type LoadState = "idle" | "loading" | "error";

type LoadedFeed = { items: StudioFeedItem[]; cursor: string | null };

const loadedFeeds = new Map<string, LoadedFeed>();

const rememberFeed = (key: string, feed: LoadedFeed) => {
  loadedFeeds.delete(key);
  loadedFeeds.set(key, feed);
  const oldest = loadedFeeds.keys().next().value;
  if (loadedFeeds.size > MAX_REMEMBERED_FEEDS && oldest !== undefined) loadedFeeds.delete(oldest);
};

const appendUnique = (current: StudioFeedItem[], next: StudioFeedItem[]) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
};

function ListingFeed({ page, filters, currentUser, nearLabel }: Props) {
  const feedKey = page.nextCursor ? studioFeedKey(filters, page.origin) : null;
  const [{ items, cursor }, setFeed] = useState<LoadedFeed>(
    () => (feedKey && loadedFeeds.get(feedKey)) || { items: page.items, cursor: page.nextCursor }
  );
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { setNearLabel } = useNearLabel();

  useEffect(() => {
    setNearLabel(nearLabel ?? null);
  }, [nearLabel, setNearLabel]);

  useEffect(() => {
    if (feedKey) rememberFeed(feedKey, { items, cursor });
  }, [feedKey, items, cursor]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoadState("loading");
    try {
      const result = await loadMoreStudios({ filters, origin: page.origin, cursor });
      if (!result.success || !result.data) throw new Error(result.error);
      const next = result.data;
      setFeed((current) => ({ items: appendUnique(current.items, next.items), cursor: next.nextCursor }));
      setLoadState("idle");
    } catch {
      setLoadState("error");
    } finally {
      loadingRef.current = false;
    }
  }, [cursor, filters, page.origin]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor || loadState !== "idle") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: PREFETCH_MARGIN }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadState, loadMore]);

  return (
    <div className="space-y-8 pb-24">
      <div
        aria-busy={loadState === "loading"}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden"
      >
        {items.map((item, index) => (
          <ListingCard
            key={item.id}
            data={item}
            currentUser={currentUser}
            priority={index < 4}
            showListingBadge
          />
        ))}
        {loadState === "loading" &&
          Array.from({ length: LOADING_PLACEHOLDERS }, (_, index) => (
            <ListingCard key={`loading-${index}`} isLoading hideActions />
          ))}
      </div>

      {cursor && (
        <div ref={sentinelRef} className="flex min-h-1 w-full flex-col items-center gap-3">
          {loadState === "error" && (
            <>
              <p role="status" className="text-sm text-muted-foreground">
                We couldn&apos;t load more studios.
              </p>
              <Button outline fit label="Retry" onClick={() => void loadMore()} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ListingFeed;
