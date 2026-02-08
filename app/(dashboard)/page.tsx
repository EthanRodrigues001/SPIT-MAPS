"use client";

import { MapView } from "@/components/dashboard/map-view";
import { MapsPanel } from "@/components/dashboard/maps-panel";
import { RouteInfoPanel } from "@/components/dashboard/route-info-panel";
import { MapControls } from "@/components/dashboard/map-controls";
import { useMapsStore } from "@/store/maps-store";

export default function MapsPage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView />
      <PanelContainer />
      <MapControls />
    </div>
  );
}

function PanelContainer() {
  const { routeDestinationId } = useMapsStore();

  if (routeDestinationId) {
    return <RouteInfoPanel />;
  }

  return <MapsPanel />;
}
