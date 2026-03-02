"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu, X, Compass, Home, Map, PlusCircle, Settings, Bell, Search, User
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { icon: Home, label: "Dashboard", href: "/dashboard" },
        { icon: Map, label: "My Trips", href: "/trips" },
        { icon: PlusCircle, label: "Create Trip", href: "/trip/create" },
        { icon: Settings, label: "Settings", href: "/settings" },
    ];

    return (
        <div className="flex bg-background min-h-screen text-foreground overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="hidden md:flex flex-col border-r border-border bg-surface/50 backdrop-blur-xl h-screen sticky top-0"
                    >
                        <div className="p-6 flex items-center gap-3">
                            <Compass className="w-8 h-8 text-primary" />
                            <span className="text-xl font-bold tracking-tight">TripMate</span>
                        </div>

                        <div className="flex-1 px-4 py-8 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="flex items-center gap-4 px-4 py-3 rounded-2xl text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="p-6 border-t border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold">
                                    JS
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Jane Smith</p>
                                    <p className="text-xs text-foreground/50">Pro Explorer</p>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Navbar */}
                <header className="h-20 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-6 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-surface rounded-full transition-colors hidden md:block"
                        >
                            <Menu className="w-6 h-6 text-foreground/80" />
                        </button>
                        <div className="relative hidden sm:block w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
                            <Input className="pl-10 rounded-full h-10 bg-surface/50 border-none" placeholder="Search trips..." />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-surface rounded-full transition-colors relative">
                            <Bell className="w-5 h-5 text-foreground/80" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                        </button>
                        <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center md:hidden">
                            <User className="w-5 h-5 text-foreground/80" />
                        </div>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
