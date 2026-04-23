import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

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
        let request;

        if (hasFavorite) {
          request = () => axios.delete(`/api/favorites/${listingId}`);
        } else {
          request = () => axios.post(`/api/favorites/${listingId}`);
        }

        await request();
        router.refresh();
        toast.success(hasFavorite ? "Removed from favourites" : "Added to favourites", {
          id: "Favorites"
        });
      } catch (_error: unknown) {
        toast.error("Something Went Wrong", {
          id: "Favorites_Error_1"
        });
      }
    },
    [currentUser, hasFavorite, listingId, uiStore, router]
  );

  return {
    hasFavorite,
    toggleFavorite,
  };
}

export default useFavorite;
