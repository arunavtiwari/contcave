"use server";

import Ably from "ably";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getAblyApiKey } from "@/lib/ably-server";
import { getClientIp } from "@/lib/http/requestMeta";
import prisma from "@/lib/prismadb";
import { ACTIVE_RESERVATION_STATUSES, isChatReadOnly } from "@/lib/reservation/status";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Resets the unread count for the current user in a specific reservation chat.
 */
export async function markAsRead(reservationId: string) {
    try {
        if (!/^[a-f\d]{24}$/i.test(reservationId)) return { success: false, error: "Invalid reservation" };
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
            await prisma.reservation.updateMany({
                where: { id: reservationId, lastMessageAt: reservation.lastMessageAt },
                data: { unreadCountOwner: 0 }
            });
        } else if (isGuest) {
            await prisma.reservation.updateMany({
                where: { id: reservationId, lastMessageAt: reservation.lastMessageAt },
                data: { unreadCountGuest: 0 }
            });
        } else return { success: false, error: "Reservation not found" };

        revalidatePath("/dashboard/chat");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[markAsRead] Error:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function sendChatMessage(reservationId: string, text: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Not authenticated" };
        if (!/^[a-f\d]{24}$/i.test(reservationId)) return { success: false, error: "Invalid reservation" };

        const messageLimit = rateLimit({
            key: `chat-message:${currentUser.id}:${reservationId}:${getClientIp(await headers())}`,
            limit: 30,
            windowMs: 60_000,
        });
        if (!messageLimit.allowed) return { success: false, error: "Too many messages. Please wait a moment." };

        const trimmed = text.trim();
        if (!trimmed) return { success: false, error: "Message is required" };
        if (trimmed.length > 2000) return { success: false, error: "Message is too long" };

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { listing: { select: { userId: true } } }
        });

        if (!reservation) return { success: false, error: "Reservation not found" };
        const isOwner = reservation.listing.userId === currentUser.id;
        const isGuest = reservation.userId === currentUser.id;
        if (!isOwner && !isGuest) return { success: false, error: "Unauthorized" };
        if (isChatReadOnly(reservation.status)) return { success: false, error: "This chat is read-only because the booking is complete." };

        const recipientId = isOwner ? reservation.userId : reservation.listing.userId;
        const message = await prisma.$transaction(async (tx) => {
            const updated = await tx.reservation.updateMany({
                where: { id: reservationId, status: { in: ACTIVE_RESERVATION_STATUSES } },
                data: {
                    lastMessageText: trimmed,
                    lastMessageAt: new Date(),
                    ...(isOwner
                        ? { unreadCountGuest: { increment: 1 } }
                        : { unreadCountOwner: { increment: 1 } }),
                },
            });
            if (updated.count !== 1) throw new Error("Chat became read-only");

            return await tx.reservationChatMessage.create({
                data: {
                    reservationId,
                    senderId: currentUser.id,
                    kind: "USER",
                    text: trimmed,
                },
                select: { id: true, createdAt: true },
            });
        });

        const ablyApiKey = getAblyApiKey();
        if (ablyApiKey) {
            const ably = new Ably.Rest({ key: ablyApiKey });
            await Promise.allSettled([
                ably.channels.get(`chat:${reservationId}`).publish("chat", {
                    id: message.id,
                    text: trimmed,
                    senderId: currentUser.id,
                    email: currentUser.email || currentUser.id,
                    name: currentUser.name || "User",
                    timestamp: message.createdAt.toISOString(),
                }),
                ably.channels.get(`notifications:${recipientId}`).publish("new_message", { reservationId }),
            ]);
        }

        revalidatePath("/dashboard/chat");

        return {
            success: true,
            data: {
                id: message.id,
                text: trimmed,
                senderId: currentUser.id,
                email: currentUser.email || currentUser.id,
                name: currentUser.name || "User",
                timestamp: message.createdAt.toISOString(),
            }
        };
    } catch (error) {
        console.error("[sendChatMessage] Error:", error);
        if (error instanceof Error && error.message === "Chat became read-only") {
            return { success: false, error: "This chat is read-only." };
        }
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
                markedForDeletion: false,
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
