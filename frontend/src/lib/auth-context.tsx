"use client";

/**
 * Authentication Context Provider
 *
 * Manages user session state, JWT token persistence, and provides
 * login/register/logout functions to all child components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, setToken, clearToken, type User, ApiError } from "@/lib/api";

interface AuthContextType {
    /** Currently authenticated user, or null if not logged in. */
    user: User | null;
    /** Whether auth state is still being determined on mount. */
    loading: boolean;
    /** Log in with email and password. Returns user on success. */
    login: (email: string, password: string) => Promise<User>;
    /** Register a new account. Returns user on success. */
    register: (name: string, email: string, password: string) => Promise<User>;
    /** Log out and redirect to login page. */
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem("tripmate_token");
        if (token) {
            authApi
                .getProfile()
                .then((res) => setUser(res.user))
                .catch(() => {
                    clearToken();
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await authApi.login({ email, password });
        setToken(res.token);
        setUser(res.user);
        return res.user;
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const res = await authApi.register({ name, email, password });
        setToken(res.token);
        setUser(res.user);
        return res.user;
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
        router.push("/login");
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
