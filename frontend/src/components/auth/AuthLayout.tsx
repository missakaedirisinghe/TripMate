import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Left side: Cinematic Image */}
            <div className="hidden lg:flex flex-1 relative bg-surface">
                <div
                    className="absolute inset-0 bg-cover bg-center brightness-50"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=2678&auto=format&fit=crop')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-end p-12 text-white">
                    <h2 className="text-4xl font-bold tracking-tight mb-4 max-w-lg">
                        Your Journey Begins Here
                    </h2>
                    <p className="text-lg text-white/80 max-w-md">
                        Join thousands of travelers planning their dream trips to Sri Lanka with smart budgets and real-time collaboration.
                    </p>
                </div>
            </div>

            {/* Right side: Form Container */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
