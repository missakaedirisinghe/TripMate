"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MapPin, Wallet, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { recommendApi, type RecommendationResult } from "@/lib/api";

interface AIPlannerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    tripId?: string;
}

export function AIPlannerPanel({ isOpen, onClose, tripId }: AIPlannerPanelProps) {
    const [query, setQuery] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<null | {
        feasibility: string;
        feasibilityColor: string;
        budgetEstimate: string;
        route: RecommendationResult["recommended_route"];
    }>(null);
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        if (!query) return;
        setIsGenerating(true);
        setError("");

        // Parse activities from natural language query
        const activityKeywords = ["surfing", "hiking", "diving", "snorkeling", "whale watching",
            "cultural", "temple", "wildlife", "safari", "beach", "waterfall", "camping", "cycling"];
        const activities = activityKeywords.filter(a => query.toLowerCase().includes(a));
        if (activities.length === 0) activities.push("sightseeing"); // fallback

        // Parse destination hints
        const destKeywords = ["Ella", "Mirissa", "Sigiriya", "Yala", "Arugam Bay", "Kandy", "Galle", "Nuwara Eliya", "Trincomalee"];
        const bucketList = destKeywords.filter(d => query.toLowerCase().includes(d.toLowerCase()));

        try {
            // Try real recommendation API
            const recResult = await recommendApi.getRecommendations({ activities, bucket_list: bucketList });

            // Also get cost estimation
            const costResult = await recommendApi.estimateCost({
                destination: bucketList[0] || "Sri Lanka",
                duration_days: recResult.route_count || 3,
                num_travelers: 2,
                vehicle_type: "car",
                accommodation_type: "mid-range",
            });

            setResult({
                feasibility: "High",
                feasibilityColor: "text-green-500",
                budgetEstimate: `LKR ${costResult.estimation.total.toLocaleString()}`,
                route: recResult.recommended_route,
            });
        } catch {
            // Fallback: use cost estimation only (ML model may not be loaded)
            try {
                const costResult = await recommendApi.estimateCost({
                    destination: bucketList[0] || "Sri Lanka",
                    duration_days: 3,
                    num_travelers: 2,
                    vehicle_type: "car",
                    accommodation_type: "mid-range",
                });

                setResult({
                    feasibility: "Medium",
                    feasibilityColor: "text-yellow-500",
                    budgetEstimate: `LKR ${costResult.estimation.total.toLocaleString()}`,
                    route: bucketList.map((name, i) => ({
                        name,
                        lat: 7.0 + i * 0.5,
                        lng: 80.0 + i * 0.3,
                    })),
                });
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "AI service is temporarily unavailable");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                    />

                    {/* Slide-in Drawer */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-gradient-to-b from-surface/95 to-background border-l border-border/50 shadow-2xl backdrop-blur-3xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-surface/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">AI Trip Planner</h2>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-foreground/70 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-8">

                            {/* Input Section */}
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-foreground/80">
                                    Describe your ideal Sri Lankan trip:
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="We want a 3-day trip focused on hiking and waterfalls with a budget around 50k..."
                                        className="w-full min-h-[120px] rounded-2xl border border-border bg-background p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none transition-all placeholder:text-foreground/40"
                                    />
                                </div>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!query || isGenerating}
                                    className="w-full gap-2 relative overflow-hidden group"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isGenerating ? "Analyzing Patterns..." : "Generate Itinerary"}
                                        {!isGenerating && <ArrowRight className="w-4 h-4" />}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </Button>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Loading State */}
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                        className="w-12 h-12 rounded-full border-t-2 border-primary border-r-2 border-transparent"
                                    />
                                    <p className="text-sm font-medium text-foreground/60 animate-pulse">Running recommendation models...</p>
                                </div>
                            )}

                            {/* Results Section */}
                            {result && !isGenerating && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6 pb-6"
                                >
                                    {/* Metrics */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-surface/50 border border-border/50">
                                            <div className="flex items-center gap-2 mb-2 text-foreground/60">
                                                <Activity className="w-4 h-4" /> Feasibility
                                            </div>
                                            <p className={`text-xl font-bold ${result.feasibilityColor}`}>{result.feasibility}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-surface/50 border border-border/50">
                                            <div className="flex items-center gap-2 mb-2 text-foreground/60">
                                                <Wallet className="w-4 h-4" /> Est. Cost
                                            </div>
                                            <p className="text-xl font-bold text-foreground">{result.budgetEstimate}</p>
                                        </div>
                                    </div>

                                    {/* Route */}
                                    <div>
                                        <h3 className="text-sm font-bold tracking-wider uppercase text-foreground/50 mb-4 flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> Suggested Route
                                        </h3>
                                        <div className="space-y-4 relative pl-4 border-l-2 border-border/50 ml-2">
                                            {result.route.map((place, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                                                    <h4 className="font-bold text-foreground mb-1">Stop {idx + 1}: {place.name}</h4>
                                                    {place.rating && <p className="text-sm text-foreground/70">Rating: {place.rating}/5</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button variant="secondary" className="w-full">
                                        Apply to Workspace
                                    </Button>
                                </motion.div>
                            )}

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
