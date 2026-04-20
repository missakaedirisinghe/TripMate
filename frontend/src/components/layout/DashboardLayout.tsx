"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu, X, Compass, Home, Map, PlusCircle, Settings, Search, User, LogOut
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { FriendsSidebar } from "@/components/ui/FriendsSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isFriendsOpen, setFriendsOpen] = useState(false);
    const { user, logout } = useAuth();

    /** Derive initials from the real user name, fallback to "U" */
    const initials = user?.name
        ? user.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "U";

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
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{user?.name || "Explorer"}</p>
                                    <p className="text-xs text-foreground/50 truncate">{user?.email || ""}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-1.5 rounded-lg hover:bg-surface/80 text-foreground/40 hover:text-foreground transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
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
                        <button 
                            onClick={() => setFriendsOpen(true)}
                            className="hidden sm:flex items-center justify-center p-2 hover:bg-surface rounded-full transition-colors relative"
                            title="Friends"
                        >
                            <User className="w-5 h-5 text-foreground/80" />
                        </button>
                        <div className="hidden sm:block">
                            <NotificationBell />
                        </div>
                        
                        {/* Mobile Menu Toggle */}
                        <button 
                            onClick={() => setMobileMenuOpen(true)}
                            className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center md:hidden transition-colors hover:bg-surface/80"
                        >
                            <Menu className="w-5 h-5 text-foreground/80" />
                        </button>
                    </div>
                </header>

                {/* Mobile Navigation Overlay */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileMenuOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                            />
                            
                            {/* Sliding Sidebar */}
                            <motion.aside
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                className="fixed right-0 top-0 bottom-0 w-72 bg-surface/90 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-50 flex flex-col md:hidden"
                            >
                                <div className="p-6 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-2 text-white">
                                        <Compass className="w-6 h-6 text-primary" />
                                        <span className="text-lg font-bold tracking-tight">Menu</span>
                                    </div>
                                    <button 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-foreground/80" />
                                    </button>
                                </div>

                                <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                                        >
                                            <item.icon className="w-5 h-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>

                                <div className="p-6 border-t border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold">
                                            {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{user?.name || "Explorer"}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-foreground/40 hover:text-red-400 transition-colors"
                                            title="Logout"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {children}
                </main>
            </div>
            
            <FriendsSidebar isOpen={isFriendsOpen} onClose={() => setFriendsOpen(false)} />
        </div>
    );
}
