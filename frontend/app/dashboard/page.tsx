"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Calendar, Users, Wallet, ChevronRight, Activity } from "lucide-react";

export default function DashboardPage() {
    const upcomingTrips = [
        {
            id: 1,
            title: "Southern Coast Surf Trip",
            destination: "Mirissa & Weligama",
            dates: "Oct 12 - 19, 2026",
            budget: 85000,
            spent: 24000,
            members: 4,
            status: "Planning",
            image: "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?q=80&w=800&auto=format&fit=crop",
        },
        {
            id: 2,
            title: "Highland Retreat",
            destination: "Ella & Nuwara Eliya",
            dates: "Dec 05 - 10, 2026",
            budget: 50000,
            spent: 48000,
            members: 2,
            status: "Ready",
            image: "https://images.unsplash.com/photo-1620619767323-b95a89183081?q=80&w=800&auto=format&fit=crop",
        },
    ];

    const recentActivity = [
        { id: 1, user: "Alex", action: "voted for Ella as destination.", time: "2 hours ago" },
        { id: 2, user: "Sarah", action: "added a new expense: Train Tickets.", time: "5 hours ago" },
        { id: 3, user: "You", action: "invited Mark to Southern Coast Surf Trip.", time: "1 day ago" },
    ];

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
                            Welcome back, Jane
                        </motion.h1>
                        <p className="text-foreground/60 text-lg">You have 2 upcoming trips this year.</p>
                    </div>

                    <div className="flex gap-4">
                        {/* Animated Counters could go here, simplified to cards for now */}
                        <Card className="px-6 py-4 flex items-center gap-4 bg-primary/10 border-primary/20">
                            <div className="p-3 bg-primary/20 rounded-full text-primary">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground/60">Total Budget Managed</p>
                                <p className="text-2xl font-bold text-foreground">LKR 135k</p>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: My Trips */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Active Trips</h2>
                            <button className="text-primary hover:underline text-sm font-medium">View All</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {upcomingTrips.map((trip, idx) => (
                                <motion.div
                                    key={trip.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card variant="interactive" className="h-full flex flex-col">
                                        <div
                                            className="h-32 bg-cover bg-center relative"
                                            style={{ backgroundImage: `url('${trip.image}')` }}
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
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <Calendar className="w-4 h-4 text-primary" /> {trip.dates}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <Users className="w-4 h-4 text-secondary" /> {trip.members} Explorers
                                                </div>
                                            </div>

                                            {/* Budget Progress Bar */}
                                            <div className="space-y-2 mt-auto">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-foreground/60">Budget</span>
                                                    <span className="text-foreground">LKR {(trip.spent / 1000).toFixed(1)}k / {(trip.budget / 1000).toFixed(1)}k</span>
                                                </div>
                                                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(trip.spent / trip.budget) * 100}%` }}
                                                        transition={{ duration: 1, delay: 0.5 }}
                                                        className={`h-full rounded-full ${trip.spent > trip.budget * 0.9 ? 'bg-red-500' : 'bg-primary'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Add New Trip Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card variant="interactive" className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 border-dashed border-2 border-border/50 bg-transparent hover:bg-surface/30">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <ChevronRight className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Plan a New Adventure</h3>
                                    <p className="text-sm text-center text-foreground/60">Use AI to discover locations or build your own itinerary.</p>
                                </Card>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Column: Recent Activity */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold">Recent Activity</h2>
                        <Card className="p-6">
                            <div className="space-y-6">
                                {recentActivity.map((activity, idx) => (
                                    <div key={activity.id} className="flex gap-4 relative">
                                        {idx !== recentActivity.length - 1 && (
                                            <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border" />
                                        )}
                                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 z-10">
                                            <Activity className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-foreground/90">
                                                <span className="font-semibold text-foreground">{activity.user}</span> {activity.action}
                                            </p>
                                            <p className="text-xs text-foreground/50 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="p-6 bg-gradient-to-br from-surface to-background border-border">
                            <h3 className="font-bold mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button className="w-full text-left px-4 py-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors text-sm font-medium flex items-center justify-between">
                                    Explore Destinations <ChevronRight className="w-4 h-4 text-foreground/50" />
                                </button>
                                <button className="w-full text-left px-4 py-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors text-sm font-medium flex items-center justify-between">
                                    Calculate Fuel Costs <ChevronRight className="w-4 h-4 text-foreground/50" />
                                </button>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
