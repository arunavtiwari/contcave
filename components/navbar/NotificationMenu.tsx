"use client";

import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiBell, FiMessageSquare } from "react-icons/fi";

import Avatar from "@/components/ui/Avatar";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { SafeUser } from "@/types/user";

type Props = {
    currentUser?: SafeUser | null;
};

const NotificationMenu = memo(function NotificationMenu({ currentUser }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });

    const { notifications, totalUnreadCount, loading } = useNotifications(currentUser?.id);

    const toggleOpen = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const updateCoords = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + 12,
                    right: window.innerWidth - rect.right,
                });
            }
        };

        updateCoords();

        const handleClickOutside = (event: PointerEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !triggerRef.current?.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", handleClickOutside);
        window.addEventListener("resize", updateCoords);
        window.addEventListener("scroll", updateCoords, true);

        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
            window.removeEventListener("resize", updateCoords);
            window.removeEventListener("scroll", updateCoords, true);
        };
    }, [isOpen]);

    if (!currentUser) return null;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={toggleOpen}
                className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:bg-foreground/5 active:scale-95",
                    isOpen && "bg-foreground/5"
                )}
                aria-label="Notifications"
            >
                <FiBell size={20} className="text-foreground" />
                {totalUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                        {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                    </span>
                )}
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed rounded-2xl min-w-[320px] max-w-100 bg-background/80 backdrop-blur-xl overflow-hidden text-sm border border-border z-100001 shadow-2xl"
                            style={{
                                top: coords.top,
                                right: coords.right,
                            }}
                        >
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <h3 className="font-bold text-lg">Notifications</h3>
                                {totalUnreadCount > 0 && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {totalUnreadCount} new
                                    </span>
                                )}
                            </div>

                            <div className="max-h-112.5 overflow-y-auto">
                                {loading ? (
                                    <div className="p-10 text-center text-muted-foreground">
                                        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                                        <p>Loading...</p>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-10 text-center flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                            <FiMessageSquare size={24} className="text-muted-foreground" />
                                        </div>
                                        <p className="text-muted-foreground font-medium">No new messages</p>
                                        <p className="text-xs text-muted-foreground/60 max-w-50">
                                            When you get a message about your bookings, it will show up here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {notifications.map((notification) => (
                                            <Link
                                                key={notification.id}
                                                href={`/dashboard/chat?reservationId=${notification.id}`}
                                                onClick={closeMenu}
                                                className="flex items-start gap-4 p-4 hover:bg-foreground/5 transition-colors group"
                                            >
                                                <div className="relative shrink-0 mt-1">
                                                    <Avatar src={notification.image} />
                                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center ring-2 ring-background text-[10px]">
                                                        <FiMessageSquare size={10} />
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <span className="font-bold text-foreground truncate">
                                                            {notification.senderName}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">
                                                            {formatDistanceToNow(new Date(notification.updatedAt), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-foreground/80 font-medium truncate">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate mb-1 line-clamp-1 italic">
                                                        {notification.lastMessageText}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-5 px-1.5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                                                            {notification.unreadCount} new
                                                        </span>
                                                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                                            View chat →
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-muted/30 border-t border-border text-center">
                                <Link
                                    href="/dashboard/chat"
                                    onClick={closeMenu}
                                    className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    View all chats
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
});

NotificationMenu.displayName = "NotificationMenu";

export default NotificationMenu;
