"use server";

import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createAction } from "@/lib/actions-utils";
import { parseSavedSearchLocation } from "@/lib/listing/searchLocation";
import prisma from "@/lib/prismadb";

/** Saves (or clears) the browsing location on the signed-in user's profile. Guests keep it in the cookie only. */
export const saveSearchLocationAction = createAction(
    z.object({
        location: z.object({
            label: z.string().trim().min(1).max(120),
            lat: z.number(),
            lng: z.number(),
            region: z.string().max(60).nullable(),
        }).nullable(),
    }),
    {},
    async ({ location }) => {
        const user = await getCurrentUser();
        if (!user) return { saved: false };
        const parsed = location ? parseSavedSearchLocation(location) : null;
        if (location && !parsed) return { saved: false };
        await prisma.user.update({
            where: { id: user.id },
            data: { searchLocation: parsed ? { set: parsed } : { unset: true } },
        });
        return { saved: true };
    }
);
