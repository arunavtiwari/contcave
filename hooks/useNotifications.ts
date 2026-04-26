"use client";

import { useCallback, useEffect, useState } from "react";

import { getAblyClient } from "@/lib/ably";
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

        const ably = getAblyClient(userId);
        if (!ably) return;

        const channel = ably.channels.get(`notifications:${userId}`);

        const handleUpdate = () => {
            fetchNotifications();
        };

        channel.subscribe("new_message", handleUpdate);
        channel.subscribe("mark_as_read", handleUpdate);

        return () => {
            channel.unsubscribe("new_message", handleUpdate);
            channel.unsubscribe("mark_as_read", handleUpdate);
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
