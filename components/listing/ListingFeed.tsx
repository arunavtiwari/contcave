"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadMoreStudios } from "@/app/actions/studioFeedActions";
import ListingCard from "@/components/listing/ListingCard";
import Button from "@/components/ui/Button";
import { useLocationSort } from "@/hooks/useLocationSort";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem, StudioFeedPage } from "@/types/listing";
import type { SafeUser } from "@/types/user";

const PREFETCH_MARGIN = "600px";
const LOADING_PLACEHOLDERS = 4;

type Props = {
  page: StudioFeedPage;
  filters: StudioFeedFilters;
  currentUser?: SafeUser | null;
  nearLabel?: string;
};

type LoadState = "idle" | "loading" | "error";

const appendUnique = (current: StudioFeedItem[], next: StudioFeedItem[]) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
};

function ListingFeed({ page, filters, currentUser, nearLabel }: Props) {
  const [items, setItems] = useState(page.items);
  const [cursor, setCursor] = useState(page.nextCursor);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { setNearLabel } = useLocationSort();

  useEffect(() => {
    setNearLabel(nearLabel ?? null);
  }, [nearLabel, setNearLabel]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoadState("loading");
    try {
      const result = await loadMoreStudios({ filters, origin: page.origin, cursor });
      if (!result.success || !result.data) throw new Error(result.error);
      const next = result.data;
      setItems((current) => appendUnique(current, next.items));
      setCursor(next.nextCursor);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden">
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
        <div ref={sentinelRef} className="flex flex-col items-center gap-3">
          {loadState === "error" && (
            <p role="status" className="text-sm text-muted-foreground">
              We couldn&apos;t load more studios.
            </p>
          )}
          <Button
            outline
            fit
            label={loadState === "error" ? "Retry" : "Load more studios"}
            loading={loadState === "loading"}
            onClick={() => void loadMore()}
          />
        </div>
      )}
    </div>
  );
}

export default ListingFeed;
