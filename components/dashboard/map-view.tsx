"use client";

import * as React from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useMapsStore } from "@/store/maps-store";
import { categories, tags as allTags } from "@/mock-data/locations";
import { Map, MapMarker, MarkerContent, MapRoute } from "@/components/ui/map";

const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  streets: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  outdoors: "https://tiles.stadiamaps.com/styles/outdoors.json",
  satellite: "https://tiles.stadiamaps.com/styles/alidade_satellite.json",
};

export function MapView() {
  const { resolvedTheme } = useTheme();

  const {
    mapCenter,
    mapZoom,
    mapStyle,
    setMapCenter,
    setMapZoom,
    selectLocation,
    selectedLocationId,
    userLocation,
    routeDestinationId,
    setUserLocation,
    getFilteredLocations,
    locations: allLocations,
    routeData,
    routeAlternatives,
    setRouteData,
  } = useMapsStore();

  const getMapStyleUrl = React.useCallback(() => {
    if (mapStyle === "default") {
      return resolvedTheme === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;
    }
    return MAP_STYLES[mapStyle];
  }, [mapStyle, resolvedTheme]);

  const locations = getFilteredLocations();

  const getTagName = (tagId: string) => {
    return allTags.find((t) => t.id === tagId)?.name || tagId;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  React.useEffect(() => {
    const getLocationFromIP = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.latitude && data.longitude) {
          const location = { lat: data.latitude, lng: data.longitude };
          setUserLocation(location);
          if (!mapCenter || (mapCenter.lat === 20 && mapCenter.lng === 0)) {
            setMapCenter(location);
          }
        }
      } catch {
        console.log("IP geolocation failed");
      }
    };

    if ("geolocation" in navigator) {
      if (!userLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            if (!mapCenter || (mapCenter.lat === 20 && mapCenter.lng === 0)) {
              setMapCenter(location);
            }
          },
          () => {
            getLocationFromIP();
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      }
    } else {
      if (!userLocation) {
        getLocationFromIP();
      }
    }
  }, [setUserLocation, setMapCenter, userLocation, mapCenter]);


  return (
    <div className="absolute inset-0 w-full h-full">
      <Map
        viewport={{
          center: [mapCenter.lng, mapCenter.lat],
          zoom: mapZoom
        }}
        style={getMapStyleUrl()}
        onViewportChange={(viewport: { center: [number, number]; zoom: number }) => {
          setMapCenter({ lat: viewport.center[1], lng: viewport.center[0] });
          setMapZoom(viewport.zoom);
        }}
      >
        {/* User Location Marker */}
        {userLocation && (
          <MapMarker longitude={userLocation.lng} latitude={userLocation.lat}>
            <MarkerContent>
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
                <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue-500/50 animate-ping"></div>
              </div>
            </MarkerContent>
          </MapMarker>
        )}

        {/* Location Markers */}
        {locations.map((location) => {
          const category = categories.find((c) => c.id === location.categoryId);
          const color = category?.color || "#6b7280";
          const isSelected = selectedLocationId === location.id;
          const isRouteDestination = routeDestinationId === location.id;

          return (
            <MapMarker
              key={location.id}
              longitude={location.coordinates.lng}
              latitude={location.coordinates.lat}
              onClick={() => selectLocation(location.id)}
            >
              <MarkerContent>
                <div className={`relative cursor-pointer transition-transform ${isSelected || isRouteDestination ? "scale-125" : "hover:scale-110"
                  }`}>
                  <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.164 0 0 7.164 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.164 24.836 0 16 0Z" fill={
                      isRouteDestination ? "#22c55e" : isSelected ? "#3b82f6" : color
                    } />
                    <circle cx="16" cy="14" r="6" fill="white" />
                  </svg>
                  {isSelected && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary/30 animate-ping"></div>
                  )}
                  {isRouteDestination && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </div>
                  )}
                </div>
              </MarkerContent>
            </MapMarker>
          );
        })}

        {/* Route Alternatives */}
        {routeAlternatives.map((route, index) => {
          const isSelected = routeData === route;

          return (
            <MapRoute
              key={index}
              coordinates={route.coordinates}
              color={isSelected ? "#3b82f6" : "#94a3b8"}
              width={isSelected ? 6 : 5}
              opacity={isSelected ? 1 : 0.6}
              onClick={() => setRouteData(route)}
            />
          );
        })}

        {/* Primary Route fallback */}
        {routeData && !routeAlternatives.includes(routeData) && (
          <MapRoute
            coordinates={routeData.coordinates}
            color="#3b82f6"
            width={6}
            opacity={1}
          />
        )}
      </Map>
    </div>
  );
}
