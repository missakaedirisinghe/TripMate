"use client";

/**
 * TripMap — Interactive Leaflet.js map for the Trip Workspace.
 *
 * Plots itinerary activity markers and general destination markers.
 * Uses OpenStreetMap tiles (free, no API key required).
 */

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

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

export interface MapMarker {
    name: string;
    lat: number;
    lng: number;
    type?: "activity" | "destination";
    description?: string;
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
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker, i) => (
                    <Marker key={`${marker.name}-${i}`} position={[marker.lat, marker.lng]}>
                        <Popup>
                            <div className="text-sm">
                                <strong>{marker.name}</strong>
                                {marker.description && (
                                    <p className="text-xs mt-1 text-gray-600">{marker.description}</p>
                                )}
                                {marker.type && (
                                    <span className="text-xs text-primary capitalize">{marker.type}</span>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
