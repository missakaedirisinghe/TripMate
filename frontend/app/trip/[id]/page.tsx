"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AIPlannerPanel } from "@/components/workspace/AIPlannerPanel";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, Users, ChevronDown, Check, Plus, ArrowRight, Share2, Sparkles
} from "lucide-react";

export default function TripWorkspacePage({ params }: { params: { id: string } }) {
    const [activeTab, setActiveTab] = useState("itinerary");
    const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "itinerary", label: "Itinerary" },
        { id: "expenses", label: "Expenses" },
        { id: "members", label: "Members" },
    ];

    const itineraryDays = [
        {
            day: 1,
            date: "Oct 12",
            activities: [
                { time: "Morning", title: "Surfing at Weligama Bay", cost: "LKR 5,000", category: "Adventure" },
                { time: "Afternoon", title: "Lunch & Chill at Tiki Bar", cost: "LKR 3,500", category: "Food" },
            ]
        },
        {
            day: 2,
            date: "Oct 13",
            activities: [
                { time: "Morning", title: "Whale Watching in Mirissa", cost: "LKR 12,000", category: "Nature" },
            ]
        }
    ];

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">

            {/* Left Area: Workspace (Tabs & Content) */}
            <div className="w-full md:w-[50%] lg:w-[45%] flex flex-col h-full border-r border-border bg-surface/30 relative z-10 shadow-2xl">

                {/* Header Banner */}
                <div
                    className="h-48 shrink-0 relative flex flex-col justify-end p-6"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?q=80&w=800&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="relative z-10 flex justify-between items-end">
                        <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white mb-2">
                                <MapPin className="w-3 h-3" /> Southern Coast
                            </span>
                            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Mirissa Surf Trip</h1>
                        </div>
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex justify-center items-center text-xs font-bold text-white shadow-sm ring-2 ring-transparent hover:z-10 transition-transform hover:scale-110 cursor-pointer">
                                    U{i}
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface flex justify-center items-center text-xs text-foreground hover:bg-surface/80 cursor-pointer transition-colors shadow-sm">
                                <Plus className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workspace Nav & Summary */}
                <div className="shrink-0 p-6 pb-0 space-y-4 shadow-sm z-10 bg-background/80 backdrop-blur-xl">
                    <div className="flex justify-between items-center text-sm font-medium text-foreground/70">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-primary" /> Oct 12 - 19</span>
                            <span className="flex items-center gap-1"><Wallet className="w-4 h-4 text-secondary" /> LKR 85k</span>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsAIPlannerOpen(true)} variant="primary" size="sm" className="h-8 gap-2 bg-gradient-to-r from-primary to-secondary shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                <Sparkles className="w-4 h-4" /> Ask AI
                            </Button>
                            <Button variant="secondary" size="sm" className="h-8 gap-2"><Share2 className="w-4 h-4" /> Invite</Button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 border-b border-border">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 text-sm font-medium transition-colors relative
                   ${activeTab === tab.id ? 'text-primary' : 'text-foreground/60 hover:text-foreground'}`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "itinerary" && (
                                <div className="space-y-6">
                                    {itineraryDays.map((day) => (
                                        <div key={day.day} className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                                                    {day.day}
                                                </div>
                                                <h3 className="font-bold text-lg">{day.date}</h3>
                                            </div>
                                            <div className="pl-4 ml-4 border-l-2 border-border/50 space-y-4 py-2">
                                                {day.activities.map((act, i) => (
                                                    <Card key={i} variant="interactive" className="p-4 bg-surface/50 hover:bg-surface/80 border-border/50 flex gap-4">
                                                        <div className="w-16 h-16 rounded-xl bg-background/50 flex items-center justify-center text-xs font-semibold text-foreground/50 shrink-0">
                                                            Image
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h4 className="font-bold">{act.title}</h4>
                                                                <span className="text-sm font-medium text-foreground/70">{act.cost}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-foreground/50">{act.time}</span>
                                                                <span className="px-2 py-1 rounded bg-secondary/10 text-secondary font-medium">{act.category}</span>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                                <button className="flex items-center gap-2 text-sm text-primary font-medium p-2 hover:bg-primary/10 rounded-lg transition-colors w-full border border-dashed border-primary/30 justify-center">
                                                    <Plus className="w-4 h-4" /> Add Activity
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === "overview" && <div className="text-foreground/60 text-center py-12">Overview content goes here.</div>}
                            {activeTab === "expenses" && <div className="text-foreground/60 text-center py-12">Expenses content goes here.</div>}
                            {activeTab === "members" && <div className="text-foreground/60 text-center py-12">Members content goes here.</div>}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Right Area: Interactive Map Visualization (Roadtrippers Style) */}
            <div className="hidden md:block flex-1 relative bg-surface">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 grayscale-[20%]"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop')" }}
                />
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />

                {/* Map Overlay Controls / Placeholder Elements */}
                <div className="absolute top-6 right-6">
                    <Card className="px-4 py-2 flex items-center gap-2 shadow-lg backdrop-blur-md bg-background/80 border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Map Sync Active
                    </Card>
                </div>

                {/* Example Map Markers */}
                <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", delay: 0.5 }}
                        className="relative group cursor-pointer"
                    >
                        <div className="w-6 h-6 rounded-full bg-primary border-4 border-background shadow-xl z-20 relative flex items-center justify-center" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-background text-foreground text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                            Weligama Bay
                        </div>
                    </motion.div>
                </div>
                <div className="absolute top-1/3 right-1/4 transform -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", delay: 0.7 }}
                        className="relative group cursor-pointer"
                    >
                        <div className="w-6 h-6 rounded-full bg-secondary border-4 border-background shadow-xl z-20 relative flex items-center justify-center" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-background text-foreground text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                            Mirissa Beach
                        </div>
                    </motion.div>
                </div>

                {/* Map Path Line Placeholder */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-10">
                    <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 1 }}
                        d="M 33% 50% L 75% 33%"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                        fill="none"
                    />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <AIPlannerPanel isOpen={isAIPlannerOpen} onClose={() => setIsAIPlannerOpen(false)} />
        </div>
    );
}
