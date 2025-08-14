import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import { ShieldAlert, Camera, ParkingCircle, AlertTriangle, Flame, Ambulance, Shield, Wrench, Waves, TrafficCone } from "lucide-react";

const styleClassic = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#f8f9fb" } },
    { id: "osm", type: "raster", source: "osm" },
  ],
};

const iconByType = (type) => {
  switch (type) {
    case "dps":
      return { Icon: ShieldAlert, color: "bg-red-500" };
    case "camera":
      return { Icon: Camera, color: "bg-amber-500" };
    case "parking":
      return { Icon: ParkingCircle, color: "bg-emerald-500" };
    case "fire":
      return { Icon: Flame, color: "bg-red-600" };
    case "ambulance":
      return { Icon: Ambulance, color: "bg-rose-500" };
    case "post":
      return { Icon: Shield, color: "bg-blue-500" };
    case "repair":
      return { Icon: Wrench, color: "bg-amber-600" };
    case "accident":
      return { Icon: AlertTriangle, color: "bg-orange-600" };
    case "bump":
      return { Icon: Waves, color: "bg-yellow-500" };
    case "traffic":
      return { Icon: TrafficCone, color: "bg-orange-500" };
    default:
      return { Icon: AlertTriangle, color: "bg-blue-500" };
  }
};

function MarkerEl({ marker, onClick }) {
  const { Icon, color } = iconByType(marker.type);
  return (
    <button
      className={`rounded-full ${color} text-white shadow-md border border-white/70 p-1 hover:scale-110 transition-transform`}
      onClick={onClick}
      aria-label={marker.title}
    >
      <Icon size={18} />
    </button>
  );
}

export default function MapView({ markers, onMarkerClick, addingMode, onAddAt }) {
  const mapRef = useRef(null);
  const mapContainer = useRef(null);
  const markersRef = useRef([]);

  // init
  useEffect(() => {
    if (mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleClassic,
      center: [37.620393, 55.75396],
      zoom: 12,
      attributionControl: true,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showZoom: true }));

    map.on("click", (e) => {
      if (!addingMode) return;
      onAddAt && onAddAt({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => map.remove();
  }, [addingMode, onAddAt]);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear existing
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      const root = createRoot(el);
      root.render(<MarkerEl marker={m} onClick={() => onMarkerClick(m)} />);

      const inst = new maplibregl.Marker({ element: el }).setLngLat([m.location.lng, m.location.lat]).addTo(map);
      markersRef.current.push(inst);
    });
  }, [markers, onMarkerClick]);

  return (
    <div className="relative h-[calc(100vh-56px)] w-full">
      <div ref={mapContainer} className="absolute inset-0" />
      {addingMode && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-sm shadow">
          Тапните по карте, чтобы поставить метку
        </div>
      )}
    </div>
  );
}