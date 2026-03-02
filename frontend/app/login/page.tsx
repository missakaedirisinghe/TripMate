"use client";

import React from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
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
                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="email">Email</label>
                            <Input id="email" type="email" placeholder="explorer@tripmate.lk" required />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium" htmlFor="password">Password</label>
                                <Link href="#" className="text-xs text-primary hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                            <Input id="password" type="password" placeholder="••••••••" required />
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="remember" className="rounded border-border bg-surface/50 text-primary focus:ring-primary h-4 w-4" />
                            <label htmlFor="remember" className="text-sm text-foreground/80">Remember me</label>
                        </div>

                        <Button type="submit" variant="primary" className="w-full">
                            Sign In
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
