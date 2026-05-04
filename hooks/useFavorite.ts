import { useRouter } from "next/navigation";
import { useCallback, useMemo, useOptimistic } from "react";
import { toast } from "sonner";

import { toggleFavoriteAction } from "@/app/actions/favoriteActions";
import { SafeUser } from "@/types/user";

import useUIStore from "./useUIStore";

type Props = {
  listingId: string;
  currentUser?: SafeUser | null;
};

/**
 * Custom hook for managing favorite state with optimistic UI.
 * Uses React 19's `useOptimistic` for instant visual feedback
 * before the server action completes.
 */
function useFavorite({ listingId, currentUser }: Props) {
  const router = useRouter();
  const uiStore = useUIStore();

  const serverFavorite = useMemo(() => {
    const list = currentUser?.favoriteIds || [];
    return list.includes(listingId);
  }, [currentUser, listingId]);

  // React 19: useOptimistic for instant heart toggle
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(
    serverFavorite,
    (_current: boolean, next: boolean) => next
  );

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (!currentUser) {
        return uiStore.onOpen("login");
      }

      // Optimistically toggle immediately
      setOptimisticFavorite(!optimisticFavorite);

      try {
        const response = await toggleFavoriteAction({ listingId });

        if (!response.success) {
          toast.error(response.error || "Failed to update favorites", {
            id: "Favorites_Error"
          });
          return;
        }

        router.refresh();
        toast.success(
          response.data?.isFavorite ? "Added to favourites" : "Removed from favourites",
          { id: "Favorites" }
        );
      } catch (_error: unknown) {
        toast.error("Something Went Wrong", {
          id: "Favorites_Error_Unknown"
        });
      }
    },
    [currentUser, listingId, uiStore, router, optimisticFavorite, setOptimisticFavorite]
  );

  return {
    hasFavorite: optimisticFavorite,
    toggleFavorite,
  };
}

export default useFavorite;
