/**
 * SettlementPanel — Expense settlement flow component.
 *
 * Shows who owes whom with optimized debt calculations,
 * allows marking debts as paid, and displays settlement history.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, History, Wallet, AlertCircle, PartyPopper, Users, TrendingUp, TrendingDown, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { expensesApi, type Settlement, type Trip, type TripMember, type Expense } from "@/lib/api";

interface Debt {
    from_user_id: string;
    from_user_name?: string;
    to_user_id: string;
    to_user_name?: string;
    amount: number;
}

interface SettlementPanelProps {
    /** Trip ID to load debts and settlements for */
    tripId: string;
    /** Current authenticated user ID */
    currentUserId: string;
    /** Whether the current user is the trip creator */
    isCreator?: boolean;
    trip: Trip;
    members: TripMember[];
    expenses: Expense[];
    expenseTitle: string;
    setExpenseTitle: (v: string) => void;
    expenseAmount: string;
    setExpenseAmount: (v: string) => void;
    expenseCategory: string;
    setExpenseCategory: (v: string) => void;
    handleAddExpense: (e: React.FormEvent) => Promise<void>;
}

export function SettlementPanel({ tripId, currentUserId, isCreator = false, trip, members, expenses, expenseTitle, setExpenseTitle, expenseAmount, setExpenseAmount, expenseCategory, setExpenseCategory, handleAddExpense }: SettlementPanelProps) {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [allSettled, setAllSettled] = useState(false);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);
    const [settleNote, setSettleNote] = useState("");
    const [settling, setSettling] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [debtsRes, settlementsRes] = await Promise.all([
                expensesApi.getDebts(tripId),
                expensesApi.listSettlements(tripId),
            ]);
            setDebts(debtsRes.debts);
            setAllSettled(debtsRes.all_settled);
            setSettlements(settlementsRes.settlements);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSettle = async (debt: Debt) => {
        setSettling(true);
        try {
            await expensesApi.addSettlement(tripId, {
                from_user_id: isCreator && !(debt.from_user_id === currentUserId) ? debt.from_user_id : undefined,
                to_user_id: debt.to_user_id,
                amount: debt.amount,
                note: settleNote || undefined,
            });
            setSettlingDebt(null);
            setSettleNote("");
            await loadData();
        } catch {
        } finally {
            setSettling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-t-2 border-primary border-r-2 border-transparent"
                />
            </div>
        );
    }

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const numMembers = Math.max(1, members.length);
    const spentPerPerson = totalSpent / numMembers;
    const remainingTotal = trip.budget_limit ? trip.budget_limit - totalSpent : 0;
    const hasBudget = Boolean(trip.budget_limit);

    const categoryTotals = expenses.reduce((acc, exp) => {
        const cat = exp.category || 'Other';
        acc[cat] = (acc[cat] || 0) + exp.amount;
        return acc;
    }, {} as Record<string, number>);

    const cats = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                    Budget Tracking
                </h3>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-foreground/60 hover:text-foreground flex items-center gap-1 transition-colors font-medium bg-surface px-3 py-1.5 rounded-md border border-border"
                >
                    <History className="w-4 h-4" />
                    {showHistory ? "View Dashboard" : "History"}
                </button>
            </div>        <AnimatePresence mode="wait">
            {!showHistory ? (
                <motion.div
                    key="dashboard-and-debts"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                >
                    {/* Financial Analytics Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Main Column: Analytics + Recent Expenses */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Analytics Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Total Spent Widget */}
                                <Card className="p-6 bg-gradient-to-br from-surface to-surface/40 border-border">
                                    <p className="text-sm font-semibold text-foreground/60 tracking-wider uppercase mb-2 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-red-500" /> Total Spent
                                    </p>
                                    <h1 className="text-5xl font-black text-foreground drop-shadow-sm mb-6">
                                        <span className="text-2xl text-foreground/50 align-top mr-1">LKR</span>
                                        {totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </h1>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="bg-surface/60 rounded-xl p-3 flex-1 border border-border/50">
                                            <p className="text-[10px] font-semibold text-foreground/50 uppercase">Budgeted</p>
                                            <p className="text-sm font-bold">
                                                {hasBudget ? `LKR ${trip.budget_limit!.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}
                                            </p>
                                        </div>
                                        <div className={`rounded-xl p-3 flex-1 border ${remainingTotal >= 0 ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
                                            <p className="text-[10px] font-semibold uppercase opacity-80">{remainingTotal >= 0 ? "Remaining" : "Over"}</p>
                                            <p className="text-sm font-bold">
                                                LKR {Math.abs(remainingTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {/* By Category Widget */}
                                <Card className="p-6 bg-surface/50 border-border/50">
                                    <p className="text-sm font-semibold text-foreground/60 tracking-wider uppercase mb-5 flex items-center gap-2">
                                        <LayoutDashboard className="w-4 h-4 text-primary" /> By Category
                                    </p>
                                    <div className="space-y-4">
                                        {cats.length === 0 ? (
                                            <p className="text-sm text-foreground/40 italic">No expenses recorded yet.</p>
                                        ) : cats.slice(0, 4).map(([cat, amt]) => {
                                            const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                                            return (
                                                <div key={cat}>
                                                    <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase text-foreground/80">
                                                        <span>{cat}</span>
                                                        <span className="text-primary font-black">{pct.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-background overflow-hidden border border-border/30 backdrop-blur-md">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className="h-full bg-primary" 
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>

                            {/* Recent Expenses List & Form */}
                            <Card className="p-6 border-border flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-semibold text-foreground/60 tracking-wider uppercase flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-primary" /> Recents
                                    </p>
                                </div>
                                
                                {/* Inline Add Expense */}
                                {isCreator && (
                                    <div className="mb-6 p-4 rounded-xl bg-surface/50 border border-border/50">
                                        <form onSubmit={async (e) => { await handleAddExpense(e); await loadData(); }} className="flex flex-wrap gap-2 items-end">
                                            <div className="flex-1 min-w-[120px] space-y-1">
                                                <label className="text-[11px] font-bold uppercase text-foreground/50">Title</label>
                                                <Input placeholder="e.g. Train" className="h-8 text-xs bg-background/50 border-border/40" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} />
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <label className="text-[11px] font-bold uppercase text-foreground/50">Cat</label>
                                                <Input placeholder="Food" className="h-8 text-xs bg-background/50 border-border/40" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} />
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <label className="text-[11px] font-bold uppercase text-foreground/50">Cost</label>
                                                <Input type="number" placeholder="5000" className="h-8 text-xs bg-background/50 border-border/40" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                            </div>
                                            <Button size="sm" className="h-8 text-xs px-4">Add</Button>
                                        </form>
                                    </div>
                                )}

                                {/* List Body */}
                                <div className="space-y-3 flex-1">
                                    {expenses.length === 0 ? (
                                        <div className="py-8 text-center text-foreground/40 text-sm">No expenses. Adding one creates group debts automatically!</div>
                                    ) : (() => {
                                        const debtorsList = new Set(debts.map(d => d.from_user_id));
                                        const fullySettledMembers = members.filter(m => !debtorsList.has(m.user_id) && m.user_id !== trip.creator_id);
                                        const settledNames = fullySettledMembers.length > 0 ? fullySettledMembers.map(m => m.user_name?.split(" ")[0]).join(", ") : null;

                                        return expenses.slice(0, 8).map(exp => (
                                            <div key={exp.id} className="flex justify-between items-center p-3 rounded-xl border bg-background/40 border-border/40 hover:bg-surface/80 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-surface shadow-inner flex items-center justify-center font-black text-xs text-primary">
                                                        {(exp.category || "O").substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight">{exp.title}</p>
                                                        <p className="text-[10px] uppercase text-foreground/50 tracking-widest mt-0.5">
                                                            Added by <span className="text-foreground font-bold">{exp.payer_name || "Unknown"}</span>
                                                        </p>
                                                        {settledNames && (
                                                            <p className="text-[10px] uppercase tracking-widest mt-1 text-green-500/80 font-bold">
                                                                Settled by: <span className="text-green-500">{settledNames}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm">LKR {exp.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </Card>
                        </div>

                        {/* Right Column: Split & Debts */}
                        <div className="space-y-6">
                            {/* Split Summary */}
                            <Card className="p-6 bg-surface/50 border-border/50">
                                <p className="text-sm font-semibold text-foreground/60 tracking-wider uppercase mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> Group Splitting
                                </p>
                                <div className="space-y-3">
                                    {members.map((m) => {
                                        const isMe = m.user_id === currentUserId;
                                        return (
                                            <div key={m.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${isMe ? "bg-primary/5 border-primary/20" : "bg-background/40 border-border/40"}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${isMe ? "bg-primary text-white" : "bg-surface text-foreground"}`}>
                                                        {m.user_name?.charAt(0) || "?"}
                                                    </div>
                                                    <p className="font-bold text-xs flex items-center gap-1.5 whitespace-nowrap">
                                                        {isMe ? "You" : m.user_name}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold text-[13px] ${isMe ? "text-primary" : "text-foreground"}`}>
                                                        {spentPerPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Card>

                            {/* Settlements Box */}
                            <Card className="p-6 border-border flex flex-col min-h-[220px]">
                                <p className="text-sm font-semibold text-foreground/60 tracking-wider uppercase mb-4 flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-green-500" /> Auto Settlements
                                </p>
                                
                                <div className="space-y-3 flex-1 flex flex-col justify-center">
                                    {debts.length === 0 ? (
                                        <div className="text-center w-full">
                                            {allSettled && trip.status === "completed" ? (
                                                <>
                                                    <PartyPopper className="w-8 h-8 text-primary mx-auto mb-2" />
                                                    <p className="text-xs font-bold uppercase tracking-wider text-primary">All Settled!</p>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-6 h-6 text-foreground/20 mx-auto mb-2" />
                                                    <p className="text-[11px] font-medium text-foreground/50 uppercase tracking-wider">No Optimization Needed</p>
                                                </>
                                            )}
                                        </div>
                                    ) : debts.map((debt, i) => {
                                        const isMyDebt = debt.from_user_id === currentUserId;
                                        const isOwedToMe = debt.to_user_id === currentUserId;
                                        const canSettle = isMyDebt || isCreator;
        
                                        return (
                                            <div key={`${debt.from_user_id}-${debt.to_user_id}`} className={`p-3 rounded-lg border ${isMyDebt ? "border-red-500/20 bg-red-500/5" : isOwedToMe ? "border-green-500/20 bg-green-500/5" : "bg-background/40 border-border/40 text-foreground/60"} transition-all`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs font-bold w-1/3 truncate text-right">
                                                        {isMyDebt ? "You" : debt.from_user_name}
                                                    </p>
                                                    <div className="flex-1 flex items-center justify-center gap-1.5 px-2">
                                                        <div className="h-[1px] bg-border flex-1" />
                                                        <p className="text-[10px] font-black tracking-widest text-primary shrink-0">
                                                            {debt.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </p>
                                                        <ArrowRight className="w-3 h-3 text-border shrink-0" />
                                                    </div>
                                                    <p className="text-xs font-bold w-1/3 truncate text-left">
                                                        {isOwedToMe ? "You" : debt.to_user_name}
                                                    </p>
                                                </div>
                                                {canSettle && (
                                                    <button
                                                        onClick={() => setSettlingDebt(debt)}
                                                        className="w-full mt-1 pt-2 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-bold hover:bg-primary/10 rounded-md py-1.5 transition-colors"
                                                    >
                                                        <Check className="w-3 h-3" /> {isMyDebt ? "Mark Paid" : "Pay (Admin)"}
                                                    </button>
                                                )}
                                                <AnimatePresence>
                                                    {settlingDebt?.from_user_id === debt.from_user_id && settlingDebt?.to_user_id === debt.to_user_id && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                            <div className="flex gap-2 mt-2">
                                                                <Button size="sm" className="h-7 px-0 text-[10px] font-bold tracking-wider uppercase flex-1 rounded" onClick={() => handleSettle(debt)} disabled={settling}>
                                                                    {settling ? "..." : "Confirm"}
                                                                </Button>
                                                                <Button size="sm" variant="secondary" className="h-7 text-[10px] w-14 rounded" onClick={() => setSettlingDebt(null)}>
                                                                    X
                                                                </Button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </div>
                </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-3"
                    >
                        {settlements.length === 0 ? (
                            <Card className="p-6 text-center">
                                <History className="w-8 h-8 text-foreground/20 mx-auto mb-2" />
                                <p className="text-foreground/50 text-sm">No settlements recorded yet</p>
                            </Card>
                        ) : (
                            settlements.map((s, i) => (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-bold">
                                                    {s.from_user_id === currentUserId ? "You" : s.from_user_name}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-foreground/30" />
                                                <span className="font-bold">
                                                    {s.to_user_id === currentUserId ? "You" : s.to_user_name}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-400">
                                                    LKR {s.amount.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-foreground/40">
                                                    {new Date(s.settled_at).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        {s.note && (
                                            <p className="text-xs text-foreground/50 mt-2 italic">
                                                &ldquo;{s.note}&rdquo;
                                            </p>
                                        )}
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
