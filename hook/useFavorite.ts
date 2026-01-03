import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "react-toastify";

import { SafeUser } from "@/types/user";

import useLoginModel from "./useLoginModal";

type Props = {
  listingId: string;
  currentUser?: SafeUser | null;
};

function useFavorite({ listingId, currentUser }: Props) {
  const router = useRouter();
  const loginModel = useLoginModel();

  const hasFavorite = useMemo(() => {
    const list = currentUser?.favoriteIds || [];

    return list.includes(listingId);
  }, [currentUser, listingId]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (!currentUser) {
        return loginModel.onOpen();
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
        toast.success("Success", {
          toastId: "Favorites"
        });
      } catch (_error: unknown) {
        toast.error("Something Went Wrong", {
          toastId: "Favorites_Error_1"
        });
      }
    },
    [currentUser, hasFavorite, listingId, loginModel, router]
  );

  return {
    hasFavorite,
    toggleFavorite,
  };
}

export default useFavorite;
