"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useTransition } from "react";

type FilterNavigation = {
  /** Pushes a history entry, so Back undoes the change. */
  navigate: (href: string) => void;
  /** Swaps the current history entry - for tweaks Back shouldn't have to step through. */
  replace: (href: string) => void;
  refresh: () => void;
  isPending: boolean;
};

const FilterNavigationContext = createContext<FilterNavigation | null>(null);

function useTransitionNavigation(): FilterNavigation {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string) => startTransition(() => router.push(href, { scroll: false })),
    [router]
  );
  const replace = useCallback(
    (href: string) => startTransition(() => router.replace(href, { scroll: false })),
    [router]
  );
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);
  return useMemo(() => ({ navigate, replace, refresh, isPending }), [navigate, replace, refresh, isPending]);
}

export function FilterNavigationProvider({ children }: { children: ReactNode }) {
  const value = useTransitionNavigation();
  return <FilterNavigationContext.Provider value={value}>{children}</FilterNavigationContext.Provider>;
}

export function useFilterNavigation() {
  const local = useTransitionNavigation();
  return useContext(FilterNavigationContext) ?? local;
}
