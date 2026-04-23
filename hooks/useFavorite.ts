import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
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

  const hasFavorite = useMemo(() => {
    const list = currentUser?.favoriteIds || [];

    return list.includes(listingId);
  }, [currentUser, listingId]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (!currentUser) {
        return uiStore.onOpen("login");
      }

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
    [currentUser, listingId, uiStore, router]
  );

  return {
    hasFavorite,
    toggleFavorite,
  };
}

export default useFavorite;
