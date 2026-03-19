"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, Users, Plus, Trash2, Search,
    ArrowRight, Filter
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { tripsApi, type Trip } from "@/lib/api";

type FilterStatus = "all" | "planning" | "active" | "completed";

export default function MyTripsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }
        tripsApi
            .list()
            .then((res) => setTrips(res.trips))
            .catch(() => router.push("/login"))
            .finally(() => setLoading(false));
    }, [user, authLoading, router]);

    /** Delete a trip and refresh. */
    const handleDelete = async (tripId: string) => {
        setDeletingId(tripId);
        try {
            await tripsApi.delete(tripId);
            setTrips((prev) => prev.filter((t) => t.id !== tripId));
        } catch {
            // Silently fail — trip may already be deleted
        } finally {
            setDeletingId(null);
        }
    };

    /** Filter trips by search and status. */
    const filteredTrips = trips.filter((trip) => {
        const matchesSearch =
            searchQuery === "" ||
            trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            filterStatus === "all" || trip.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const statusFilters: { label: string; value: FilterStatus }[] = [
        { label: "All Trips", value: "all" },
        { label: "Planning", value: "planning" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
    ];

    if (authLoading || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20" />
                        <p className="text-foreground/50">Loading trips...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">My Trips</h1>
                        <p className="text-foreground/60 mt-1">
                            {trips.length} trip{trips.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    <Link href="/trip/create">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> New Trip
                        </Button>
                    </Link>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
                        <Input
                            className="pl-10"
                            placeholder="Search by name or destination..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {statusFilters.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setFilterStatus(f.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === f.value
                                        ? "bg-primary text-white"
                                        : "bg-surface text-foreground/60 hover:text-foreground hover:bg-surface/80"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Trip Grid */}
                {filteredTrips.length === 0 ? (
                    <Card className="p-12 text-center">
                        <MapPin className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {trips.length === 0
                                ? "No trips yet"
                                : "No trips match your search"}
                        </h3>
                        <p className="text-foreground/50 mb-6">
                            {trips.length === 0
                                ? "Create your first trip and start planning!"
                                : "Try a different search term or filter."}
                        </p>
                        {trips.length === 0 && (
                            <Link href="/trip/create">
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" /> Create Trip
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredTrips.map((trip, i) => (
                                <motion.div
                                    key={trip.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card
                                        variant="interactive"
                                        className="p-6 flex flex-col gap-4 hover:border-primary/30 transition-all cursor-pointer group"
                                        onClick={() => router.push(`/trip/${trip.id}`)}
                                    >
                                        {/* Status badge */}
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${trip.status === "active"
                                                        ? "bg-green-500/15 text-green-400"
                                                        : trip.status === "completed"
                                                            ? "bg-blue-500/15 text-blue-400"
                                                            : "bg-yellow-500/15 text-yellow-400"
                                                    }`}
                                            >
                                                {trip.status}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(trip.id);
                                                }}
                                                disabled={deletingId === trip.id}
                                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-foreground/30 hover:text-red-400 transition-all"
                                                title="Delete trip"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Trip info */}
                                        <div>
                                            <h3 className="text-lg font-bold truncate">{trip.title}</h3>
                                            <div className="flex items-center gap-1.5 text-sm text-foreground/50 mt-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="truncate">{trip.destination}</span>
                                            </div>
                                        </div>

                                        {/* Meta row */}
                                        <div className="flex items-center gap-4 text-xs text-foreground/40 mt-auto pt-2 border-t border-border">
                                            {trip.start_date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(trip.start_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {trip.budget_limit != null && (
                                                <span className="flex items-center gap-1">
                                                    <Wallet className="w-3.5 h-3.5" />
                                                    LKR {trip.budget_limit.toLocaleString()}
                                                </span>
                                            )}
                                            {trip.member_count != null && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {trip.member_count}
                                                </span>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
