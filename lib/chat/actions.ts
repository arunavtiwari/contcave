"use server";

import { Prisma } from "@prisma/client";
import Ably from "ably";
import { revalidatePath } from "next/cache";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

/**
 * Resets the unread count for the current user in a specific reservation chat.
 */
export async function markAsRead(reservationId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { success: false, error: "Not authenticated" };

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { listing: { select: { userId: true } } }
        });

        if (!reservation) return { success: false, error: "Reservation not found" };

        const isOwner = reservation.listing.userId === currentUser.id;
        const isGuest = reservation.userId === currentUser.id;

        if (isOwner) {
            await prisma.reservation.update({
                where: { id: reservationId },
                data: { unreadCountOwner: 0 }
            });
        } else if (isGuest) {
            await prisma.reservation.update({
                where: { id: reservationId },
                data: { unreadCountGuest: 0 }
            });
        }

        revalidatePath("/dashboard/chat");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[markAsRead] Error:", error);
        return { success: false, error: "Internal server error" };
    }
}

/**
 * Increments the unread count for the recipient when a new message is sent.
 * Now also stores the last message snippet for previews.
 */
export async function incrementUnreadCount(reservationId: string, text?: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { success: false, error: "Not authenticated" };

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { listing: { select: { userId: true } } }
        });

        if (!reservation) return { success: false, error: "Reservation not found" };

        const isOwner = reservation.listing.userId === currentUser.id;
        const isGuest = reservation.userId === currentUser.id;

        const updateData: Prisma.ReservationUpdateInput = {
            lastMessageText: text || null,
            lastMessageAt: new Date()
        };

        // Increment for the RECIPIENT
        let recipientId: string | null = null;
        if (isOwner) {
            // Owner sent message, increment Guest count
            updateData.unreadCountGuest = { increment: 1 };
            recipientId = reservation.userId;
        } else if (isGuest) {
            // Guest sent message, increment Owner count
            updateData.unreadCountOwner = { increment: 1 };
            recipientId = reservation.listing.userId;
        }

        await prisma.reservation.update({
            where: { id: reservationId },
            data: updateData
        });

        // Notify recipient via Ably
        if (recipientId) {
            const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_CHAT_API;
            if (ablyApiKey) {
                const ably = new Ably.Rest({ key: ablyApiKey });
                const channel = ably.channels.get(`notifications:${recipientId}`);
                await channel.publish("new_message", { reservationId });
            }
        }

        revalidatePath("/dashboard/chat");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[incrementUnreadCount] Error:", error);
        return { success: false, error: "Internal server error" };
    }
}

/**
 * Fetches all reservations with unread counts for the current user.
 */
export async function getUnreadNotifications() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return [];

        const reservations = await prisma.reservation.findMany({
            where: {
                OR: [
                    { userId: currentUser.id, unreadCountGuest: { gt: 0 } },
                    { listing: { userId: currentUser.id }, unreadCountOwner: { gt: 0 } }
                ]
            },
            include: {
                listing: {
                    select: {
                        title: true,
                        imageSrc: true,
                        userId: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });

        // Note: The schema has 'user' which is the Guest. 
        // If current user is Owner, they see Guest info.
        // If current user is Guest, they see Owner info.

        return reservations.map(r => {
            const isOwner = r.listing.userId === currentUser.id;
            return {
                id: r.id,
                title: r.listing.title,
                image: r.listing.imageSrc[0],
                unreadCount: isOwner ? r.unreadCountOwner : r.unreadCountGuest,
                senderName: isOwner ? (r.user.name || "Guest") : "Host",
                lastMessageText: r.lastMessageText || "Sent a message",
                updatedAt: r.lastMessageAt ? r.lastMessageAt.toISOString() : r.updatedAt.toISOString()
            };
        });
    } catch (error) {
        console.error("[getUnreadNotifications] Error:", error);
        return [];
    }
}
