import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useOptimistic } from "react";
import { toast } from "sonner";

import { toggleFavoriteAction } from "@/app/actions/favoriteActions";
import { SafeUser } from "@/types/user";

import useUIStore from "./useUIStore";

type Props = {
  listingId: string;
  currentUser?: SafeUser | null;
};

function useFavorite({ listingId, currentUser }: Props) {
  const router = useRouter();
  const uiStore = useUIStore();

  const serverFavorite = useMemo(() => {
    const list = currentUser?.favoriteIds || [];
    return list.includes(listingId);
  }, [currentUser, listingId]);

  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(
    serverFavorite,
    (_current: boolean, next: boolean) => next
  );

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();

      if (!currentUser) {
        return uiStore.onOpen("login");
      }

      React.startTransition(() => {
        setOptimisticFavorite(!optimisticFavorite);
      });

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
