"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Calendar, Users, Wallet, ChevronRight, Activity, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { tripsApi, type Trip } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        tripsApi
            .list()
            .then((res) => setTrips(res.trips))
            .catch(() => setTrips([]))
            .finally(() => setLoading(false));
    }, [user, authLoading, router]);

    const totalBudget = trips.reduce((sum, t) => sum + (t.budget_limit || 0), 0);

    if (authLoading || loading) {
        return (
            <DashboardLayout>
                <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-10 h-10 rounded-full border-t-2 border-primary border-r-2 border-transparent"
                    />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
                        >
                            Welcome back, {user?.name?.split(" ")[0] || "Explorer"}
                        </motion.h1>
                        <p className="text-foreground/60 text-lg">
                            You have {trips.length} {trips.length === 1 ? "trip" : "trips"} planned.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Card className="px-6 py-4 flex items-center gap-4 bg-primary/10 border-primary/20">
                            <div className="p-3 bg-primary/20 rounded-full text-primary">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground/60">Total Budget Managed</p>
                                <p className="text-2xl font-bold text-foreground">
                                    LKR {totalBudget >= 1000 ? `${(totalBudget / 1000).toFixed(0)}k` : totalBudget}
                                </p>
                            </div>
                        </Card>
                        <button
                            onClick={logout}
                            className="p-3 rounded-xl border border-border hover:bg-surface/50 transition-colors text-foreground/60 hover:text-foreground"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: My Trips */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Active Trips</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {trips.map((trip, idx) => (
                                <motion.div
                                    key={trip.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Link href={`/trip/${trip.id}`}>
                                        <Card variant="interactive" className="h-full flex flex-col cursor-pointer">
                                            <div
                                                className="h-32 bg-cover bg-center relative"
                                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?q=80&w=800&auto=format&fit=crop')" }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                                                <div className="absolute bottom-3 left-4">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/10">
                                                        {trip.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="text-xl font-bold mb-1">{trip.title}</h3>
                                                <p className="text-sm text-foreground/60 mb-4">{trip.destination}</p>

                                                <div className="space-y-3 mb-6 flex-1">
                                                    {trip.start_date && (
                                                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                            <Calendar className="w-4 h-4 text-primary" />
                                                            {new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                            {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                        <Users className="w-4 h-4 text-secondary" /> {trip.member_count || 1} Explorers
                                                    </div>
                                                </div>

                                                {/* Budget Progress Bar */}
                                                {trip.budget_limit && (
                                                    <div className="space-y-2 mt-auto">
                                                        <div className="flex justify-between text-xs font-medium">
                                                            <span className="text-foreground/60">Budget</span>
                                                            <span className="text-foreground">
                                                                LKR {((trip.total_spent || 0) / 1000).toFixed(1)}k / {(trip.budget_limit / 1000).toFixed(1)}k
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(((trip.total_spent || 0) / trip.budget_limit) * 100, 100)}%` }}
                                                                transition={{ duration: 1, delay: 0.5 }}
                                                                className={`h-full rounded-full ${(trip.total_spent || 0) > trip.budget_limit * 0.9 ? 'bg-red-500' : 'bg-primary'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}

                            {/* Add New Trip Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Link href="/trip/create">
                                    <Card variant="interactive" className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 border-dashed border-2 border-border/50 bg-transparent hover:bg-surface/30 cursor-pointer">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                            <ChevronRight className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">Plan a New Adventure</h3>
                                        <p className="text-sm text-center text-foreground/60">Use AI to discover locations or build your own itinerary.</p>
                                    </Card>
                                </Link>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Column: Quick Actions */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold">Quick Actions</h2>
                        <Card className="p-6 bg-gradient-to-br from-surface to-background border-border">
                            <div className="space-y-3">
                                <Link href="/trip/create" className="w-full text-left px-4 py-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors text-sm font-medium flex items-center justify-between">
                                    Plan a New Trip <ChevronRight className="w-4 h-4 text-foreground/50" />
                                </Link>
                                <button className="w-full text-left px-4 py-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors text-sm font-medium flex items-center justify-between">
                                    Explore Destinations <ChevronRight className="w-4 h-4 text-foreground/50" />
                                </button>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
