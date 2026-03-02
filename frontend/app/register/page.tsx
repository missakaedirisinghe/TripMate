"use client";

import React from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RegisterPage() {
    return (
        <AuthLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="mb-8 text-center lg:text-left">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Create Account</h1>
                    <p className="text-foreground/60">Start planning your next great adventure.</p>
                </div>

                <Card variant="glass" className="p-6 md:p-8 backdrop-blur-xl bg-surface/40 border-white/10">
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="name">Full Name</label>
                            <Input id="name" type="text" placeholder="Jane Doe" required />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="email">Email</label>
                            <Input id="email" type="email" placeholder="explorer@tripmate.lk" required />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="password">Password</label>
                            <Input id="password" type="password" placeholder="••••••••" required />
                        </div>

                        <Button type="submit" variant="primary" className="w-full mt-6">
                            Create Account
                        </Button>

                        <p className="text-center text-sm text-foreground/60 mt-4">
                            Already have an account?{" "}
                            <Link href="/login" className="text-primary hover:underline font-medium">
                                Log in
                            </Link>
                        </p>
                    </form>
                </Card>
            </motion.div>
        </AuthLayout>
    );
}
