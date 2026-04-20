"use client";

/**
 * TripMap — Interactive Leaflet.js map for the Trip Workspace.
 *
 * Features:
 * - Plots itinerary activity markers and general destination markers
 * - Polyline routing between stops with color-coded day segments
 * - Day number labels on markers
 * - Destination info popups with images
 * - "Export to Google Maps" button for directions
 * - Uses OpenStreetMap tiles (free, no API key required)
 */

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2, ExternalLink } from "lucide-react";

/** Lazy-load react-leaflet to avoid SSR issues. */
const MapContainer = dynamic(
    () => import("react-leaflet").then((m) => m.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((m) => m.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((m) => m.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((m) => m.Popup),
    { ssr: false }
);
const Polyline = dynamic(
    () => import("react-leaflet").then((m) => m.Polyline),
    { ssr: false }
);

export interface MapMarker {
    name: string;
    lat: number;
    lng: number;
    type?: string;
    description?: string;
    image_url?: string;
    rating?: number;
    dayNumber?: number;
}

interface TripMapProps {
    /** Activity markers from itinerary */
    markers?: MapMarker[];
    /** Trip destination name for centering */
    destination?: string;
    className?: string;
}

/** Center of Sri Lanka as default */
const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
const DEFAULT_ZOOM = 8;

/** Day colors for polyline routing */
const DAY_COLORS = [
    "#6366f1", // indigo
    "#f59e0b", // amber
    "#10b981", // emerald
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#f97316", // orange
    "#ec4899", // pink
    "#14b8a6", // teal
    "#a855f7", // purple
];

export function TripMap({ markers = [], destination, className = "" }: TripMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Fix Leaflet default marker icons in Next.js
        if (typeof window !== "undefined") {
            const L = require("leaflet");
            delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            });
        }
    }, []);

    /** Group markers by day for polyline routing */
    const dayGroups = useMemo(() => {
        const groups: Record<number, MapMarker[]> = {};
        for (const m of markers) {
            const day = m.dayNumber || 0;
            if (!groups[day]) groups[day] = [];
            groups[day].push(m);
        }
        return groups;
    }, [markers]);

    /** Polyline segments per day */
    const polylines = useMemo(() => {
        const lines: { positions: [number, number][]; color: string; day: number }[] = [];

        // Build polyline from activity markers in order
        const activityMarkers = markers.filter(m => m.type === "activity" && m.dayNumber);
        const days = [...new Set(activityMarkers.map(m => m.dayNumber!))].sort((a, b) => a - b);

        // Create continuous segments strictly in chronological activity order
        for (let i = 0; i < activityMarkers.length - 1; i++) {
            const current = activityMarkers[i];
            const next = activityMarkers[i + 1];
            const dayToUse = current.dayNumber || 1;
            
            lines.push({
                positions: [[current.lat, current.lng], [next.lat, next.lng]],
                color: DAY_COLORS[(dayToUse - 1) % DAY_COLORS.length],
                day: dayToUse,
            });
        }

        return lines;
    }, [markers]);

    /** Generate Google Maps directions URL */
    const googleMapsUrl = useMemo(() => {
        const activityMarkers = markers.filter(m => m.type === "activity");
        if (activityMarkers.length < 2) return null;

        const origin = `${activityMarkers[0].lat},${activityMarkers[0].lng}`;
        const dest = `${activityMarkers[activityMarkers.length - 1].lat},${activityMarkers[activityMarkers.length - 1].lng}`;
        const waypoints = activityMarkers
            .slice(1, -1)
            .map(m => `${m.lat},${m.lng}`)
            .join("|");

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
        if (waypoints) url += `&waypoints=${waypoints}`;
        url += `&travelmode=driving`;

        return url;
    }, [markers]);

    if (!mounted) {
        return (
            <div className={`flex items-center justify-center h-[400px] rounded-2xl bg-surface/50 border border-border ${className}`}>
                <div className="flex flex-col items-center gap-3 text-foreground/40">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Loading map...</span>
                </div>
            </div>
        );
    }

    // Determine center from markers or default
    const center: [number, number] =
        markers.length > 0
            ? [markers[0].lat, markers[0].lng]
            : SRI_LANKA_CENTER;

    const zoom = markers.length > 0 ? 10 : DEFAULT_ZOOM;

    const containerClasses = className.includes('h-') ? className : `h-[400px] ${className}`;

    return (
        <div className={`w-full rounded-2xl overflow-hidden border border-border ${containerClasses}`}>
            {/* Export to Google Maps */}
            {googleMapsUrl && (
                <div className="absolute top-3 right-3 z-[1000]">
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/90 backdrop-blur-md border border-border hover:bg-surface text-xs font-medium text-foreground transition-all shadow-lg"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Export to Google Maps
                    </a>
                </div>
            )}

            {/* Day Legend */}
            {polylines.length > 0 && (
                <div className="absolute bottom-3 left-3 z-[1000] flex gap-2 flex-wrap">
                    {[...new Set(polylines.filter(p => p.day > 0).map(p => p.day))].sort().map(day => (
                        <span
                            key={day}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-surface/90 backdrop-blur-md border border-border shadow-sm"
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: DAY_COLORS[(day - 1) % DAY_COLORS.length] }}
                            />
                            Day {day}
                        </span>
                    ))}
                </div>
            )}

            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Polyline routes */}
                {polylines.map((line, i) => (
                    <Polyline
                        key={`polyline-${i}`}
                        positions={line.positions}
                        pathOptions={{
                            color: line.color,
                            weight: line.day === 0 ? 2 : 3,
                            opacity: line.day === 0 ? 0.4 : 0.8,
                            dashArray: line.day === 0 ? "8 8" : undefined,
                        }}
                    />
                ))}

                {markers.map((marker, i) => (
                    <Marker key={`${marker.name}-${i}`} position={[marker.lat, marker.lng]}>
                        <Popup className="custom-popup min-w-[200px]">
                            <div className="flex flex-col gap-2 overflow-hidden">
                                {marker.image_url && (
                                    <div className="h-28 -m-1 mb-1 overflow-hidden rounded-t-lg">
                                        <img 
                                            src={marker.image_url} 
                                            alt={marker.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        {marker.dayNumber && marker.dayNumber > 0 && (
                                            <span
                                                className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: DAY_COLORS[(marker.dayNumber - 1) % DAY_COLORS.length] }}
                                            >
                                                {marker.dayNumber}
                                            </span>
                                        )}
                                        <h3 className="font-semibold text-base leading-tight text-foreground">{marker.name}</h3>
                                    </div>
                                    {marker.rating && marker.rating > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-sm font-medium text-amber-500">{marker.rating.toFixed(1)}</span>
                                            <span className="text-xs text-amber-500">★</span>
                                        </div>
                                    )}
                                </div>
                                {marker.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                        {marker.description}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
