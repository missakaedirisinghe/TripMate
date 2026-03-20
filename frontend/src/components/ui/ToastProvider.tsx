"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            toastOptions={{
                className: "bg-surface/80 backdrop-blur-xl border border-white/10 text-foreground shadow-2xl rounded-2xl",
                style: {
                    background: "rgba(15, 23, 42, 0.8)", // surface color with opacity
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(16px)"
                }
            }}
        />
    );
}
