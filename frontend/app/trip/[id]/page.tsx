"use client";

import React, { useState, useEffect, useMemo, use, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TripMap, type MapMarker } from "@/components/workspace/TripMap";
import { WeatherPanel } from "@/components/workspace/WeatherPanel";
import { VideoPanel } from "@/components/workspace/VideoPanel";
import { VotingPanel } from "@/components/workspace/VotingPanel";
import { SettlementPanel } from "@/components/workspace/SettlementPanel";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, Users, Plus, Share2, Sparkles, Trash2,
    Map, CloudSun, PlayCircle, Vote, Handshake, Wifi, WifiOff, MessageSquare, ArrowLeft, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/useSocket";
import {
    tripsApi, itineraryApi, expensesApi,
    type Trip, type ItineraryDay, type Expense, type TripMember, type ChatMessage
} from "@/lib/api";
import "leaflet/dist/leaflet.css";

export default function TripWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tripId } = use(params);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("itinerary");
    const [isAIPlannerOpen, setIsAIPlannerOpen] = useState(false);
    const [trip, setTrip] = useState<Trip | null>(null);
    const [days, setDays] = useState<ItineraryDay[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [members, setMembers] = useState<TripMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Expense form state
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");

    // Invite state
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteMsg, setInviteMsg] = useState("");
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

    // Activity form state
    const [addingToDay, setAddingToDay] = useState<string | null>(null);
    const [newActivityTitle, setNewActivityTitle] = useState("");

    const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
    const [latestChatMsg, setLatestChatMsg] = useState<ChatMessage | null>(null);
    const [bannerImg, setBannerImg] = useState("/assets/images/workspace_banner.png");

    const tabs = [
        { id: "itinerary", label: "Itinerary", icon: Calendar },
        { id: "chat", label: "Chat", icon: MessageSquare },
        { id: "budget", label: "Budget", icon: Wallet },
        { id: "weather", label: "Weather", icon: CloudSun },
        { id: "videos", label: "Videos", icon: PlayCircle },
        { id: "votes", label: "Votes", icon: Vote },
        { id: "members", label: "Members", icon: Users },
    ];

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }

        const loadData = async () => {
            try {
                const [tripRes, daysRes, expRes, memRes] = await Promise.all([
                    tripsApi.get(tripId),
                    itineraryApi.listDays(tripId),
                    expensesApi.list(tripId),
                    tripsApi.listMembers(tripId),
                ]);
                setTrip(tripRes.trip);
                setDays(daysRes.days);
                setExpenses(expRes.expenses);
                setMembers(memRes.members);

                // Build map markers from activities with day numbers
                const markers: MapMarker[] = [];
                for (const day of daysRes.days) {
                    for (const act of day.activities) {
                        if (act.lat && act.lng) {
                            markers.push({
                                name: act.title,
                                lat: act.lat,
                                lng: act.lng,
                                type: "activity",
                                description: act.category || undefined,
                                image_url: act.image_url || undefined,
                                dayNumber: day.day_number,
                            });
                        }
                    }
                }
                // Also fetch destinations for general markers
                try {
                    const firstCity = tripRes.trip.destination.split(',')[0].trim();
                    const destRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/destinations?search=${encodeURIComponent(firstCity)}`);
                    const destData = await destRes.json();
                    if (destData.destinations) {
                        for (const d of destData.destinations.slice(0, 20)) {
                            if (!markers.some(m => m.name === d.name)) {
                                markers.push({ name: d.name, lat: d.lat, lng: d.lng, type: "destination", description: d.address || undefined });
                            }
                        }
                        if (destData.destinations.length > 0 && destData.destinations[0].image_url) {
                            setBannerImg(destData.destinations[0].image_url);
                        }
                    }
                } catch { /* Destinations are optional */ }
                setMapMarkers(markers);
            } catch {
                router.push("/dashboard");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tripId, user, authLoading, router]);

    /** Refresh functions for Socket.IO real-time updates */
    const refreshItinerary = useCallback(async () => {
        try {
            const res = await itineraryApi.listDays(tripId);
            setDays(res.days);
        } catch { /* ignore */ }
    }, [tripId]);

    const refreshExpenses = useCallback(async () => {
        try {
            const res = await expensesApi.list(tripId);
            setExpenses(res.expenses);
        } catch { /* ignore */ }
    }, [tripId]);

    const refreshMembers = useCallback(async () => {
        try {
            const res = await tripsApi.listMembers(tripId);
            setMembers(res.members);
        } catch { /* ignore */ }
    }, [tripId]);

    const refreshTrip = useCallback(async () => {
        try {
            const res = await tripsApi.get(tripId);
            setTrip(res.trip);
        } catch { /* ignore */ }
    }, [tripId]);

    /** WebSocket integration for real-time collaboration */
    const { isConnected, onlineUsers } = useSocket({
        tripId,
        onItineraryUpdate: refreshItinerary,
        onExpenseUpdate: refreshExpenses,
        onVoteUpdate: () => {}, // VotingPanel handles its own refresh
        onMemberUpdate: refreshMembers,
        onTripUpdate: refreshTrip,
        onSettlementUpdate: refreshExpenses,
        onChatMessage: (data) => {
            const msg = (data as { message?: ChatMessage }).message;
            if (msg) setLatestChatMsg(msg);
        },
    });

    const handleAddDay = async () => {
        const nextNum = days.length + 1;
        const res = await itineraryApi.addDay(tripId, { day_number: nextNum });
        setDays([...days, res.day]);
    };

    const handleAddActivity = async (dayId: string) => {
        if (!newActivityTitle.trim()) return;
        const res = await itineraryApi.addActivity(tripId, dayId, { title: newActivityTitle.trim() });
        setDays(days.map(d => d.id === dayId ? { ...d, activities: [...d.activities, res.activity] } : d));
        setNewActivityTitle("");
        setAddingToDay(null);
    };

    const handleDeleteActivity = async (dayId: string, actId: string) => {
        await itineraryApi.deleteActivity(tripId, dayId, actId);
        setDays(days.map(d => d.id === dayId ? { ...d, activities: d.activities.filter(a => a.id !== actId) } : d));
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseTitle || !expenseAmount) return;
        const res = await expensesApi.add(tripId, {
            title: expenseTitle,
            amount: parseFloat(expenseAmount),
            category: expenseCategory || undefined,
            split_type: "equal",
        });
        setExpenses([res.expense, ...expenses]);
        setExpenseTitle(""); setExpenseAmount(""); setExpenseCategory("");
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        try {
            await tripsApi.invite(tripId, inviteEmail.trim());
            setInviteMsg(`Invited ${inviteEmail}`);
            setInviteEmail("");
            const memRes = await tripsApi.listMembers(tripId);
            setMembers(memRes.members);
        } catch (err: unknown) {
            setInviteMsg(err instanceof Error ? err.message : "Invite failed");
        }
    };

    const handleRemoveMember = async (targetUserId: string) => {
        try {
            await tripsApi.removeMember(tripId, targetUserId);
            const memRes = await tripsApi.listMembers(tripId);
            setMembers(memRes.members);
        } catch (err: unknown) {
            setInviteMsg(err instanceof Error ? err.message : "Failed to remove member");
        }
    };

    /** Transition trip status: planning → active → completed */
    const handleStatusChange = async (newStatus: string) => {
        try {
            const res = await tripsApi.update(tripId, { status: newStatus });
            setTrip(res.trip);
        } catch {
            // Silently fail
        }
    };

    if (loading || !trip) {
        return (
            <div className="flex h-screen w-full bg-background items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-10 h-10 rounded-full border-t-2 border-primary border-r-2 border-transparent"
                />
            </div>
        );
    }

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">

            {/* Left Area: Workspace */}
            <div className="w-full md:w-[50%] lg:w-[45%] flex flex-col h-full border-r border-border bg-surface/30 relative z-10 shadow-2xl">

                {/* Header Banner */}
                <div
                    className="h-48 shrink-0 relative flex flex-col justify-end p-6 bg-surface transition-all duration-700"
                    style={{ backgroundImage: `url('${bannerImg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Dashboard
                    </button>

                    <div className="relative z-10 flex justify-between items-end">
                        <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white mb-2">
                                <MapPin className="w-3 h-3" /> {trip.destination}
                            </span>
                            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{trip.title}</h1>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {/* Status Badge + Selector */}
                            <select
                                value={trip.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer appearance-none text-center border-0 outline-none ${
                                    trip.status === 'completed' ? 'bg-green-500/80 text-white' :
                                    trip.status === 'active' ? 'bg-blue-500/80 text-white' :
                                    'bg-amber-500/80 text-white'
                                }`}
                            >
                                <option value="planning">📋 Planning</option>
                                <option value="active">🚀 Active</option>
                                <option value="completed">✅ Completed</option>
                            </select>
                            <div 
                                onClick={() => setIsMembersModalOpen(true)}
                                className="flex -space-x-3 cursor-pointer hover:scale-105 transition-transform"
                                title="Manage Members"
                            >
                                {members.slice(0, 3).map((m, i) => (
                                    <div key={m.id} className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex justify-center items-center text-xs font-bold text-white shadow-sm ring-1 ring-black/10">
                                        {m.user_name?.charAt(0) || "U"}
                                    </div>
                                ))}
                                {members.length > 3 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface flex justify-center items-center text-xs text-foreground ring-1 ring-black/10">
                                        +{members.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav & Summary */}
                <div className="shrink-0 p-6 pb-0 space-y-4 shadow-sm z-10 bg-background/80 backdrop-blur-xl">
                    <div className="flex justify-between items-center text-sm font-medium text-foreground/70">
                        <div className="flex gap-4">
                            {trip.start_date && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    {new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Wallet className="w-4 h-4 text-secondary" />
                                LKR {trip.budget_limit ? `${(trip.budget_limit / 1000).toFixed(0)}k` : "N/A"}
                            </span>
                        </div>
                        {/* Live Connection Indicator */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {isConnected ? 'Live' : 'Offline'}
                            {onlineUsers.length > 0 && isConnected && (
                                <span className="text-foreground/40 ml-1">· {onlineUsers.length} online</span>
                            )}
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
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
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
                            {/* ITINERARY TAB */}
                            {activeTab === "itinerary" && (
                                <div className="space-y-6">
                                    {days.map((day) => (
                                        <div key={day.id} className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                                                    {day.day_number}
                                                </div>
                                                <h3 className="font-bold text-lg">Day {day.day_number}{day.date ? ` — ${new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</h3>
                                            </div>
                                            <div className="pl-4 ml-4 border-l-2 border-border/50 space-y-4 py-2">
                                                {day.activities.map((act) => (
                                                    <Card key={act.id} variant="interactive" className="p-0 bg-surface/50 hover:bg-surface/80 border-border/50 overflow-hidden flex gap-0">
                                                        {/* Activity image thumbnail */}
                                                        {act.image_url && (
                                                            <div className="w-20 h-full shrink-0">
                                                                <img
                                                                    src={act.image_url}
                                                                    alt={act.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 p-4">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h4 className="font-bold">{act.title}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-foreground/70">
                                                                        {act.estimated_cost > 0 ? `LKR ${act.estimated_cost.toLocaleString()}` : ""}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleDeleteActivity(day.id, act.id)}
                                                                        className="p-1 text-foreground/30 hover:text-red-400 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-foreground/50">{act.time_slot || ""}</span>
                                                                {act.category && (
                                                                    <span className="px-2 py-1 rounded bg-secondary/10 text-secondary font-medium">{act.category}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}

                                                {/* Add Activity Form */}
                                                {addingToDay === day.id ? (
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Activity title..."
                                                            className="h-10 flex-1"
                                                            value={newActivityTitle}
                                                            onChange={(e) => setNewActivityTitle(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && handleAddActivity(day.id)}
                                                            autoFocus
                                                        />
                                                        <Button size="sm" onClick={() => handleAddActivity(day.id)}>Add</Button>
                                                        <Button size="sm" variant="secondary" onClick={() => { setAddingToDay(null); setNewActivityTitle(""); }}>Cancel</Button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setAddingToDay(day.id)}
                                                        className="flex items-center gap-2 text-sm text-primary font-medium p-2 hover:bg-primary/10 rounded-lg transition-colors w-full border border-dashed border-primary/30 justify-center"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Activity
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={handleAddDay}
                                        className="flex items-center gap-2 text-sm text-secondary font-medium p-3 hover:bg-secondary/10 rounded-xl transition-colors w-full border border-dashed border-secondary/30 justify-center"
                                    >
                                        <Plus className="w-4 h-4" /> Add Day
                                    </button>
                                </div>
                            )}

                            {/* OVERVIEW TAB */}
                            {activeTab === "overview" && (
                                <div className="space-y-6">
                                    <Card className="p-6">
                                        <h3 className="font-bold text-lg mb-4">Trip Summary</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="text-foreground/60">Destination</span><p className="font-bold">{trip.destination}</p></div>
                                            <div><span className="text-foreground/60">Status</span><p className="font-bold capitalize">{trip.status}</p></div>
                                            <div><span className="text-foreground/60">Members</span><p className="font-bold">{members.length}</p></div>
                                            <div><span className="text-foreground/60">Days Planned</span><p className="font-bold">{days.length}</p></div>
                                            <div><span className="text-foreground/60">Budget</span><p className="font-bold">LKR {trip.budget_limit?.toLocaleString() || "N/A"}</p></div>
                                            <div><span className="text-foreground/60">Spent</span><p className="font-bold">LKR {totalSpent.toLocaleString()}</p></div>
                                        </div>
                                        {trip.budget_limit && (
                                            <div className="mt-4">
                                                <div className="h-3 w-full bg-surface rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min((totalSpent / trip.budget_limit) * 100, 100)}%` }}
                                                        transition={{ duration: 1 }}
                                                        className={`h-full rounded-full ${totalSpent > trip.budget_limit * 0.9 ? 'bg-red-500' : 'bg-primary'}`}
                                                    />
                                                </div>
                                                <p className="text-xs text-foreground/50 mt-1">
                                                    {((totalSpent / trip.budget_limit) * 100).toFixed(0)}% of budget used
                                                </p>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            )}

                            {/* BUDGET TAB */}
                            {activeTab === "budget" && user && (
                                <SettlementPanel 
                                    tripId={tripId} 
                                    currentUserId={user.id} 
                                    isCreator={trip.creator_id === user.id} 
                                    trip={trip} 
                                    members={members} 
                                    expenses={expenses}
                                    expenseTitle={expenseTitle}
                                    setExpenseTitle={setExpenseTitle}
                                    expenseAmount={expenseAmount}
                                    setExpenseAmount={setExpenseAmount}
                                    expenseCategory={expenseCategory}
                                    setExpenseCategory={setExpenseCategory}
                                    handleAddExpense={handleAddExpense}
                                />
                            )}

                            {/* MEMBERS TAB */}
                            {activeTab === "members" && (
                                <div className="space-y-6">
                                    <Card className="p-4">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Email to invite..."
                                                className="h-9 flex-1"
                                                value={inviteEmail}
                                                onChange={e => setInviteEmail(e.target.value)}
                                            />
                                            <Button size="sm" className="h-9" onClick={handleInvite}>Invite</Button>
                                        </div>
                                        {inviteMsg && <p className="text-xs mt-2 text-primary">{inviteMsg}</p>}
                                    </Card>

                                    <div className="space-y-3">
                                        {members.map((m) => (
                                            <Card key={m.id} className="p-4 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                                        {m.user_name?.charAt(0) || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{m.user_name}</p>
                                                        <p className="text-xs text-foreground/50">{m.user_email}</p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface border border-border capitalize">
                                                    {m.role}
                                                </span>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CHAT TAB */}
                            {activeTab === "chat" && (
                                <div className="h-[600px] rounded-2xl overflow-hidden border border-border">
                                    <ChatPanel tripId={tripId} newMessage={latestChatMsg} />
                                </div>
                            )}

                            {/* WEATHER TAB */}
                            {activeTab === "weather" && (
                                <WeatherPanel destination={trip.destination} days={days} />
                            )}

                            {/* VIDEOS TAB */}
                            {activeTab === "videos" && (
                                <VideoPanel destination={trip.destination} />
                            )}

                            {/* VOTES TAB */}
                            {activeTab === "votes" && user && (
                                <VotingPanel tripId={tripId} currentUserId={user.id} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="hidden md:flex flex-1 flex-col bg-surface overflow-hidden relative">
                <TripMap markers={mapMarkers} destination={trip.destination} className="absolute inset-0 w-full h-full rounded-none border-0" />
            </div>

            {/* Members Management Modal */}
            <AnimatePresence>
                {isMembersModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMembersModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-surface border border-border shadow-2xl rounded-2xl p-6 z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Users className="text-secondary" /> Manage Members
                                </h3>
                                <button onClick={() => setIsMembersModalOpen(false)} className="p-2 hover:bg-background/80 rounded-full transition-colors text-foreground/50">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                {members.map(m => {
                                    const isMe = m.user_id === user?.id;
                                    const IAmCreator = trip.creator_id === user?.id;
                                    const isCreator = m.user_id === trip.creator_id;
                                    
                                    return (
                                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary ring-2 ring-background">
                                                    {m.user_name?.charAt(0) || "?"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold flex items-center gap-2">
                                                        {m.user_name}
                                                        {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">You</span>}
                                                        {isCreator && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">Creator</span>}
                                                    </span>
                                                    <span className="text-xs text-foreground/50">{m.user_email}</span>
                                                </div>
                                            </div>
                                            
                                            {IAmCreator && !isCreator && (
                                                <button 
                                                    onClick={() => handleRemoveMember(m.user_id)}
                                                    className="w-8 h-8 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all"
                                                    title="Remove from Trip"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
