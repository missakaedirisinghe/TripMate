"use client";

/**
 * WeatherPanel — 5-day weather forecast for a trip destination.
 *
 * Fetches from GET /api/weather/<destination> (OpenWeatherMap proxy).
 * Gracefully handles missing API key with a setup hint.
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, Droplets, Wind, Thermometer, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Forecast {
    datetime: string;
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    weather: string;
    description: string;
    icon: string;
    wind_speed: number;
}

interface WeatherPanelProps {
    destination: string;
}

export function WeatherPanel({ destination }: WeatherPanelProps) {
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [city, setCity] = useState<string>("");

    useEffect(() => {
        if (!destination) return;

        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const token = localStorage.getItem("tripmate_token");

        fetch(`${API}/weather/${encodeURIComponent(destination)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setForecasts(data.forecasts || []);
                    setCity(data.city || destination);
                }
            })
            .catch(() => setError("Unable to fetch weather data"))
            .finally(() => setLoading(false));
    }, [destination]);

    /** Group forecasts by day, take one per day (noon preferred). */
    const dailyForecasts = React.useMemo(() => {
        const byDay = new Map<string, Forecast>();
        for (const f of forecasts) {
            const date = f.datetime.split(" ")[0];
            const hour = parseInt(f.datetime.split(" ")[1]?.split(":")[0] || "0");
            if (!byDay.has(date) || Math.abs(hour - 12) < Math.abs(parseInt(byDay.get(date)!.datetime.split(" ")[1]?.split(":")[0] || "0") - 12)) {
                byDay.set(date, f);
            }
        }
        return Array.from(byDay.values()).slice(0, 5);
    }, [forecasts]);

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

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                5-Day Forecast — {city}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {dailyForecasts.map((f, i) => {
                    const date = new Date(f.datetime);
                    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                    return (
                        <motion.div
                            key={f.datetime}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Card className="p-4 text-center space-y-2">
                                <p className="text-xs font-semibold text-foreground/50">{dayName}</p>
                                <p className="text-[10px] text-foreground/30">{dateStr}</p>
                                <img
                                    src={`https://openweathermap.org/img/wn/${f.icon}@2x.png`}
                                    alt={f.description}
                                    className="w-12 h-12 mx-auto"
                                />
                                <p className="text-lg font-bold">{Math.round(f.temp)}°C</p>
                                <p className="text-[10px] text-foreground/50 capitalize">{f.description}</p>
                                <div className="flex items-center justify-center gap-2 text-[10px] text-foreground/40">
                                    <span className="flex items-center gap-0.5">
                                        <Droplets className="w-3 h-3" /> {f.humidity}%
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Wind className="w-3 h-3" /> {f.wind_speed}m/s
                                    </span>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
