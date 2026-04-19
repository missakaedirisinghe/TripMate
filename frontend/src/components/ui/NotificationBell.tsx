/**
 * NotificationBell — In-app notification center component.
 *
 * Displays a bell icon with unread count badge, and a dropdown
 * panel showing recent notifications with mark-as-read actions.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, MapPin, Wallet, Calendar, Users, Vote, X } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import Link from "next/link";

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
    invite: Users,
    member_joined: Users,
    itinerary_change: Calendar,
    expense_added: Wallet,
    vote_cast: Vote,
    settlement: Wallet,
};

const NOTIFICATION_COLORS: Record<string, string> = {
    invite: "text-blue-400",
    member_joined: "text-green-400",
    itinerary_change: "text-amber-400",
    expense_added: "text-emerald-400",
    vote_cast: "text-purple-400",
    settlement: "text-cyan-400",
};

/** Format relative time (e.g. "2h ago", "just now") */
function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    /** Fetch unread count on mount and every 30 seconds */
    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await notificationsApi.unreadCount();
            setUnreadCount(res.unread_count);
        } catch {
            // Silently fail - user may not be authenticated
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    /** Fetch full notification list when panel opens */
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationsApi.list(1, 20);
            setNotifications(res.notifications);
        } catch {
            // Silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen, fetchNotifications]);

    /** Close panel on outside click */
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const handleMarkRead = async (id: string) => {
        try {
            await notificationsApi.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch {
            // Silently fail
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            // Silently fail
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                id="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors group"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-12 w-96 max-h-[480px] bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50 backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-white/50" />
                                </button>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="overflow-y-auto max-h-[380px] custom-scrollbar">
                            {loading ? (
                                <div className="p-8 text-center text-white/40 text-sm">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
                                    <p className="text-white/40 text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
                                    const iconColor = NOTIFICATION_COLORS[notif.type] || "text-white/60";

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`flex gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                                                !notif.is_read ? "bg-cyan-500/5" : ""
                                            }`}
                                            onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                                        >
                                            <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ${iconColor}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-tight ${notif.is_read ? "text-white/60" : "text-white font-medium"}`}>
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-white/30 mt-1">
                                                    {formatRelativeTime(notif.created_at)}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
