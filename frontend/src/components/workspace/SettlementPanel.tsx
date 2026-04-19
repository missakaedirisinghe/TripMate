/**
 * SettlementPanel — Expense settlement flow component.
 *
 * Shows who owes whom with optimized debt calculations,
 * allows marking debts as paid, and displays settlement history.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, History, Wallet, AlertCircle, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { expensesApi, type Settlement } from "@/lib/api";

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
}

export function SettlementPanel({ tripId, currentUserId }: SettlementPanelProps) {
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
            // Silently fail
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
                to_user_id: debt.to_user_id,
                amount: debt.amount,
                note: settleNote || undefined,
            });
            setSettlingDebt(null);
            setSettleNote("");
            await loadData();
        } catch {
            // Silently fail
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Settle Up
                </h3>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-foreground/60 hover:text-foreground flex items-center gap-1 transition-colors font-medium"
                >
                    <History className="w-4 h-4" />
                    {showHistory ? "Show Debts" : "History"}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {!showHistory ? (
                    <motion.div
                        key="debts"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-4"
                    >
                        {allSettled ? (
                            <Card className="p-8 text-center">
                                <PartyPopper className="w-12 h-12 text-primary mx-auto mb-3" />
                                <h4 className="font-bold text-lg mb-1">All Settled!</h4>
                                <p className="text-foreground/60 text-sm">
                                    Every member is squared up. No outstanding debts.
                                </p>
                            </Card>
                        ) : (
                            debts.map((debt, i) => {
                                const isMyDebt = debt.from_user_id === currentUserId;
                                const isOwedToMe = debt.to_user_id === currentUserId;

                                return (
                                    <motion.div
                                        key={`${debt.from_user_id}-${debt.to_user_id}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card
                                            className={`p-4 ${
                                                isMyDebt
                                                    ? "border-red-500/20 bg-red-500/5"
                                                    : isOwedToMe
                                                    ? "border-green-500/20 bg-green-500/5"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    {/* From User Avatar */}
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isMyDebt ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
                                                    }`}>
                                                        {(debt.from_user_name || "?").charAt(0)}
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className={`font-bold ${isMyDebt ? "text-red-400" : ""}`}>
                                                            {isMyDebt ? "You" : debt.from_user_name}
                                                        </span>
                                                        <ArrowRight className="w-4 h-4 text-foreground/30" />
                                                        <span className={`font-bold ${isOwedToMe ? "text-green-400" : ""}`}>
                                                            {isOwedToMe ? "You" : debt.to_user_name}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className="text-lg font-bold">
                                                    LKR {debt.amount.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Settle Button (only show if it's my debt) */}
                                            {isMyDebt && (
                                                <AnimatePresence>
                                                    {settlingDebt?.from_user_id === debt.from_user_id &&
                                                     settlingDebt?.to_user_id === debt.to_user_id ? (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                                                                <Input
                                                                    placeholder="Add a note (optional)"
                                                                    className="h-9 flex-1 text-sm"
                                                                    value={settleNote}
                                                                    onChange={(e) => setSettleNote(e.target.value)}
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    className="h-9"
                                                                    onClick={() => handleSettle(debt)}
                                                                    disabled={settling}
                                                                >
                                                                    {settling ? "..." : "Confirm"}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="h-9"
                                                                    onClick={() => {
                                                                        setSettlingDebt(null);
                                                                        setSettleNote("");
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </motion.div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSettlingDebt(debt)}
                                                            className="w-full mt-2 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg p-2 transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" /> Mark as Paid
                                                        </button>
                                                    )}
                                                </AnimatePresence>
                                            )}
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}

                        {debts.length > 0 && (
                            <p className="text-xs text-foreground/40 text-center mt-2 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Debts are optimized to minimize the number of transactions
                            </p>
                        )}
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
