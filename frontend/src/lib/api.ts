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
export function getToken(): string | null {
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

export interface Friendship {
    id: string;
    user_id: string;
    friend_id: string;
    status: "pending" | "accepted";
    created_at: string;
    user?: User; // Depending on direction
    friend?: User; // Depending on direction
}

// ─── Auth API ────────────────────────────────────────────────

export const authApi = {
    register: (body: { name: string; email: string; password: string }) =>
        apiFetch<{ token: string; user: User; message: string; accepted_invites?: string[] }>("/auth/register", {
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

// ─── Friends API ─────────────────────────────────────────────

export const friendsApi = {
    list: () =>
        apiFetch<{
            friends: { id: string; user: User; status: "accepted" }[];
            pending_sent: { id: string; user: User; status: "pending" }[];
            pending_received: { id: string; user: User; status: "pending" }[];
        }>("/friends"),

    sendRequest: (email: string) =>
        apiFetch<{ message: string; friendship: Friendship }>("/friends/request", {
            method: "POST",
            body: JSON.stringify({ email }),
        }),

    acceptRequest: (friendshipId: string) =>
        apiFetch<{ message: string }>(`/friends/accept/${friendshipId}`, {
            method: "PUT",
        }),

    remove: (friendshipId: string) =>
        apiFetch<{ message: string }>(`/friends/${friendshipId}`, {
            method: "DELETE",
        }),
};

// ─── Trips API ───────────────────────────────────────────────

export const tripsApi = {
    list: () =>
        apiFetch<{ trips: Trip[] }>("/trips"),

    create: (body: Partial<Trip> & { invited_friends?: string[] }) =>
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
        apiFetch<{ member?: TripMember; invite?: PendingInvite; message: string; email_sent?: boolean }>(
            `/trips/${tripId}/invite`,
            {
                method: "POST",
                body: JSON.stringify({ email, role }),
            }
        ),

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

    update: (tripId: string, expenseId: string, body: Partial<Expense>) =>
        apiFetch<{ expense: Expense; message: string }>(`/trips/${tripId}/expenses/${expenseId}`, {
            method: "PUT",
            body: JSON.stringify(body),
        }),

    delete: (tripId: string, expenseId: string) =>
        apiFetch<{ message: string }>(`/trips/${tripId}/expenses/${expenseId}`, {
            method: "DELETE",
        }),

    budgetSummary: (tripId: string) =>
        apiFetch<BudgetSummary>(`/trips/${tripId}/budget-summary`),

    /** Get optimized debt settlement between members */
    getDebts: (tripId: string) =>
        apiFetch<DebtSummary>(`/trips/${tripId}/debts`),

    /** List recorded settlements */
    listSettlements: (tripId: string) =>
        apiFetch<{ settlements: Settlement[] }>(`/trips/${tripId}/settlements`),

    /** Record a settlement payment */
    addSettlement: (tripId: string, body: { to_user_id: string; amount: number; note?: string; from_user_id?: string }) =>
        apiFetch<{ settlement: Settlement; message: string }>(`/trips/${tripId}/settlements`, {
            method: "POST",
            body: JSON.stringify(body),
        }),
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
    getRecommendations: (body: {
        activities: string[];
        bucket_list: string[];
        max_budget?: number;
        duration?: number;
        destination_days?: Record<string, number>;
    }) =>
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

// ─── Notifications API ───────────────────────────────────────

export const notificationsApi = {
    /** List notifications with pagination */
    list: (page = 1, perPage = 20, unreadOnly = false) =>
        apiFetch<NotificationListResponse>(
            `/notifications?page=${page}&per_page=${perPage}&unread_only=${unreadOnly}`
        ),

    /** Get unread notification count */
    unreadCount: () =>
        apiFetch<{ unread_count: number }>("/notifications/unread-count"),

    /** Mark a single notification as read */
    markRead: (notificationId: string) =>
        apiFetch<{ notification: AppNotification; message: string }>(
            `/notifications/${notificationId}/read`,
            { method: "PUT" }
        ),

    /** Mark all notifications as read */
    markAllRead: () =>
        apiFetch<{ count: number; message: string }>("/notifications/read-all", {
            method: "PUT",
        }),
};

// ─── Destinations API (public, no auth) ──────────────────────

export const destinationsApi = {
    /** Search destinations by name */
    search: (query: string) =>
        apiFetch<{ destinations: DestinationResult[]; count: number }>(
            `/destinations?search=${encodeURIComponent(query)}`
        ),
};

// ─── Chat API ────────────────────────────────────────────────

export const chatApi = {
    /** Get paginated chat messages for a trip */
    getMessages: (tripId: string, page = 1) =>
        apiFetch<{ messages: ChatMessage[]; total: number; page: number; pages: number; has_more: boolean }>(
            `/trips/${tripId}/chat?page=${page}`
        ),

    /** Send a chat message */
    sendMessage: (tripId: string, message: string) =>
        apiFetch<{ message: ChatMessage }>(`/trips/${tripId}/chat`, {
            method: "POST",
            body: JSON.stringify({ message }),
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
    image_url?: string;
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

export interface Settlement {
    id: string;
    trip_id: string;
    from_user_id: string;
    from_user_name?: string;
    to_user_id: string;
    to_user_name?: string;
    amount: number;
    note?: string;
    settled_at: string;
}

export interface DebtSummary {
    debts: {
        from_user_id: string;
        from_user_name?: string;
        to_user_id: string;
        to_user_name?: string;
        amount: number;
    }[];
    all_settled: boolean;
}

export interface PendingInvite {
    id: string;
    trip_id: string;
    email: string;
    role: string;
    invited_by?: string;
    inviter_name?: string;
    created_at: string;
    expires_at: string;
    accepted: boolean;
}

export interface AppNotification {
    id: string;
    user_id: string;
    trip_id?: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    data: Record<string, unknown>;
    created_at: string;
}

export interface NotificationListResponse {
    notifications: AppNotification[];
    total: number;
    page: number;
    pages: number;
    has_next: boolean;
}

export interface DestinationResult {
    id: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
    rating?: number;
    activities: string[];
    image_url?: string;
    description?: string;
}

export interface RecommendationResult {
    recommended_route: {
        name: string;
        lat: number;
        lng: number;
        address?: string;
        rating?: number;
        image_url?: string;
        day?: number;
        category?: string;
        title?: string;
    }[];
    route_count: number;
    input_activities: string[];
    input_bucket_list: string[];
    multi_destination?: boolean;
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
    model_version?: string;
    note: string;
}

export interface ChatMessage {
    id: string;
    trip_id: string;
    user_id: string;
    user_name?: string;
    user_avatar?: string;
    message: string;
    created_at: string;
}
