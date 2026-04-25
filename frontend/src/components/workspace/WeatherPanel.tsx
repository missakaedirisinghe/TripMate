"use client";

/**
 * WeatherPanel — 5-day weather forecast for a trip destination.
 *
 * Fetches from GET /api/weather/<destination> (OpenWeatherMap proxy).
 * Gracefully handles missing API key with a setup hint.
 */

import React, { useEffect, useState, useMemo } from "react";
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
    days?: any[];
}

export function WeatherPanel({ destination, days }: WeatherPanelProps) {
    const [cityForecasts, setCityForecasts] = useState<Record<string, Forecast[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!destination) return;

        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const token = localStorage.getItem("tripmate_token");

        setLoading(true);
        setError(null);

        const cities = destination.split(",").map(c => c.trim()).filter(Boolean);

        const fetchCityWeather = async (city: string) => {
            try {
                const res = await fetch(`${API}/weather/${encodeURIComponent(city)}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                return { city: city, forecasts: data.forecasts || [] };
            } catch (err: any) {
                console.warn(`Weather failed for ${city}:`, err);
                return null;
            }
        };

        Promise.all(cities.map(c => fetchCityWeather(c))).then(results => {
            const newForecasts: Record<string, Forecast[]> = {};
            let hasValid = false;
            for (const r of results) {
                if (r && r.forecasts.length > 0) {
                    newForecasts[r.city.toLowerCase()] = r.forecasts;
                    hasValid = true;
                }
            }
            if (!hasValid) {
                setError("Unable to fetch weather data for any destinations.");
            } else {
                setCityForecasts(newForecasts);
            }
            setLoading(false);
        });

    }, [destination]);

    /** Helper to group forecasts by day, take noon preferred */
    const getDailyForecasts = (forecasts: Forecast[]) => {
        const byDay = new Map<string, Forecast>();
        for (const f of forecasts) {
            const date = f.datetime.split(" ")[0];
            const hour = parseInt(f.datetime.split(" ")[1]?.split(":")[0] || "0");
            if (!byDay.has(date) || Math.abs(hour - 12) < Math.abs(parseInt(byDay.get(date)!.datetime.split(" ")[1]?.split(":")[0] || "0") - 12)) {
                byDay.set(date, f);
            }
        }
        return Array.from(byDay.values()).slice(0, 5);
    };

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
        <div className="space-y-8">
            {/* If we have an itinerary, show timeline. Otherwise show original per-city view */}
            {days && days.length > 0 ? (
                <div className="space-y-8">
                    {(() => {
                        const cities = destination.split(",").map(c => c.trim()).filter(Boolean);
                        let currentCity = cities[0] || "Unknown";
                        
                        const blocks: { city: string, days: any[] }[] = [];

                        days.forEach((day) => {
                            for (const act of day.activities || []) {
                                for (const c of cities) {
                                    if (
                                        act.title?.toLowerCase().includes(c.toLowerCase()) ||
                                        act.description?.toLowerCase().includes(c.toLowerCase())
                                    ) {
                                        currentCity = c;
                                        break;
                                    }
                                }
                            }
                            
                            if (blocks.length === 0 || blocks[blocks.length - 1].city !== currentCity) {
                                blocks.push({ city: currentCity, days: [day] });
                            } else {
                                blocks[blocks.length - 1].days.push(day);
                            }
                        });

                        return blocks.map((block, bIdx) => {
                            const firstDay = block.days[0];
                            const lastDay = block.days[block.days.length - 1];
                            let dateRangeStr = "";
                            if (firstDay?.date && lastDay?.date) {
                                const fd = new Date(firstDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                const ld = new Date(lastDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                dateRangeStr = fd === ld ? fd : `${fd} - ${ld}`;
                            } else {
                                dateRangeStr = `Day ${firstDay.day_number || '?'} - Day ${lastDay.day_number || '?'}`;
                            }

                            return (
                                <div key={bIdx} className="space-y-4">
                                    <h3 className="text-sm font-semibold text-foreground/70 flex items-center justify-between border-b border-border/50 pb-2">
                                        <span className="flex items-center gap-2">
                                            <Cloud className="w-4 h-4 text-primary" />
                                            Weather in <span className="font-bold text-foreground">{block.city}</span>
                                        </span>
                                        <span className="text-xs text-foreground/50">{dateRangeStr}</span>
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {block.days.map((day) => {
                                            const i = days.indexOf(day); // Global index to get correct offset
                                            const forecasts = cityForecasts[block.city.toLowerCase()] || [];
                                            const dailyForecasts = getDailyForecasts(forecasts);
                                            
                                            let f = dailyForecasts[i];
                                            if (day.date) {
                                                const matched = dailyForecasts.find(df => df.datetime.startsWith(day.date));
                                                if (matched) f = matched;
                                            }

                                            if (!f) f = dailyForecasts[dailyForecasts.length - 1] || forecasts[0];
                                            
                                            if (!f) return null;

                                            const date = new Date(f.datetime);
                                            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                                            const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                                            return (
                                                <motion.div
                                                    key={day.id || i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: (i % 5) * 0.05 }}
                                                >
                                                    <Card className="p-4 text-center space-y-2 bg-surface/50 border-primary/20 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 bg-primary/10 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold text-primary">
                                                            Day {day.day_number || i + 1}
                                                        </div>
                                                        <p className="text-xs font-semibold text-foreground/50">{dayName}</p>
                                                        <p className="text-[10px] uppercase text-foreground/40 font-semibold tracking-widest">{dateStr}</p>
                                                        <img
                                                            src={`https://openweathermap.org/img/wn/${f.icon}@2x.png`}
                                                            alt={f.description}
                                                            className="w-12 h-12 mx-auto group-hover:scale-110 transition-transform"
                                                        />
                                                        <p className="text-lg font-bold">{Math.round(f.temp)}°C</p>
                                                        <p className="text-[10px] text-foreground/50 capitalize truncate">{f.description}</p>
                                                        <div className="flex items-center justify-center gap-2 text-[10px] text-foreground/40">
                                                            <span className="flex items-center gap-0.5">
                                                                <Droplets className="w-3 h-3 text-blue-400" /> {f.humidity}%
                                                            </span>
                                                            <span className="flex items-center gap-0.5">
                                                                <Wind className="w-3 h-3 text-slate-400" /> {f.wind_speed}m/s
                                                            </span>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            ) : (
                <>
                    {Object.entries(cityForecasts).map(([cityName, forecasts]) => {
                        const dailyForecasts = getDailyForecasts(forecasts);
                        return (
                            <div key={cityName} className="space-y-4">
                                <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2 border-b border-border/50 pb-2">
                                    <Cloud className="w-4 h-4 text-primary" />
                                    5-Day Forecast — {cityName}
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
                                                <Card className="p-4 text-center space-y-2 bg-surface/50">
                                                    <p className="text-xs font-semibold text-foreground/50">{dayName}</p>
                                                    <p className="text-[10px] text-foreground/30">{dateStr}</p>
                                                    <img
                                                        src={`https://openweathermap.org/img/wn/${f.icon}@2x.png`}
                                                        alt={f.description}
                                                        className="w-12 h-12 mx-auto"
                                                    />
                                                    <p className="text-lg font-bold">{Math.round(f.temp)}°C</p>
                                                    <p className="text-[10px] text-foreground/50 capitalize truncate">{f.description}</p>
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
                    })}
                </>
            )}
        </div>
    );
}
