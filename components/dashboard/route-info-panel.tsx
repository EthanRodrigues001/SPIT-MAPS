"use client";

import * as React from "react";
import {
    Car,
    Bus,
    Train,
    Bike,
    Shield,
    Clock,
    Navigation,
    RefreshCw,
    AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMapsStore, type TransportMode, type RouteData } from "@/store/maps-store";
import { cn } from "@/lib/utils";

const TRANSPORT_MODES: {
    id: TransportMode;
    icon: React.ElementType;
    label: string;
}[] = [
        { id: "car", icon: Car, label: "Car" },
        { id: "bus", icon: Bus, label: "Bus" },
        { id: "train", icon: Train, label: "Train" },
        { id: "rickshaw", icon: Bike, label: "Rickshaw" }, // Using Bike icon for Rickshaw as a proxy
    ];

export function RouteInfoPanel() {
    const {
        selectedLocationId,
        locations,
        userLocation,
        routeDestinationId,
        clearRoute,
        transportMode,
        setTransportMode,
        safetyModeEnabled,
        setSafetyMode,
        routeData,
        setRouteData,
        routeAlternatives,
        setRouteAlternatives,
    } = useMapsStore();

    const [isLoading, setIsLoading] = React.useState(false);

    const destination = React.useMemo(() => {
        return locations.find((l) => l.id === routeDestinationId);
    }, [locations, routeDestinationId]);

    // Dummy logic to calculate route data based on mode and distance
    const calculateRouteData = React.useCallback(
        async (mode: TransportMode, isSafetyEnabled: boolean) => {
            if (!userLocation || !destination) return null;

            setIsLoading(true);

            // Default speeds in km/h to estimate duration for non-car modes
            const speeds = {
                car: 40,
                bus: 25,
                train: 60,
                rickshaw: 30,
            };

            try {
                const start = `${userLocation.lng},${userLocation.lat}`;
                const end = `${destination.coordinates.lng},${destination.coordinates.lat}`;

                // Fetch route from OSRM with alternatives
                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&alternatives=true`
                );
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    const routes: RouteData[] = data.routes.map((route: any) => {
                        const distanceKm = route.distance / 1000;
                        let durationMins = route.duration / 60;
                        let cost = 0;

                        // Adjust duration based on mode (since OSRM is driving only)
                        const drivingDuration = durationMins;
                        if (mode !== 'car') {
                            const factor = speeds.car / (speeds[mode] || speeds.car);
                            durationMins = drivingDuration * factor;
                        }

                        // Apply safety mode penalty/adjustment
                        let safetyScore = Math.floor(Math.random() * 30) + 70; // 70-100
                        if (isSafetyEnabled) {
                            if (mode === 'rickshaw' || mode === 'bus') {
                                durationMins *= 1.1;
                            }
                            safetyScore = Math.min(100, safetyScore + 10);
                        }

                        // Calculate Cost
                        if (mode === "rickshaw") {
                            // ₹26 for first 1.5km, then approx ₹15/km
                            if (distanceKm <= 1.5) {
                                cost = 26;
                            } else {
                                cost = 26 + (distanceKm - 1.5) * 15;
                            }
                        } else if (mode === "car") {
                            cost = distanceKm * 20;
                        } else if (mode === "bus") {
                            cost = 5 + distanceKm * 2;
                        } else if (mode === "train") {
                            cost = 10;
                        }

                        return {
                            coordinates: route.geometry.coordinates,
                            duration: Math.round(durationMins * 60), // seconds
                            distance: route.distance, // meters
                            cost: Math.round(cost),
                            safetyScore,
                            mode: mode,
                            timeSaved: 0 // calculated later or dummy
                        } as RouteData;
                    });

                    // Set first route as primary, others as alternatives
                    const primaryRoute = routes[0];
                    setRouteData(primaryRoute);
                    setRouteAlternatives(routes); // Store all alternatives

                    setIsLoading(false);
                    return primaryRoute;
                }
            } catch (error) {
                console.error("Failed to fetch route:", error);
            }

            setIsLoading(false);
            return null;
        },
        [userLocation, destination, setRouteData, setRouteAlternatives]
    );

    React.useEffect(() => {
        calculateRouteData(transportMode, safetyModeEnabled);
    }, [transportMode, safetyModeEnabled, calculateRouteData]);

    const handleReroute = () => {
        calculateRouteData(transportMode, safetyModeEnabled);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.round(seconds / 60);
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
    };

    const formatDistance = (meters: number) => {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    };

    if (!destination || !userLocation) return null;

    return (
        <div className="absolute left-4 top-4 bottom-4 z-20 flex flex-col bg-background rounded-xl shadow-xl border overflow-hidden w-80 sm:w-[400px]">
            <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Navigation className="size-5 text-primary" />
                    Route to {destination.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{destination.address}</p>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* Transport Modes */}
                <div className="grid grid-cols-4 gap-2">
                    {TRANSPORT_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = transportMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setTransportMode(mode.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-2 rounded-lg border transition-all",
                                    isSelected
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:bg-accent text-muted-foreground"
                                )}
                            >
                                <Icon className="size-6" />
                                <span className="text-xs font-medium">{mode.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Safety Mode Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300">
                            <Shield className="size-4" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-pink-900 dark:text-pink-100">Women Safety Mode</p>
                            <p className="text-xs text-pink-700 dark:text-pink-400">Prioritize verified & safe routes</p>
                        </div>
                    </div>
                    <Switch
                        checked={safetyModeEnabled}
                        onCheckedChange={setSafetyMode}
                        className="data-[state=checked]:bg-pink-600"
                    />
                </div>

                {/* Route Alternatives */}
                {routeAlternatives.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Route Options</p>
                        {routeAlternatives.map((route, index) => {
                            const isSelected = routeData === route; // Or compare ID/index if available
                            const isFastest = index === 0; // Assuming sorted by fastest

                            return (
                                <div
                                    key={index}
                                    onClick={() => setRouteData(route)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                                    )}
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{formatDuration(route.duration)}</span>
                                            {isFastest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium">Fastest</span>}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{formatDistance(route.distance)}</span>
                                    </div>
                                    <div className="font-bold text-sm">
                                        ₹{route.cost}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Selected Route Details */}
                {routeData && (
                    <div className={cn("space-y-4 transition-opacity", isLoading ? "opacity-50" : "opacity-100")}>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg border bg-card">
                                <div className="text-xs text-muted-foreground mb-1">Estimated Time</div>
                                <div className="text-xl font-bold flex items-baseline gap-1">
                                    {formatDuration(routeData.duration)}
                                </div>
                                {routeData.timeSaved && routeData.timeSaved > 0 && (
                                    <div className="text-xs text-green-600 font-medium mt-1">
                                        {formatDuration(routeData.timeSaved)} faster
                                    </div>
                                )}
                            </div>
                            <div className="p-3 rounded-lg border bg-card">
                                <div className="text-xs text-muted-foreground mb-1">Estimated Cost</div>
                                <div className="text-xl font-bold">
                                    ₹{routeData.cost}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    approx.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleReroute}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                        Find Alternative Route
                    </Button>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={clearRoute}
                    >
                        End Navigation
                    </Button>
                </div>
            </div>
        </div>
    );
}
