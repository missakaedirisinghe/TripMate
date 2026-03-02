"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { MapPin, Calendar, Wallet, Users, Compass, ChevronRight } from "lucide-react";

export default function CreateTripPage() {
    const [tripType, setTripType] = useState<string | null>(null);

    const tripTypes = [
        { id: "beach", label: "Beach Vibes", icon: "🌊" },
        { id: "cultural", label: "Cultural Heritage", icon: "🛕" },
        { id: "adventure", label: "Adventure & Hiking", icon: "⛰️" },
        { id: "wildlife", label: "Wildlife Safari", icon: "🐘" },
    ];

    const popularDestinations = [
        "Ella", "Mirissa", "Sigiriya", "Yala National Park", "Arugam Bay", "Kandy", "Galle"
    ];

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
                    >
                        Create New Trip
                    </motion.h1>
                    <p className="text-foreground/60 text-lg">Set up the foundations for your upcoming journey.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Form Area */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="p-6 md:p-8 border-border">
                            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>

                                {/* Destination */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <MapPin className="text-primary" /> Where to?
                                    </h3>
                                    <div className="relative">
                                        <select defaultValue="" className="flex h-12 w-full rounded-2xl border border-border bg-surface/50 px-4 py-2 text-sm appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all">
                                            <option value="" disabled>Select a Sri Lankan Destination</option>
                                            {popularDestinations.map(dest => (
                                                <option key={dest} value={dest}>{dest}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                                            <ChevronRight className="h-4 w-4 text-foreground/50 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Calendar className="text-secondary" /> When are you going?
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm text-foreground/60 px-1">Start Date</label>
                                            <Input type="date" className="h-12 bg-surface/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-foreground/60 px-1">End Date</label>
                                            <Input type="date" className="h-12 bg-surface/50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Trip Type */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Compass className="text-accent" /> What's the vibe?
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {tripTypes.map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setTripType(type.id)}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-sm font-medium
                          ${tripType === type.id
                                                        ? 'border-primary bg-primary/10 text-primary scale-[1.02] shadow-lg shadow-primary/20'
                                                        : 'border-border bg-surface/30 hover:bg-surface/60 hover:border-border/80 text-foreground/70'}`}
                                            >
                                                <span className="text-2xl">{type.icon}</span>
                                                <span>{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button size="lg" className="w-full text-lg h-14">
                                        Initialize Workspace
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Sidebar / Settings Area */}
                    <div className="lg:col-span-4 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="p-6 border-border">
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                    <Wallet className="text-primary" /> Max Budget (LKR)
                                </h3>
                                <p className="text-sm text-foreground/60 mb-4">
                                    Set a group limit. Our AI will help predict if your itinerary fits within this bounds.
                                </p>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50 font-medium">Rs.</span>
                                    <Input type="number" placeholder="100000" className="pl-12 h-12 text-lg font-semibold" />
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="p-6 border-border">
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                    <Users className="text-secondary" /> Invite Crew
                                </h3>
                                <p className="text-sm text-foreground/60 mb-4">
                                    Add their emails. They'll get an invite link to join this workspace.
                                </p>
                                <div className="space-y-3">
                                    <Input type="email" placeholder="friend@example.com" className="h-11" />
                                    <Button variant="secondary" className="w-full gap-2">
                                        <Users className="w-4 h-4" /> Send Invites
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
