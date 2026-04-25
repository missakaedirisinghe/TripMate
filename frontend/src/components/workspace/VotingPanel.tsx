"use client";

/**
 * VotingPanel — Group voting for destinations, routes, and activities.
 *
 * Uses GET/POST/DELETE /api/trips/:id/votes via votesApi.
 * Displays tallies and allows casting/retracting votes.
 */

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Plus, Trash2, Loader2, Vote, MapPin, Route, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { votesApi, type VoteTally } from "@/lib/api";

type VoteCategory = "destination" | "route" | "activity";

const CATEGORIES: { id: VoteCategory; label: string; icon: React.ElementType; placeholder: string }[] = [
    { id: "destination", label: "Destinations", icon: MapPin, placeholder: "e.g. Ella, Sigiriya..." },
    { id: "route", label: "Routes", icon: Route, placeholder: "e.g. Kandy → Ella by train..." },
    { id: "activity", label: "Activities", icon: Activity, placeholder: "e.g. Whale watching in Mirissa..." },
];

interface VotingPanelProps {
    tripId: string;
    currentUserId: string;
}

export function VotingPanel({ tripId, currentUserId }: VotingPanelProps) {
    const [tallies, setTallies] = useState<VoteTally[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<VoteCategory>("destination");
    const [newOption, setNewOption] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchVotes = useCallback(async () => {
        try {
            const res = await votesApi.get(tripId);
            setTallies(res.tallies);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        fetchVotes();
    }, [fetchVotes]);

    /** Cast a vote on an option. */
    const handleVote = async (targetId: string, targetValue: string, voteType: string) => {
        setSubmitting(true);
        try {
            await votesApi.cast(tripId, { vote_type: voteType, target_id: targetId, target_value: targetValue });
            await fetchVotes();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    /** Retract own vote. */
    const handleRetract = async (voteId: string) => {
        try {
            await votesApi.retract(tripId, voteId);
            await fetchVotes();
        } catch {
        }
    };

    /** Add a new option and vote for it. */
    const handleAddOption = async () => {
        if (!newOption.trim()) return;
        setSubmitting(true);
        const targetId = newOption.trim().toLowerCase().replace(/\s+/g, "-");
        try {
            await votesApi.cast(tripId, {
                vote_type: activeCategory,
                target_id: targetId,
                target_value: newOption.trim(),
            });
            setNewOption("");
            await fetchVotes();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    /** Filter tallies by active category. */
    const filteredTallies = tallies.filter((t) => t.vote_type === activeCategory);

    /** Check if current user voted on a tally. */
    const hasUserVoted = (tally: VoteTally): boolean => {
        return tally.voters?.some((v) => v.user_id === currentUserId) || false;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            activeCategory === cat.id
                                ? "bg-primary text-white"
                                : "bg-surface text-foreground/60 hover:text-foreground hover:bg-surface/80"
                        }`}
                    >
                        <cat.icon className="w-3.5 h-3.5" />
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Add New Option */}
            <Card className="p-4">
                <div className="flex gap-3">
                    <Input
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder={CATEGORIES.find((c) => c.id === activeCategory)?.placeholder}
                        onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
                        className="flex-1"
                    />
                    <Button onClick={handleAddOption} disabled={submitting || !newOption.trim()} className="gap-1.5 shrink-0">
                        <Plus className="w-4 h-4" /> Suggest
                    </Button>
                </div>
            </Card>

            {/* Vote Tallies */}
            {filteredTallies.length === 0 ? (
                <Card className="p-8 text-center">
                    <Vote className="w-10 h-10 text-foreground/15 mx-auto mb-3" />
                    <p className="text-sm text-foreground/50">No suggestions yet for {activeCategory}s</p>
                    <p className="text-xs text-foreground/30 mt-1">Be the first to suggest one above!</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {filteredTallies
                            .sort((a, b) => b.count - a.count)
                            .map((tally, i) => {
                                const voted = hasUserVoted(tally);
                                const maxCount = Math.max(...filteredTallies.map((t) => t.count), 1);
                                const pct = (tally.count / maxCount) * 100;

                                return (
                                    <motion.div
                                        key={`${tally.vote_type}-${tally.target_id}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <Card className={`p-4 relative overflow-hidden transition-all ${voted ? "border-primary/40" : ""}`}>
                                            {/* Progress bar background */}
                                            <div
                                                className="absolute inset-0 bg-primary/5 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />

                                            <div className="relative flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm truncate">
                                                        {tally.target_value || tally.target_id}
                                                    </p>
                                                    <p className="text-xs text-foreground/40 mt-0.5">
                                                        {tally.count} vote{tally.count !== 1 ? "s" : ""}
                                                        {tally.voters && tally.voters.length > 0 && (
                                                            <span>
                                                                {" • "}
                                                                {tally.voters.map((v) => v.voter_name || "Anonymous").join(", ")}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        voted
                                                            ? handleRetract(tally.target_id)
                                                            : handleVote(tally.target_id, tally.target_value || tally.target_id, tally.vote_type)
                                                    }
                                                    disabled={submitting}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        voted
                                                            ? "bg-primary text-white hover:bg-primary/80"
                                                            : "bg-surface hover:bg-primary/10 text-foreground/60 hover:text-primary"
                                                    }`}
                                                >
                                                    <ThumbsUp className={`w-3.5 h-3.5 ${voted ? "fill-white" : ""}`} />
                                                    {voted ? "Voted" : "Vote"}
                                                </button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
