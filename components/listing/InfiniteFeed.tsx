"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";

import ListingFeed from "@/components/listing/ListingFeed";
import { type BrowseSort } from "@/lib/listing/browseSort";
import { type FeedLanding, feedRequestPath, mergeUnique, pageAtLine } from "@/lib/listing/feedRequest";
import { type FeedAnchor, readFeedSnapshot, writeFeedSnapshot } from "@/lib/listing/feedSnapshot";
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
const SAVE_EVERY_MS = 250;
/** Frames to keep re-applying a restored position while images and late layout settle. */
const RESTORE_FRAMES = 30;
const RESTORE_GIVE_UP_MS = 2_000;

/** The first card still on screen, and its distance from the top of the viewport. */
function topCard(grid: HTMLElement | null): FeedAnchor | null {
  for (const card of grid?.querySelectorAll<HTMLElement>("[data-feed-id]") ?? []) {
    const { top, bottom } = card.getBoundingClientRect();
    if (bottom > 0 && card.dataset.feedId) return { id: card.dataset.feedId, offset: top };
  }
  return null;
}

/** Scrolls so the anchor card sits where it was; false while the card isn't rendered yet. */
function scrollToAnchor(grid: HTMLElement | null, anchor: FeedAnchor) {
  const card = grid?.querySelector(`[data-feed-id="${CSS.escape(anchor.id)}"]`);
  if (!card) return false;
  window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - anchor.offset);
  return true;
}

const currentUrl = () => `${window.location.pathname}${window.location.search}`;

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
  const [restoreAnchor, setRestoreAnchor] = useState<FeedAnchor | null>(null);
  const isRestoring = restoreAnchor !== null;
  const feedKey = `${pagePath(path, 1, searchParams)}|${landing?.place ?? ""}|${landing?.category ?? ""}`;

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
  const canLoad = status === "idle" && !isRestoring;
  const topRef = useInView(loadEarlier, canLoad && hasEarlier && hasScrolled, "200px 0px");
  const bottomRef = useInView(loadLater, canLoad && hasLater);

  // Coming back from a studio: show the studios that were loaded and return to the same spot, once.
  useEffect(() => {
    const snapshot = readFeedSnapshot<StudioFeedItem>(window.sessionStorage, feedKey, currentUrl());
    if (!snapshot) return;
    writeFeedSnapshot(window.sessionStorage, feedKey, { ...snapshot, returnPending: false });
    setRestoreAnchor(snapshot.anchor);
    setItems(snapshot.items);
    setLoaded(snapshot.loaded);
    setTotalPages(snapshot.totalPages);
    setHasScrolled(true);
  }, [feedKey]);

  // Studios added above the viewport push the page down; scroll by the same amount so nothing jumps.
  // Returning to the saved card: wait until it's rendered, then hold it in place for a few frames
  // (the browser's own scroll restoration and late layout can move the page), and let go the
  // moment the visitor scrolls.
  useLayoutEffect(() => {
    if (!restoreAnchor || !scrollToAnchor(gridRef.current, restoreAnchor)) return;
    let frames = 0;
    let frame = requestAnimationFrame(function hold() {
      scrollToAnchor(gridRef.current, restoreAnchor);
      if (++frames < RESTORE_FRAMES) frame = requestAnimationFrame(hold);
      else setRestoreAnchor(null);
    });
    const release = () => setRestoreAnchor(null);
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((name) => window.addEventListener(name, release, { once: true, passive: true }));
    return () => {
      cancelAnimationFrame(frame);
      events.forEach((name) => window.removeEventListener(name, release));
    };
  }, [restoreAnchor, items]);

  // If the saved card never renders (it was unpublished meanwhile), stop waiting and carry on.
  useEffect(() => {
    if (!restoreAnchor) return;
    const timer = window.setTimeout(() => setRestoreAnchor(null), RESTORE_GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [restoreAnchor]);

  // Studios added above the viewport push the page down; scroll by the same amount so nothing jumps.
  useLayoutEffect(() => {
    if (heightBeforePrepend.current === null) return;
    window.scrollBy(0, document.documentElement.scrollHeight - heightBeforePrepend.current);
    heightBeforePrepend.current = null;
  }, [items]);

  // The latest feed state and position, kept in refs so the save on leaving doesn't read the next
  // page's URL or scroll (the feed unmounts after navigation has already moved on).
  const stateRef = useRef({ items, loaded, totalPages });
  const positionRef = useRef<{ url: string; anchor: FeedAnchor | null }>({ url: "", anchor: null });
  const leavingToStudioRef = useRef(false);
  useEffect(() => {
    stateRef.current = { items, loaded, totalPages };
  }, [items, loaded, totalPages]);

  useEffect(() => {
    let lastSavedAt = 0;
    positionRef.current = { url: currentUrl(), anchor: topCard(gridRef.current) };
    const save = () => {
      lastSavedAt = Date.now();
      writeFeedSnapshot(window.sessionStorage, feedKey, {
        ...stateRef.current,
        ...positionRef.current,
        returnPending: leavingToStudioRef.current,
        savedAt: Date.now(),
      });
    };
    const onScroll = () => {
      // During navigation away, the next page's scrolling can arrive before the feed unmounts.
      if (window.location.pathname !== path) return;
      positionRef.current = { url: currentUrl(), anchor: topCard(gridRef.current) };
      if (Date.now() - lastSavedAt > SAVE_EVERY_MS) save();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [feedKey, path]);

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
      positionRef.current = { url: currentUrl(), anchor: topCard(grid) };
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

      <div
        ref={gridRef}
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest("a[href]")) leavingToStudioRef.current = true;
        }}
      >
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
