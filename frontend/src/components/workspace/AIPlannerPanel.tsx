"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MapPin, Wallet, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AIPlannerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AIPlannerPanel({ isOpen, onClose }: AIPlannerPanelProps) {
    const [query, setQuery] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<null | any>(null);

    const handleGenerate = () => {
        if (!query) return;
        setIsGenerating(true);
        // Simulate NLP model inference
        setTimeout(() => {
            setResult({
                feasibility: "High",
                feasibilityColor: "text-green-500",
                budgetEstimate: "LKR 45,000",
                itinerary: [
                    { day: 1, title: "Central Highlands Arrival", desc: "Train to Ella, Nine Arch Bridge" },
                    { day: 2, title: "Nature & Hiking", desc: "Little Adam's Peak, Ravana Falls" },
                    { day: 3, title: "Cultural Transition", desc: "Travel to Kandy, Temple of the Tooth" },
                ]
            });
            setIsGenerating(false);
        }, 1500);
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
                                    {/* Futuristic Button Glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </Button>
                            </div>

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

                                    {/* Structued Output */}
                                    <div>
                                        <h3 className="text-sm font-bold tracking-wider uppercase text-foreground/50 mb-4 flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> Suggested Route
                                        </h3>
                                        <div className="space-y-4 relative pl-4 border-l-2 border-border/50 ml-2">
                                            {result.itinerary.map((item: any, idx: number) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                                                    <h4 className="font-bold text-foreground mb-1">Day {item.day}: {item.title}</h4>
                                                    <p className="text-sm text-foreground/70">{item.desc}</p>
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
