"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useTransition } from "react";

type FilterNavigation = {
  navigate: (href: string) => void;
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
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);
  return useMemo(() => ({ navigate, refresh, isPending }), [navigate, refresh, isPending]);
}

export function FilterNavigationProvider({ children }: { children: ReactNode }) {
  const value = useTransitionNavigation();
  return <FilterNavigationContext.Provider value={value}>{children}</FilterNavigationContext.Provider>;
}

export function useFilterNavigation() {
  const local = useTransitionNavigation();
  return useContext(FilterNavigationContext) ?? local;
}
