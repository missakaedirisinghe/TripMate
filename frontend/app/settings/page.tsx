"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { authApi, type User as UserType } from "@/lib/api";

export default function SettingsPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }
        setName(user.name || "");
        setEmail(user.email || "");
    }, [user, authLoading, router]);

    /** Save profile (name/email) via PUT /api/auth/me. */
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            await authApi.updateProfile({ name, email });
            setProfileMsg({ type: "success", text: "Profile updated successfully." });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update profile.";
            setProfileMsg({ type: "error", text: message });
        } finally {
            setSavingProfile(false);
        }
    };

    /** Update password via PUT /api/auth/me. */
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: "error", text: "New passwords do not match." });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: "error", text: "Password must be at least 6 characters." });
            return;
        }

        setSavingPassword(true);
        try {
            await authApi.updateProfile({
                password: newPassword,
            } as Partial<UserType> & { password?: string });
            setPasswordMsg({ type: "success", text: "Password updated. Please log in again." });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update password.";
            setPasswordMsg({ type: "error", text: message });
        } finally {
            setSavingPassword(false);
        }
    };

    if (authLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20" />
                        <p className="text-foreground/50">Loading settings...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-foreground/60 mt-1">Manage your account preferences</p>
                </div>

                {/* Profile Section */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" /> Profile Information
                        </h2>
                        <form onSubmit={handleSaveProfile} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/70">Full Name</label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                                    <Input
                                        className="pl-10"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/70">Email</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                                    <Input
                                        className="pl-10"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {profileMsg && (
                                <p className={`text-sm ${profileMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                                    {profileMsg.text}
                                </p>
                            )}

                            <Button type="submit" disabled={savingProfile} className="gap-2">
                                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </Button>
                        </form>
                    </Card>
                </motion.div>

                {/* Password Section */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" /> Change Password
                        </h2>
                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/70">Current Password</label>
                                <Input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/70">New Password</label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground/70">Confirm New Password</label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {passwordMsg && (
                                <p className={`text-sm ${passwordMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                                    {passwordMsg.text}
                                </p>
                            )}

                            <Button type="submit" disabled={savingPassword} className="gap-2">
                                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Update Password
                            </Button>
                        </form>
                    </Card>
                </motion.div>

                {/* Danger Zone */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="p-6 border-red-500/20">
                        <h2 className="text-lg font-semibold mb-3 text-red-400">Danger Zone</h2>
                        <p className="text-sm text-foreground/50 mb-4">
                            Log out of your account on this device.
                        </p>
                        <Button
                            variant="ghost"
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={logout}
                        >
                            Log Out
                        </Button>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
