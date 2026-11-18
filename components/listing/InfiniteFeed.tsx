"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";

import ListingFeed from "@/components/listing/ListingFeed";
import { type BrowseSort } from "@/lib/listing/browseSort";
import { type FeedLanding, feedRequestPath, mergeUnique, pageAtLine } from "@/lib/listing/feedRequest";
import { pagePath, type SearchParams } from "@/lib/pagination";
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

type Direction = "earlier" | "later";
type LoadedPage = { page: number; firstId: string };
type Status = "idle" | "loading" | "error";

const PREFETCH_MARGIN = "800px 0px";

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

/** Calls `onVisible` while the element is within `margin` of the viewport. */
function useInView(onVisible: () => void, enabled: boolean, margin = PREFETCH_MARGIN) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && onVisible(), { rootMargin: margin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible, enabled, margin]);
  return ref;
}

/**
 * Studios load as the visitor scrolls, both ways, and the address bar follows the page in view.
 * Every page is still its own server-rendered URL: the rel=prev/next links stay in the HTML for
 * crawlers, visually hidden, so nothing but studios shows on screen.
 */
export default function InfiniteFeed({ feed, page, path, searchParams, landing, order, currentUser, nearLabel }: Props) {
  const [items, setItems] = useState(feed.items);
  const [loaded, setLoaded] = useState<LoadedPage[]>(() => (feed.items[0] ? [{ page, firstId: feed.items[0].id }] : []));
  const [totalPages, setTotalPages] = useState(feed.totalPages);
  const [status, setStatus] = useState<Status>("idle");
  const [hasScrolled, setHasScrolled] = useState(false);
  const loadingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const heightBeforePrepend = useRef<number | null>(null);

  const firstPage = loaded[0]?.page ?? page;
  const lastPage = loaded.at(-1)?.page ?? page;
  const hasEarlier = firstPage > 1;
  const hasLater = lastPage < totalPages;

  const load = useCallback(async (direction: Direction) => {
    const target = direction === "earlier" ? firstPage - 1 : lastPage + 1;
    if (loadingRef.current || target < 1 || target > totalPages) return;
    loadingRef.current = true;
    setStatus("loading");
    try {
      const next = await fetchFeedPage(feedRequestPath(target, searchParams, landing));
      const first = next.items[0];
      if (direction === "earlier") heightBeforePrepend.current = document.documentElement.scrollHeight;
      setItems((shown) => mergeUnique(shown, next.items, direction === "earlier" ? "start" : "end"));
      if (first) {
        const entry = { page: target, firstId: first.id };
        setLoaded((pages) => (direction === "earlier" ? [entry, ...pages] : [...pages, entry]));
      }
      setTotalPages(first || direction === "earlier" ? next.totalPages : lastPage);
      setStatus("idle");
    } catch (error) {
      console.error("Failed to load studios", error);
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }, [firstPage, lastPage, totalPages, searchParams, landing]);

  const loadLater = useCallback(() => void load("later"), [load]);
  const loadEarlier = useCallback(() => void load("earlier"), [load]);
  // Earlier pages wait for the visitor to scroll, so landing on ?page=3 doesn't pull in pages 1-2 at once.
  const topRef = useInView(loadEarlier, status === "idle" && hasEarlier && hasScrolled, "200px 0px");
  const bottomRef = useInView(loadLater, status === "idle" && hasLater);

  // Studios added above the viewport push the page down; scroll by the same amount so nothing jumps.
  useLayoutEffect(() => {
    if (heightBeforePrepend.current === null) return;
    window.scrollBy(0, document.documentElement.scrollHeight - heightBeforePrepend.current);
    heightBeforePrepend.current = null;
  }, [items]);

  useEffect(() => {
    let frame = 0;
    let shownPage = page;
    const syncUrl = () => {
      const grid = gridRef.current;
      if (!grid || loaded.length < 2) return;
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
      setHasScrolled(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncUrl);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [loaded, page, path, searchParams]);

  return (
    <div className="[overflow-anchor:none]">
      {hasEarlier && (
        <>
          <a href={pagePath(path, firstPage - 1, searchParams)} rel="prev" className="sr-only">
            Earlier studios
          </a>
          <div ref={topRef} aria-hidden="true" />
        </>
      )}

      <div ref={gridRef}>
        <ListingFeed page={{ ...feed, items }} order={order} currentUser={currentUser} nearLabel={nearLabel} />
      </div>

      <div ref={bottomRef} aria-hidden="true" />
      {hasLater && (
        <a href={pagePath(path, lastPage + 1, searchParams)} rel="next" className="sr-only">
          More studios
        </a>
      )}

      <p role="status" className="sr-only">{status === "loading" ? "Loading studios" : ""}</p>
      {status === "error" && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load more studios.{" "}
          <button type="button" onClick={() => setStatus("idle")} className="min-h-11 font-medium text-foreground underline underline-offset-4">
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
