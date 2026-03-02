"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
    variant?: "default" | "glass" | "interactive";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        const baseStyles = "rounded-3xl border border-border/50 overflow-hidden";

        const variants = {
            default: "bg-surface text-surface-foreground shadow-sm",
            glass: "glass text-foreground", // uses the @utility glass from globals.css
            interactive: "bg-surface text-surface-foreground shadow-md cursor-pointer hover:shadow-xl hover:border-primary/50 transition-shadow duration-300",
        };

        const isInteractive = variant === "interactive";

        return (
            <motion.div
                ref={ref}
                whileHover={isInteractive ? { y: -5 } : {}}
                className={cn(baseStyles, variants[variant], className)}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
Card.displayName = "Card";
