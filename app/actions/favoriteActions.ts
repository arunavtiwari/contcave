"use server";

import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { UserService } from "@/lib/user/service";

const favoriteSchema = z.object({
    listingId: z.string().min(1),
});

/**
 * Enterprise Favorite Toggle Action.
 * Handles both Addition and Removal in a single atomic operation.
 */
export const toggleFavoriteAction = createAction(
    favoriteSchema,
    { requireAuth: true },
    async (data, { user }) => {
        const { listingId } = data;

        // Toggle favorite for the authenticated user
        const updatedUser = await UserService.toggleFavorite(user!.id, listingId);

        return {
            favoriteIds: updatedUser.favoriteIds,
            isFavorite: updatedUser.favoriteIds.includes(listingId)
        };
    }
);
