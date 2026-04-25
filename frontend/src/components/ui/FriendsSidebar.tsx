"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, UserPlus, Check, XCircle } from "lucide-react";
import { friendsApi, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { io, Socket } from "socket.io-client";

interface FriendsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FriendsSidebar({ isOpen, onClose }: FriendsSidebarProps) {
    const { user, token } = useAuth();
    const [friends, setFriends] = useState<{ id: string; user: User; status: "accepted" }[]>([]);
    const [pendingSent, setPendingSent] = useState<{ id: string; user: User; status: "pending" }[]>([]);
    const [pendingReceived, setPendingReceived] = useState<{ id: string; user: User; status: "pending" }[]>([]);
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!isOpen || !user) return;
        fetchFriends();
    }, [isOpen, user]);
    
    useEffect(() => {
        if (!token || !isOpen) return;
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000";
        const newSocket = io(socketUrl, { auth: { token } });
        
        newSocket.on("connect", () => {
            newSocket.emit("get_online_friends");
        });
        
        newSocket.on("online_friends_list", (data: { online_user_ids: string[] }) => {
            setOnlineUserIds(data.online_user_ids);
        });
        
        newSocket.on("friend_presence", (data: { user_id: string; status: string }) => {
            if (data.status === "online") {
                setOnlineUserIds(prev => [...new Set([...prev, data.user_id])]);
            } else {
                setOnlineUserIds(prev => prev.filter(id => id !== data.user_id));
            }
        });
        
        return () => {
            newSocket.disconnect();
        };
    }, [token, isOpen]);

    const fetchFriends = async () => {
        try {
            const data = await friendsApi.list();
            setFriends(data.friends || []);
            setPendingSent(data.pending_sent || []);
            setPendingReceived(data.pending_received || []);
        } catch (e) {}
    };

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setLoading(true);
        try {
            await friendsApi.sendRequest(inviteEmail);
            setInviteEmail("");
            fetchFriends();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await friendsApi.acceptRequest(id);
            fetchFriends();
        } catch (e) { }
    };

    const handleRemove = async (id: string) => {
        try {
            await friendsApi.remove(id);
            fetchFriends();
        } catch (e) { }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />
                    
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        className="fixed right-0 top-0 bottom-0 w-80 bg-surface/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-[70] flex flex-col"
                    >
                        <div className="p-5 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <span className="font-bold tracking-tight">Friends</span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5 text-foreground/80" />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-border/50">
                            <form onSubmit={handleSendRequest} className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="friend@example.com"
                                    className="flex-1 h-9 px-3 rounded-lg bg-background/50 border-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <button type="submit" disabled={loading} className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30">
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                            {/* Pending Requests To Me */}
                            {pendingReceived.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold uppercase text-foreground/50">Incoming Requests</h4>
                                    {pendingReceived.map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/40">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">
                                                    {req.user.name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium">{req.user.name}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleAccept(req.id)} className="w-7 h-7 rounded bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleRemove(req.id)} className="w-7 h-7 rounded bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* My Friends */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase text-foreground/50">My Network</h4>
                                {friends.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && (
                                    <p className="text-xs text-foreground/40 text-center py-4">You haven't added any friends yet.</p>
                                )}
                                {friends.map(f => {
                                    const isOnline = onlineUserIds.includes(f.user.id);
                                    return (
                                        <div key={f.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                        {f.user.name.charAt(0)}
                                                    </div>
                                                    {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-surface rounded-full" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{f.user.name}</span>
                                                    <span className="text-[10px] text-foreground/40">{isOnline ? 'Online' : 'Offline'}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemove(f.id)} 
                                                className="w-7 h-7 rounded text-foreground/30 hover:text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
