/**
 * TripMate API Client
 *
 * Centralized fetch wrapper for all backend API calls.
 * Handles JWT token management, error responses, and base URL configuration.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Get the stored JWT token from localStorage.
 */
function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("tripmate_token");
}

/**
 * Store JWT token in localStorage.
 */
export function setToken(token: string): void {
    localStorage.setItem("tripmate_token", token);
}

/**
 * Remove JWT token from localStorage.
 */
export function clearToken(): void {
    localStorage.removeItem("tripmate_token");
}

/**
 * Core fetch wrapper with auth headers and error handling.
 */
async function apiFetch<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(
            data.error || "Something went wrong",
            response.status,
            data
        );
    }

    return data as T;
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

// ─── Auth API ────────────────────────────────────────────────

export const authApi = {
    register: (body: { name: string; email: string; password: string }) =>
        apiFetch<{ token: string; user: User; message: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    login: (body: { email: string; password: string }) =>
        apiFetch<{ token: string; user: User; message: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    getProfile: () =>
        apiFetch<{ user: User }>("/auth/me"),

    updateProfile: (body: Partial<User>) =>
        apiFetch<{ user: User; message: string }>("/auth/me", {
            method: "PUT",
            body: JSON.stringify(body),
        }),
};

// ─── Trips API ───────────────────────────────────────────────

export const tripsApi = {
    list: () =>
        apiFetch<{ trips: Trip[] }>("/trips"),

    create: (body: Partial<Trip>) =>
        apiFetch<{ trip: Trip; message: string }>("/trips", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    get: (tripId: string) =>
        apiFetch<{ trip: Trip }>(`/trips/${tripId}`),

    update: (tripId: string, body: Partial<Trip>) =>
        apiFetch<{ trip: Trip; message: string }>(`/trips/${tripId}`, {
            method: "PUT",
            body: JSON.stringify(body),
        }),

    delete: (tripId: string) =>
        apiFetch<{ message: string }>(`/trips/${tripId}`, { method: "DELETE" }),

    invite: (tripId: string, email: string, role?: string) =>
        apiFetch<{ member: TripMember; message: string }>(`/trips/${tripId}/invite`, {
            method: "POST",
            body: JSON.stringify({ email, role }),
        }),

    listMembers: (tripId: string) =>
        apiFetch<{ members: TripMember[] }>(`/trips/${tripId}/members`),

    removeMember: (tripId: string, userId: string) =>
        apiFetch<{ message: string }>(`/trips/${tripId}/members/${userId}`, {
            method: "DELETE",
        }),
};

// ─── Itinerary API ───────────────────────────────────────────

export const itineraryApi = {
    listDays: (tripId: string) =>
        apiFetch<{ days: ItineraryDay[] }>(`/trips/${tripId}/days`),

    addDay: (tripId: string, body: { day_number: number; date?: string }) =>
        apiFetch<{ day: ItineraryDay; message: string }>(`/trips/${tripId}/days`, {
            method: "POST",
            body: JSON.stringify(body),
        }),

    deleteDay: (tripId: string, dayId: string) =>
        apiFetch<{ message: string }>(`/trips/${tripId}/days/${dayId}`, {
            method: "DELETE",
        }),

    addActivity: (tripId: string, dayId: string, body: Partial<ActivityItem>) =>
        apiFetch<{ activity: ActivityItem; message: string }>(
            `/trips/${tripId}/days/${dayId}/activities`,
            { method: "POST", body: JSON.stringify(body) }
        ),

    updateActivity: (tripId: string, dayId: string, actId: string, body: Partial<ActivityItem>) =>
        apiFetch<{ activity: ActivityItem; message: string }>(
            `/trips/${tripId}/days/${dayId}/activities/${actId}`,
            { method: "PUT", body: JSON.stringify(body) }
        ),

    deleteActivity: (tripId: string, dayId: string, actId: string) =>
        apiFetch<{ message: string }>(
            `/trips/${tripId}/days/${dayId}/activities/${actId}`,
            { method: "DELETE" }
        ),
};

// ─── Expenses API ────────────────────────────────────────────

export const expensesApi = {
    list: (tripId: string) =>
        apiFetch<{ expenses: Expense[]; total: number }>(`/trips/${tripId}/expenses`),

    add: (tripId: string, body: Partial<Expense>) =>
        apiFetch<{ expense: Expense; message: string }>(`/trips/${tripId}/expenses`, {
            method: "POST",
            body: JSON.stringify(body),
        }),

    delete: (tripId: string, expenseId: string) =>
        apiFetch<{ message: string }>(`/trips/${tripId}/expenses/${expenseId}`, {
            method: "DELETE",
        }),

    budgetSummary: (tripId: string) =>
        apiFetch<BudgetSummary>(`/trips/${tripId}/budget-summary`),
};

// ─── Votes API ───────────────────────────────────────────────

export const votesApi = {
    cast: (tripId: string, body: { vote_type: string; target_id: string; target_value?: string }) =>
        apiFetch<{ vote: Vote; message: string }>(`/trips/${tripId}/votes`, {
            method: "POST",
            body: JSON.stringify(body),
        }),

    get: (tripId: string, voteType?: string) =>
        apiFetch<{ tallies: VoteTally[]; total_votes: number }>(
            `/trips/${tripId}/votes${voteType ? `?vote_type=${voteType}` : ""}`
        ),

    retract: (tripId: string, voteId: string) =>
        apiFetch<{ message: string }>(`/trips/${tripId}/votes/${voteId}`, {
            method: "DELETE",
        }),
};

// ─── Recommendations API ─────────────────────────────────────

export const recommendApi = {
    getRecommendations: (body: { activities: string[]; bucket_list: string[]; max_budget?: number; duration?: number }) =>
        apiFetch<RecommendationResult>("/recommend", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    estimateCost: (body: {
        destination: string;
        duration_days: number;
        num_travelers: number;
        vehicle_type: string;
        accommodation_type: string;
    }) =>
        apiFetch<CostEstimation>("/estimate-cost", {
            method: "POST",
            body: JSON.stringify(body),
        }),
};

// ─── Type Definitions ────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    preferred_activities?: string[];
    bucket_list?: string[];
    created_at: string;
}

export interface Trip {
    id: string;
    title: string;
    destination: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    budget_limit?: number;
    trip_type?: string;
    status: string;
    creator_id: string;
    created_at: string;
    members?: TripMember[];
    member_count?: number;
    total_spent?: number;
    budget_remaining?: number;
}

export interface TripMember {
    id: string;
    trip_id: string;
    user_id: string;
    user_name?: string;
    user_email?: string;
    role: string;
    joined_at: string;
}

export interface ItineraryDay {
    id: string;
    trip_id: string;
    day_number: number;
    date?: string;
    order_index: number;
    activities: ActivityItem[];
}

export interface ActivityItem {
    id: string;
    day_id: string;
    title: string;
    description?: string;
    time_slot?: string;
    category?: string;
    estimated_cost: number;
    lat?: number;
    lng?: number;
    order_index: number;
}

export interface Expense {
    id: string;
    trip_id: string;
    paid_by: string;
    payer_name?: string;
    title: string;
    amount: number;
    category?: string;
    split_type: string;
    split_details: Record<string, number>;
    created_at: string;
}

export interface Vote {
    id: string;
    trip_id: string;
    user_id: string;
    voter_name?: string;
    vote_type: string;
    target_id: string;
    target_value?: string;
    created_at: string;
}

export interface VoteTally {
    vote_type: string;
    target_id: string;
    target_value?: string;
    count: number;
    voters: { user_id: string; voter_name?: string }[];
}

export interface BudgetSummary {
    budget_limit: number | null;
    total_spent: number;
    budget_remaining: number | null;
    expense_count: number;
    member_balances: {
        user_id: string;
        user_name?: string;
        paid: number;
        owes: number;
        balance: number;
    }[];
}

export interface RecommendationResult {
    recommended_route: {
        name: string;
        lat: number;
        lng: number;
        address?: string;
        rating?: number;
    }[];
    route_count: number;
    input_activities: string[];
    input_bucket_list: string[];
}

export interface CostEstimation {
    estimation: {
        accommodation: number;
        transport: number;
        food: number;
        activities: number;
        total: number;
        per_person: number;
    };
    parameters: Record<string, unknown>;
    note: string;
}
