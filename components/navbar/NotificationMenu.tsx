"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { memo, useCallback, useRef, useState } from "react";
import { FiBell, FiMessageSquare } from "react-icons/fi";

import MenuPanel from "@/components/navbar/MenuPanel";
import Avatar from "@/components/ui/Avatar";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import Skeleton from "@/components/ui/Skeleton";
import { useDismiss } from "@/hooks/useDismiss";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { SafeUser } from "@/types/user";

type Props = {
    currentUser?: SafeUser | null;
};

const NotificationMenu = memo(function NotificationMenu({ currentUser }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const { notifications, totalUnreadCount, loading } = useNotifications(currentUser?.id);

    const toggleOpen = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    useDismiss(menuRef, isOpen, closeMenu);

    if (!currentUser) return null;

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={toggleOpen}
                className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:bg-muted cursor-pointer",
                    isOpen && "bg-foreground/5"
                )}
                aria-label="Notifications"
            >
                <FiBell size={20} className="text-foreground" />
                {totalUnreadCount > 0 && (
                    <Pill
                        label={totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                        variant="destructive"
                        size="xs"
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center ring-2 ring-background p-0 rounded-full"
                    />
                )}
            </button>

            <MenuPanel open={isOpen} className="min-w-[320px] sm:min-w-[360px] max-w-100">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <Heading title="Notifications" variant="h5" />
                    {totalUnreadCount > 0 && (
                        <Pill label={`${totalUnreadCount} new`} variant="secondary" size="xs" />
                    )}
                </div>

                <div className="max-h-112.5 overflow-y-auto">
                    {loading ? (
                        <div className="divide-y divide-border/50">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-start gap-4 p-4">
                                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="flex justify-between items-center">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-3/4" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                </div>
                            ))}
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
                                    href={`/dashboard/chat/${notification.id}`}
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
                                            <Pill label={`${notification.unreadCount} new`} variant="solid" size="xs" />
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
            </MenuPanel>
        </div>
    );
});

NotificationMenu.displayName = "NotificationMenu";

export default NotificationMenu;
