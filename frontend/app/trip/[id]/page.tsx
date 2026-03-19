"use client";

import React, { useState, useEffect, use } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AIPlannerPanel } from "@/components/workspace/AIPlannerPanel";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, Users, Plus, Share2, Sparkles, Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    tripsApi, itineraryApi, expensesApi,
    type Trip, type ItineraryDay, type Expense, type TripMember
} from "@/lib/api";

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

    // Activity form state
    const [addingToDay, setAddingToDay] = useState<string | null>(null);
    const [newActivityTitle, setNewActivityTitle] = useState("");

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "itinerary", label: "Itinerary" },
        { id: "expenses", label: "Expenses" },
        { id: "members", label: "Members" },
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
            } catch {
                router.push("/dashboard");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tripId, user, authLoading, router]);

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
                    className="h-48 shrink-0 relative flex flex-col justify-end p-6"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?q=80&w=800&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="relative z-10 flex justify-between items-end">
                        <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white mb-2">
                                <MapPin className="w-3 h-3" /> {trip.destination}
                            </span>
                            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{trip.title}</h1>
                        </div>
                        <div className="flex -space-x-3">
                            {members.slice(0, 3).map((m, i) => (
                                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex justify-center items-center text-xs font-bold text-white shadow-sm">
                                    {m.user_name?.charAt(0) || "U"}
                                </div>
                            ))}
                            {members.length > 3 && (
                                <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface flex justify-center items-center text-xs text-foreground">
                                    +{members.length - 3}
                                </div>
                            )}
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
                        <div className="flex gap-2">
                            <Button onClick={() => setIsAIPlannerOpen(true)} variant="primary" size="sm" className="h-8 gap-2 bg-gradient-to-r from-primary to-secondary shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                <Sparkles className="w-4 h-4" /> Ask AI
                            </Button>
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
                                                    <Card key={act.id} variant="interactive" className="p-4 bg-surface/50 hover:bg-surface/80 border-border/50 flex gap-4">
                                                        <div className="flex-1">
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

                            {/* EXPENSES TAB */}
                            {activeTab === "expenses" && (
                                <div className="space-y-6">
                                    <Card className="p-4">
                                        <form onSubmit={handleAddExpense} className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs text-foreground/60">Title</label>
                                                <Input placeholder="e.g. Train tickets" className="h-9" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} />
                                            </div>
                                            <div className="w-28 space-y-1">
                                                <label className="text-xs text-foreground/60">Amount</label>
                                                <Input type="number" placeholder="5000" className="h-9" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                            </div>
                                            <Button size="sm" className="h-9">Add</Button>
                                        </form>
                                    </Card>

                                    <div className="text-sm font-medium text-foreground/60 flex justify-between">
                                        <span>{expenses.length} expenses</span>
                                        <span className="text-foreground font-bold">Total: LKR {totalSpent.toLocaleString()}</span>
                                    </div>

                                    <div className="space-y-3">
                                        {expenses.map((exp) => (
                                            <Card key={exp.id} className="p-4 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold">{exp.title}</p>
                                                    <p className="text-xs text-foreground/50">
                                                        Paid by {exp.payer_name || "Unknown"} · {exp.split_type} split
                                                    </p>
                                                </div>
                                                <p className="text-lg font-bold">LKR {exp.amount.toLocaleString()}</p>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
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
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Right Area: Map Visualization */}
            <div className="hidden md:block flex-1 relative bg-surface overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: "url('/assets/images/sri-lanka-map.png')" }}
                />
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />

                <div className="absolute top-6 right-6">
                    <Card className="px-4 py-2 flex items-center gap-2 shadow-lg backdrop-blur-md bg-background/80 border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Map Sync Active
                    </Card>
                </div>
            </div>

            <AIPlannerPanel isOpen={isAIPlannerOpen} onClose={() => setIsAIPlannerOpen(false)} tripId={tripId} />
        </div>
    );
}
