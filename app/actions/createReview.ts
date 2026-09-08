"use server";

import { createAction } from "@/lib/actions-utils";
import { ReviewService } from "@/lib/review/service";
import { createReviewSchema } from "@/schemas/review";

const createReview = createAction(
    createReviewSchema,
    { requireAuth: true },
    async (data, { user }) => {
        return await ReviewService.createReview(user.id, data);
    }
);

export default createReview;
