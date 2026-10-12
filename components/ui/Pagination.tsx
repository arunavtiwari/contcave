"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import { pagePath, paginationRange, type SearchParams } from "@/lib/pagination";
import { cn, isPlainClick } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  path: string;
  searchParams?: SearchParams;
  anchor?: string;
};

const ITEM = "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-3 text-sm font-medium transition-colors select-none md:h-10 md:min-w-10";
const STEP = cn(ITEM, "bg-muted");

export default function Pagination({ page, totalPages, path, searchParams, anchor }: Props) {
  const { navigate } = useFilterNavigation();
  if (totalPages <= 1) return null;

  const pageLink = (target: number) => {
    const href = pagePath(path, target, searchParams);
    return {
      href: anchor ? `${href}#${anchor}` : href,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        navigate(href);
        if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    };
  };

  const step = (target: number, text: string, rel: "prev" | "next", icon: ReactNode) => {
    const content = rel === "prev"
      ? <>{icon}<span className="hidden sm:inline">{text}</span></>
      : <><span className="hidden sm:inline">{text}</span>{icon}</>;
    if (target < 1 || target > totalPages) {
      return <span aria-disabled="true" className={cn(STEP, "text-muted-foreground/50")}>{content}</span>;
    }
    return (
      <Link {...pageLink(target)} rel={rel} aria-label={`${text} page`} className={cn(STEP, "text-foreground hover:bg-muted/70")}>
        {content}
      </Link>
    );
  };

  const pageItem = (item: number | null, index: number) => {
    if (item === null) return <span key={`gap-${index}`} aria-hidden="true" className={cn(ITEM, "px-1 text-muted-foreground")}>…</span>;
    if (item === page) return <span key={item} aria-current="page" className={cn(ITEM, "bg-foreground font-semibold text-background")}>{item}</span>;
    return (
      <Link key={item} {...pageLink(item)} aria-label={`Page ${item}`} className={cn(ITEM, "text-foreground hover:bg-muted")}>
        {item}
      </Link>
    );
  };

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1.5">
      {step(page - 1, "Prev", "prev", <FiChevronLeft size={16} />)}
      {paginationRange(page, totalPages).map(pageItem)}
      {step(page + 1, "Next", "next", <FiChevronRight size={16} />)}
    </nav>
  );
}
