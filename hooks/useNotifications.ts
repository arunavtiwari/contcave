"use client";

import Ably from "ably";
import { useCallback, useEffect, useState } from "react";

import { getUnreadNotifications } from "@/lib/chat/actions";

export interface ChatNotification {
    id: string;
    title: string;
    image: string;
    unreadCount: number;
    senderName: string;
    lastMessageText: string;
    updatedAt: string;
}

export const useNotifications = (userId: string | undefined) => {
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await getUnreadNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        fetchNotifications();
        const ably = new Ably.Realtime({
            authUrl: "/api/notifications/token",
            authMethod: "POST",
            clientId: userId,
        });

        const channel = ably.channels.get(`notifications:${userId}`);

        const handleUpdate = () => {
            fetchNotifications();
        };

        channel.subscribe("new_message", handleUpdate);
        channel.subscribe("mark_as_read", handleUpdate);

        return () => {
            channel.unsubscribe();
            if (ably.connection.state !== "closed" && ably.connection.state !== "closing") {
                ably.close();
            }
        };
    }, [userId, fetchNotifications]);

    const totalUnreadCount = notifications.reduce((acc, n) => acc + n.unreadCount, 0);

    return {
        notifications,
        totalUnreadCount,
        loading,
        refresh: fetchNotifications,
    };
};
