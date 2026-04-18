"use server";



import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { dayStatusSchema } from "@/schemas/dayStatus";

export async function getDayStatus(listingId: string, date: string) {
    try {
        if (!listingId || !date) return null;

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return null;

        const dayStatus = await prisma.dayStatus.findUnique({
            where: {
                listingId_date: { listingId, date: parsedDate }
            },
        });

        return dayStatus;
    } catch (error: unknown) {
        console.error('[getDayStatus] Error:', error);
        return null;
    }
}

export async function updateDayStatus(data: {
    listingId: string;
    date: string;
    listingActive: boolean;
    startTime: string;
    endTime: string;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            throw new Error("Unauthorized");
        }

        const validation = dayStatusSchema.safeParse(data);
        if (!validation.success) {
            throw new Error(validation.error.issues[0].message);
        }

        const { listingId, date, listingActive, startTime, endTime } = validation.data;
        const parsedDate = new Date(date);

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });

        if (!listing) {
            throw new Error("Listing not found");
        }

        if (listing.userId !== currentUser.id) {
            throw new Error("Permission denied");
        }

        const dayStatus = await prisma.dayStatus.upsert({
            where: {
                listingId_date: { listingId, date: parsedDate },
            },
            update: {
                listingActive,
                startTime: startTime || "",
                endTime: endTime || "",
            },
            create: {
                listingId,
                date: parsedDate,
                listingActive,
                startTime: startTime || "",
                endTime: endTime || "",
            },
        });

        return dayStatus;
    } catch (error) {
        console.error('[updateDayStatus] Error:', error);
        throw error;
    }
}
