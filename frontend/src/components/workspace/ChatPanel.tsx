"use client";

/**
 * ChatPanel — Real-time group chat for trip workspace.
 *
 * Features: message history with pagination, live Socket.IO updates,
 * auto-scroll, user avatars, and timestamps.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { chatApi, type ChatMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ChatPanelProps {
    tripId: string;
    /** External new messages from Socket.IO */
    newMessage?: ChatMessage | null;
}

export function ChatPanel({ tripId, newMessage }: ChatPanelProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /** Load initial messages */
    useEffect(() => {
        const load = async () => {
            try {
                const res = await chatApi.getMessages(tripId, 1);
                setMessages(res.messages);
                setHasMore(res.has_more);
                setPage(1);
            } catch {
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [tripId]);

    /** Auto-scroll to bottom on new messages */
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    /** Handle incoming Socket.IO message */
    useEffect(() => {
        if (newMessage) {
            setMessages(prev => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
        }
    }, [newMessage]);

    /** Load older messages */
    const loadMore = useCallback(async () => {
        if (!hasMore) return;
        const nextPage = page + 1;
        try {
            const res = await chatApi.getMessages(tripId, nextPage);
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueNew = res.messages.filter(m => !existingIds.has(m.id));
                return [...uniqueNew, ...prev];
            });
            setHasMore(res.has_more);
            setPage(nextPage);
        } catch {
        }
    }, [tripId, page, hasMore]);

    /** Send a message */
    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput("");

        try {
            const res = await chatApi.sendMessage(tripId, text);
            setMessages(prev => {
                if (prev.some(m => m.id === res.message.id)) return prev;
                return [...prev, res.message];
            });
        } catch {
            setInput(text);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    /** Format timestamp to relative */
    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return "just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
            >
                {/* Load More */}
                {hasMore && (
                    <button
                        onClick={loadMore}
                        className="w-full text-xs text-primary hover:text-primary/80 py-2 transition-colors"
                    >
                        Load older messages...
                    </button>
                )}

                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-foreground/30 gap-3">
                        <MessageSquare className="w-12 h-12" />
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                            >
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                                    isMe 
                                        ? "bg-primary/20 text-primary" 
                                        : "bg-secondary/20 text-secondary"
                                }`}>
                                    {msg.user_avatar ? (
                                        <img src={msg.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        msg.user_name?.charAt(0)?.toUpperCase() || "?"
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                                        <span className="text-xs font-semibold text-foreground/70">
                                            {isMe ? "You" : msg.user_name || "Unknown"}
                                        </span>
                                        <span className="text-[10px] text-foreground/30">
                                            {formatTime(msg.created_at)}
                                        </span>
                                    </div>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                        isMe
                                            ? "bg-primary text-white rounded-tr-md"
                                            : "bg-surface border border-border/50 text-foreground rounded-tl-md"
                                    }`}>
                                        {msg.message}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Input Bar */}
            <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-xl p-3">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Send a message..."
                        className="flex-1 h-10 rounded-full bg-surface border border-border/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-foreground/30"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
