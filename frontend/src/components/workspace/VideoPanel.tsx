"use client";

/**
 * VideoPanel — YouTube travel videos for a trip destination.
 *
 * Fetches from GET /api/videos/<destination> (YouTube Data API proxy).
 * Gracefully handles missing API key with a setup hint.
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Video {
    video_id: string;
    title: string;
    description: string;
    thumbnail: string;
    channel: string;
    published_at: string;
    url: string;
}

interface VideoPanelProps {
    destination: string;
}

export function VideoPanel({ destination }: VideoPanelProps) {
    const [cityVideos, setCityVideos] = useState<Record<string, Video[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!destination) return;

        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const token = localStorage.getItem("tripmate_token");

        const cities = destination.split(",").map(c => c.trim()).filter(Boolean);

        setLoading(true);
        Promise.all(cities.map(async (city) => {
            try {
                const res = await fetch(`${API}/videos/${encodeURIComponent(city)}?max_results=3`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                return { city, vids: data.videos || [] };
            } catch (err: any) {
                console.warn(`Videos failed for ${city}:`, err);
                return { city, vids: [] };
            }
        })).then(results => {
            const newVids: Record<string, Video[]> = {};
            let hasAny = false;
            for (const r of results) {
                if (r.vids.length > 0) hasAny = true;
                newVids[r.city] = r.vids;
            }
            if (!hasAny) {
                setError("Unable to fetch videos for any destinations.");
            } else {
                setCityVideos(newVids);
            }
            setLoading(false);
        });
    }, [destination]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <p className="text-sm text-foreground/60">{error}</p>
            </Card>
        );
    }

    if (Object.values(cityVideos).every(vids => vids.length === 0)) {
        return (
            <Card className="p-6 text-center">
                <Play className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-foreground/50">No videos found for {destination}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(cityVideos).map(([city, videos]) => {
                if (videos.length === 0) return null;
                return (
                    <div key={city} className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2 border-b border-border/50 pb-2">
                            <Play className="w-4 h-4 text-primary" />
                            Travel Videos — {city}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {videos.map((video, i) => (
                                <motion.a
                                    key={video.video_id}
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group block"
                                >
                                    <Card variant="interactive" className="overflow-hidden">
                                        {/* Thumbnail */}
                                        <div className="relative aspect-video overflow-hidden">
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                                                    <Play className="w-5 h-5 text-white fill-white" />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Info */}
                                        <div className="p-3 space-y-1">
                                            <h4 className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                                {video.title}
                                            </h4>
                                            <p className="text-[10px] text-foreground/40">{video.channel}</p>
                                        </div>
                                    </Card>
                                </motion.a>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
