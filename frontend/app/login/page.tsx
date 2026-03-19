"use client";

import React, { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="mb-8 text-center lg:text-left">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-foreground/60">Log in to manage your Sri Lankan trips.</p>
                </div>

                <Card variant="glass" className="p-6 md:p-8 backdrop-blur-xl bg-surface/40 border-white/10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="email">Email</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="explorer@tripmate.lk"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium" htmlFor="password">Password</label>
                                <Link href="#" className="text-xs text-primary hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="remember" className="rounded border-border bg-surface/50 text-primary focus:ring-primary h-4 w-4" />
                            <label htmlFor="remember" className="text-sm text-foreground/80">Remember me</label>
                        </div>

                        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>

                        <p className="text-center text-sm text-foreground/60 mt-4">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-primary hover:underline font-medium">
                                Create one
                            </Link>
                        </p>
                    </form>
                </Card>
            </motion.div>
        </AuthLayout>
    );
}
