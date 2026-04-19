/**
 * useSocket — Custom React hook for Socket.IO real-time collaboration.
 *
 * Manages connection lifecycle, trip room membership, and event listeners.
 * Authenticates via JWT token on connect.
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000";

interface UseSocketOptions {
    /** Trip ID to join the room for */
    tripId: string;
    /** Called when itinerary data is updated by another user */
    onItineraryUpdate?: (data: Record<string, unknown>) => void;
    /** Called when expense data is updated by another user */
    onExpenseUpdate?: (data: Record<string, unknown>) => void;
    /** Called when a vote is cast or retracted by another user */
    onVoteUpdate?: (data: Record<string, unknown>) => void;
    /** Called when a member joins or leaves */
    onMemberUpdate?: (data: Record<string, unknown>) => void;
    /** Called when trip details are updated */
    onTripUpdate?: (data: Record<string, unknown>) => void;
    /** Called when a settlement is recorded */
    onSettlementUpdate?: (data: Record<string, unknown>) => void;
}

interface UseSocketReturn {
    /** Whether the socket is connected */
    isConnected: boolean;
    /** List of users currently in the trip room */
    onlineUsers: string[];
}

export function useSocket({
    tripId,
    onItineraryUpdate,
    onExpenseUpdate,
    onVoteUpdate,
    onMemberUpdate,
    onTripUpdate,
    onSettlementUpdate,
}: UseSocketOptions): UseSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    // Store callbacks in refs to avoid re-creating the socket on callback changes
    const callbacksRef = useRef({
        onItineraryUpdate,
        onExpenseUpdate,
        onVoteUpdate,
        onMemberUpdate,
        onTripUpdate,
        onSettlementUpdate,
    });

    useEffect(() => {
        callbacksRef.current = {
            onItineraryUpdate,
            onExpenseUpdate,
            onVoteUpdate,
            onMemberUpdate,
            onTripUpdate,
            onSettlementUpdate,
        };
    });

    useEffect(() => {
        const token = getToken();
        if (!token || !tripId) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            // Join the trip room
            socket.emit("join_trip", { trip_id: tripId, token });
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        socket.on("connect_error", () => {
            setIsConnected(false);
        });

        // User presence events
        socket.on("user_joined", (data: { user_id: string; user_name: string }) => {
            setOnlineUsers((prev) => [...new Set([...prev, data.user_name])]);
            callbacksRef.current.onMemberUpdate?.(data);
        });

        // Real-time data events
        socket.on("itinerary_updated", (data: Record<string, unknown>) => {
            callbacksRef.current.onItineraryUpdate?.(data);
        });

        socket.on("expense_updated", (data: Record<string, unknown>) => {
            callbacksRef.current.onExpenseUpdate?.(data);
        });

        socket.on("vote_updated", (data: Record<string, unknown>) => {
            callbacksRef.current.onVoteUpdate?.(data);
        });

        socket.on("member_joined", (data: Record<string, unknown>) => {
            callbacksRef.current.onMemberUpdate?.(data);
        });

        socket.on("member_removed", (data: Record<string, unknown>) => {
            callbacksRef.current.onMemberUpdate?.(data);
        });

        socket.on("trip_updated", (data: Record<string, unknown>) => {
            callbacksRef.current.onTripUpdate?.(data);
        });

        socket.on("settlement_recorded", (data: Record<string, unknown>) => {
            callbacksRef.current.onSettlementUpdate?.(data);
        });

        return () => {
            socket.emit("leave_trip", { trip_id: tripId });
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setOnlineUsers([]);
        };
    }, [tripId]);

    return { isConnected, onlineUsers };
}
