"use server";

import { createAction } from "@/lib/actions-utils";
import { BillingService } from "@/lib/billing/service";
import { billingSchema } from "@/schemas/billing";

export const saveBillingInfo = createAction(
    billingSchema,
    { requireAuth: true },
    async (data, { user }) => await BillingService.upsertRecord(user.id, data)
);
