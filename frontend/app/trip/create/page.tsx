"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Wallet, Users, Compass, Sparkles, Search, Star, X } from "lucide-react";
import { AIPlannerPanel } from "@/components/workspace/AIPlannerPanel";
import { useRouter, useSearchParams } from "next/navigation";
import {
    tripsApi, itineraryApi, expensesApi, destinationsApi, friendsApi,
    type RecommendationResult, type DestinationResult, type User
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Check } from "lucide-react";

function CreateTripContent() {
    const [tripMode, setTripMode] = useState<"solo" | "group">("solo");
    const [friendsList, setFriendsList] = useState<{ id: string; user: User; status: string }[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    
    const [tripType, setTripType] = useState<string | null>(null);
    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [budget, setBudget] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);
    const [aiRoute, setAiRoute] = useState<RecommendationResult["recommended_route"] | null>(null);
    const [aiDuration, setAiDuration] = useState<number>(3);
    const [aiCostBreakdown, setAiCostBreakdown] = useState<{
        accommodation: number; transport: number; food: number; activities: number;
    } | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Destination search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<DestinationResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch friends on load
    useEffect(() => {
        if (!user) return;
        friendsApi.list().then(res => {
            setFriendsList(res.friends || []);
        }).catch(() => {});
    }, [user]);

    const tripTypes = [
        { id: "beach", label: "Beach Vibes", icon: "🌊" },
        { id: "cultural", label: "Cultural Heritage", icon: "🛕" },
        { id: "adventure", label: "Adventure & Hiking", icon: "⛰️" },
        { id: "wildlife", label: "Wildlife Safari", icon: "🐘" },
    ];

    /** Pre-fill destination from URL search params */
    useEffect(() => {
        const destParam = searchParams.get("destination");
        if (destParam) {
            setDestination(destParam);
            setSearchQuery(destParam);
        }
    }, [searchParams]);

    /** Close dropdown when clicking outside */
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    /** Debounced destination search */
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await destinationsApi.search(query);
                setSearchResults(res.destinations.slice(0, 8));
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, []);

    /** Select a destination from search results */
    const handleSelectDestination = (dest: DestinationResult) => {
        setDestination(dest.name);
        setSearchQuery(dest.name);
        setShowDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!destination) {
            setError("Please select a destination");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const res = await tripsApi.create({
                title: `${destination} ${tripType ? tripTypes.find(t => t.id === tripType)?.label : "Trip"}`,
                destination,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                budget_limit: budget ? parseFloat(budget) : undefined,
                trip_type: tripType || undefined,
                invited_friends: tripMode === "group" ? selectedFriends : undefined,
            });

            // If AI route exists, create itinerary with day assignments
            if (aiRoute && aiRoute.length > 0) {
                // Check if route has day assignments (from multi-destination or updated single)
                const hasDayAssignment = aiRoute.some(p => p.day !== undefined);

                if (hasDayAssignment) {
                    // Group stops by day
                    const dayMap: Record<number, typeof aiRoute> = {};
                    for (const place of aiRoute) {
                        const day = place.day || 1;
                        if (!dayMap[day]) dayMap[day] = [];
                        dayMap[day].push(place);
                    }

                    for (const [dayStr, stops] of Object.entries(dayMap)) {
                        const dayNumber = parseInt(dayStr, 10);
                        try {
                            // Compute date for this day
                            let dayDate: string | undefined;
                            if (startDate) {
                                const d = new Date(startDate);
                                d.setDate(d.getDate() + dayNumber - 1);
                                dayDate = d.toISOString().split("T")[0];
                            }

                            const dayRes = await itineraryApi.addDay(res.trip.id, {
                                day_number: dayNumber,
                                date: dayDate,
                            });
                            const dayId = dayRes.day.id;

                            for (let i = 0; i < stops.length; i++) {
                                const place = stops[i];
                                await itineraryApi.addActivity(res.trip.id, dayId, {
                                    title: place.title || `Visit ${place.name}`,
                                    description: `AI Suggested Stop. Rating: ${place.rating || 'N/A'}/5`,
                                    lat: place.lat,
                                    lng: place.lng,
                                    category: place.category || "adventure",
                                    estimated_cost: 0,
                                    image_url: place.image_url || undefined,
                                    order_index: i,
                                });
                            }
                        } catch (itineraryErr) {
                            console.error("Failed to add AI itinerary to day", dayNumber, itineraryErr);
                        }
                    }
                } else {
                    // Fallback: distribute evenly (original behavior)
                    const stopsPerDay = Math.ceil(aiRoute.length / aiDuration);
                    let currentItemIndex = 0;

                    for (let dayNumber = 1; dayNumber <= aiDuration; dayNumber++) {
                        try {
                            const dayRes = await itineraryApi.addDay(res.trip.id, { day_number: dayNumber });
                            const dayId = dayRes.day.id;

                            for (let i = 0; i < stopsPerDay; i++) {
                                if (currentItemIndex >= aiRoute.length) break;
                                const place = aiRoute[currentItemIndex];
                                await itineraryApi.addActivity(res.trip.id, dayId, {
                                    title: place.title || `Visit ${place.name}`,
                                    description: `AI Suggested Stop. Rating: ${place.rating || 'N/A'}/5`,
                                    lat: place.lat,
                                    lng: place.lng,
                                    category: place.category || "adventure",
                                    estimated_cost: 0,
                                    image_url: place.image_url || undefined,
                                    order_index: i,
                                });
                                currentItemIndex++;
                            }
                        } catch (itineraryErr) {
                            console.error("Failed to add AI itinerary to day", dayNumber, itineraryErr);
                        }
                    }
                }
            }

            // Auto-add AI cost estimation as expenses
            if (aiCostBreakdown) {
                const categories = [
                    { title: "Accommodation (estimated)", amount: aiCostBreakdown.accommodation, category: "accommodation" },
                    { title: "Transport (estimated)", amount: aiCostBreakdown.transport, category: "transport" },
                    { title: "Food (estimated)", amount: aiCostBreakdown.food, category: "food" },
                    { title: "Activities (estimated)", amount: aiCostBreakdown.activities, category: "activities" },
                ];
                for (const exp of categories) {
                    if (exp.amount > 0) {
                        try {
                            await expensesApi.add(res.trip.id, {
                                title: exp.title,
                                amount: exp.amount,
                                category: exp.category,
                                split_type: "equal",
                            });
                        } catch {
                            // Expense creation is best-effort
                        }
                    }
                }
            }

            // Invite member if email was entered
            if (inviteEmail.trim()) {
                try {
                    await tripsApi.invite(res.trip.id, inviteEmail.trim());
                } catch {
                    // Invitation may fail silently — user may not exist yet
                }
            }

            router.push(`/trip/${res.trip.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create trip");
        } finally {
            setLoading(false);
        }
    };

    const handleAIApply = async (data: {
        destination: string;
        budget: string;
        activities: string[];
        route: RecommendationResult["recommended_route"];
        duration: number;
        startDate: string;
        endDate: string;
        destinationDays?: Record<string, number>;
    }) => {
        setDestination(data.destination);
        setSearchQuery(data.destination);
        setBudget(data.budget);
        setAiRoute(data.route);
        setAiDuration(data.duration);
        setStartDate(data.startDate);
        setEndDate(data.endDate);

        const acts = data.activities.join(" ").toLowerCase();
        if (acts.includes("beach") || acts.includes("surf")) setTripType("beach");
        else if (acts.includes("hik") || acts.includes("adventur")) setTripType("adventure");
        else if (acts.includes("wildlife") || acts.includes("safari")) setTripType("wildlife");
        else if (acts.includes("cultur") || acts.includes("temple")) setTripType("cultural");

        // Fetch cost breakdown to create estimated expenses
        try {
            const { recommendApi } = await import("@/lib/api");
            const costResult = await recommendApi.estimateCost({
                destination: data.destination.split(",")[0].trim(),
                duration_days: data.duration,
                num_travelers: 2,
                vehicle_type: "car",
                accommodation_type: "mid-range",
            });
            setAiCostBreakdown({
                accommodation: costResult.estimation.accommodation,
                transport: costResult.estimation.transport,
                food: costResult.estimation.food,
                activities: costResult.estimation.activities,
            });
        } catch {
            // Cost breakdown is optional
        }

        // Auto-submit the form after a brief delay for visual feedback
        setTimeout(() => {
            const formEl = document.querySelector("form");
            if (formEl) formEl.requestSubmit();
        }, 500);
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
                        >
                            Create New Trip
                        </motion.h1>
                        <p className="text-foreground/60 text-lg">Set up the foundations for your upcoming journey.</p>
                    </div>
                    <Button 
                        onClick={() => setIsAIPlannerOpen(true)} 
                        className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 gap-2 shrink-0 h-12 px-6 rounded-2xl"
                    >
                        <Sparkles className="w-5 h-5" /> Let AI Plan For Me
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Form Area */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="p-6 md:p-8 border-border">
                            <form className="space-y-8" onSubmit={handleSubmit}>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {/* Destination — Live Search */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <MapPin className="text-primary" /> Where to?
                                    </h3>
                                    <div className="relative" ref={searchRef}>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowDropdown(true)}
                                                placeholder="Search Sri Lankan destinations..."
                                                className="flex h-12 w-full rounded-2xl border border-border bg-surface/50 pl-11 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-foreground/40"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchQuery("");
                                                        setDestination("");
                                                        setSearchResults([]);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-foreground/40"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isSearching && (
                                                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 rounded-full border-t-2 border-primary border-r-2 border-transparent animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Search Results Dropdown */}
                                        <AnimatePresence>
                                            {showDropdown && searchResults.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
                                                >
                                                    {searchResults.map((dest) => (
                                                        <button
                                                            key={dest.id}
                                                            type="button"
                                                            onClick={() => handleSelectDestination(dest)}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors text-left border-b border-border/30 last:border-b-0"
                                                        >
                                                            {dest.image_url ? (
                                                                <img
                                                                    src={dest.image_url}
                                                                    alt={dest.name}
                                                                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                                    <MapPin className="w-4 h-4 text-primary" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-sm truncate">{dest.name}</span>
                                                                    {dest.rating && dest.rating > 0 && (
                                                                        <span className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                                                                            <Star className="w-3 h-3 fill-amber-500" />
                                                                            {dest.rating.toFixed(1)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {dest.description && (
                                                                    <p className="text-xs text-foreground/50 truncate">{dest.description}</p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Selected destination badge */}
                                        {destination && destination === searchQuery && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                                            >
                                                <MapPin className="w-3 h-3" />
                                                {destination}
                                            </motion.div>
                                        )}
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
                                            <Input
                                                type="date"
                                                className="h-12 bg-surface/50"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-foreground/60 px-1">End Date</label>
                                            <Input
                                                type="date"
                                                className="h-12 bg-surface/50"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Trip Type */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Compass className="text-accent" /> What&apos;s the vibe?
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

                                {/* AI Route Preview */}
                                {aiRoute && aiRoute.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-2xl bg-primary/5 border border-primary/20"
                                    >
                                        <h4 className="text-sm font-bold text-primary flex items-center gap-1.5 mb-3">
                                            <Sparkles className="w-4 h-4" /> AI Route ({aiRoute.length} stops, {aiDuration} days)
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {aiRoute.filter(p => !p.category || p.category !== "accommodation").slice(0, 10).map((place, i) => (
                                                <span key={i} className="px-2.5 py-1 rounded-full bg-surface text-xs font-medium border border-border/50">
                                                    {place.day && <span className="text-primary mr-1">D{place.day}</span>}
                                                    {place.name}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="pt-4">
                                    <Button size="lg" className="w-full text-lg h-14" disabled={loading}>
                                        {loading ? "Creating..." : "Initialize Workspace"}
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
                                    <Input
                                        type="number"
                                        placeholder="100000"
                                        className="pl-12 h-12 text-lg font-semibold"
                                        value={budget}
                                        onChange={(e) => setBudget(e.target.value)}
                                    />
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
                                    <Users className="text-secondary" /> Trip Structure
                                </h3>
                                
                                {/* Mode Selection */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button 
                                        type="button"
                                        onClick={() => setTripMode("solo")}
                                        className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                            tripMode === "solo" 
                                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' 
                                            : 'border-border bg-surface/30 text-foreground/60 hover:bg-surface/60'
                                        }`}
                                    >
                                        <span className="text-xl">🏃</span>
                                        <span className="text-sm">Solo Trip</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setTripMode("group")}
                                        className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                            tripMode === "group" 
                                            ? 'border-secondary bg-secondary/10 text-secondary font-bold shadow-sm' 
                                            : 'border-border bg-surface/30 text-foreground/60 hover:bg-surface/60'
                                        }`}
                                    >
                                        <span className="text-xl">🙌</span>
                                        <span className="text-sm">Group Trip</span>
                                    </button>
                                </div>

                                {tripMode === "group" && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="space-y-4 pt-2 border-t border-border/50"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold">Invite Friends</label>
                                            <p className="text-[11px] text-foreground/50">Select online friends or send email invites</p>
                                        </div>

                                        {friendsList.length > 0 ? (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {friendsList.filter(f => f.status === 'accepted').map(friendship => {
                                                    const fUser = friendship.user;
                                                    const isSelected = selectedFriends.includes(fUser.id);
                                                    return (
                                                        <div 
                                                            key={friendship.id} 
                                                            onClick={() => {
                                                                if (isSelected) setSelectedFriends(prev => prev.filter(id => id !== fUser.id));
                                                                else setSelectedFriends(prev => [...prev, fUser.id]);
                                                            }}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                                                                isSelected ? 'bg-primary/10 border-primary/30' : 'bg-background/50 border-border/40 hover:bg-surface/80'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold relative">
                                                                    {fUser.name.charAt(0)}
                                                                </div>
                                                                <span className="text-sm font-medium">{fUser.name}</span>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-surface border border-border'}`}>
                                                                {isSelected && <Check className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg bg-background/50 border-dashed border border-border/50 text-center">
                                                <p className="text-xs text-foreground/40">No friends on your list yet.</p>
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <p className="text-[11px] font-semibold uppercase text-foreground/50 mb-2">Or invite via email</p>
                                            <Input
                                                type="email"
                                                placeholder="friend@example.com"
                                                className="h-10 text-sm bg-background/50"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
            
            <AIPlannerPanel 
                isOpen={isAIPlannerOpen} 
                onClose={() => setIsAIPlannerOpen(false)} 
                onApply={handleAIApply} 
            />
        </DashboardLayout>
    );
}

export default function CreateTripPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full bg-background items-center justify-center">
                <div className="w-10 h-10 rounded-full border-t-2 border-primary border-r-2 border-transparent animate-spin" />
            </div>
        }>
            <CreateTripContent />
        </Suspense>
    );
}
