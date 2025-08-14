import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import { ShieldAlert, Camera, ParkingCircle, AlertTriangle, Flame, Ambulance, Shield, Wrench, Waves, TrafficCone, Crosshair } from "lucide-react";
import FallbackLeaflet from "./FallbackLeaflet";

const styleClassic = { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [ { id: "background", type: "background", paint: { "background-color": "#f8f9fb" } }, { id: "osm", type: "raster", source: "osm" } ] };
const styleDark = { version: 8, sources: { dark: { type: "raster", tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors © CARTO" } }, layers: [ { id: "background", type: "background", paint: { "background-color": "#0b0b0b" } }, { id: "dark", type: "raster", source: "dark" } ] };

const typeStyles = { dps:{color:"bg-red-500",ring:"ring-red-300/80"}, camera:{color:"bg-amber-500",ring:"ring-amber-300/80"}, parking:{color:"bg-emerald-500",ring:"ring-emerald-300/80"}, fire:{color:"bg-red-600",ring:"ring-red-400/80"}, ambulance:{color:"bg-rose-500",ring:"ring-rose-300/80"}, post:{color:"bg-blue-500",ring:"ring-blue-300/80"}, repair:{color:"bg-amber-600",ring:"ring-amber-400/80"}, accident:{color:"bg-orange-600",ring:"ring-orange-400/80"}, bump:{color:"bg-yellow-500",ring:"ring-yellow-300/80"}, traffic:{color:"bg-orange-500",ring:"ring-orange-300/80"} };

const iconByType = (type) => { switch(type){ case "dps":return ShieldAlert; case "camera":return Camera; case "parking":return ParkingCircle; case "fire":return Flame; case "ambulance":return Ambulance; case "post":return Shield; case "repair":return Wrench; case "accident":return AlertTriangle; case "bump":return Waves; case "traffic":return TrafficCone; default:return AlertTriangle; } };

function MarkerEl({ marker, onClick }) { const Icon = iconByType(marker.type); const ts = typeStyles[marker.type] || { color: "bg-blue-500", ring: "ring-blue-300/80" }; const pulse = marker.confirmations > 5; return (<button className={`relative flex h-9 w-9 items-center justify-center rounded-full ${ts.color} text-white shadow-[0_6px_14px_rgba(0,0,0,0.25)] border border-white/80 ring-2 ${ts.ring} hover:scale-110 transition-transform`} onClick={onClick} aria-label={marker.title}>{pulse && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-white/20" />}<Icon size={18} /></button>); }

export default function MapView({ markers, onMarkerClick, addingMode, onAddAt, styleId = "classic" }) {
  const mapRef = useRef(null); const mapContainer = useRef(null); const markersRef = useRef([]);
  const [canLocate, setCanLocate] = useState(false); const [loaded, setLoaded] = useState(false); const [mapError, setMapError] = useState(null);
  const [useFallback, setUseFallback] = useState(true); // принудительно Leaflet для надёжности сейчас
  const leafletRef = useRef(null);

  // init MapLibre (выключено по умолчанию, включу позже)
  useEffect(() => {
    if (useFallback || mapRef.current) return;
    try {
      const map = new maplibregl.Map({ container: mapContainer.current, style: styleId === "dark" ? styleDark : styleClassic, center: [37.620393, 55.75396], zoom: 12, attributionControl: true, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: false });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showZoom: true }));
      map.on("load", () => { setLoaded(true); setTimeout(() => map.resize(), 200); });
      map.on("error", (e) => { console.warn("Map error", e?.error || e); });
      map.on("click", (e) => { if (!addingMode) return; onAddAt && onAddAt({ lng: e.lngLat.lng, lat: e.lngLat.lat }); });
      if (navigator.geolocation) { setCanLocate(true); navigator.geolocation.getCurrentPosition((pos)=>{ try{ map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14 }); }catch{} }); }
      const onResize = () => map.resize(); window.addEventListener("resize", onResize); return () => { window.removeEventListener("resize", onResize); map.remove(); };
    } catch (e) {
      console.error("MapLibre init failed, switching to Leaflet", e);
      setUseFallback(true);
      setMapError("WebGL недоступен, включён упрощённый режим карты");
    }
  }, [useFallback]);

  // react to style change (MapLibre only)
  useEffect(() => { if (useFallback) return; const map = mapRef.current; if (!map) return; const st = styleId === "dark" ? styleDark : styleClassic; try { map.setStyle(st); } catch {} }, [styleId, useFallback]);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      try {
        if (useFallback && leafletRef.current) {
          leafletRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
        } else {
          mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 });
        }
      } catch {}
    });
  };

  // render markers (MapLibre)
  useEffect(() => {
    if (useFallback) return; const map = mapRef.current; if (!map || !loaded) return; markersRef.current.forEach((m) => m.remove()); markersRef.current = []; markers.forEach((m) => { const el = document.createElement("div"); const root = createRoot(el); root.render(<MarkerEl marker={m} onClick={() => onMarkerClick(m)} />); const inst = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([m.location.lng, m.location.lat]).addTo(map); markersRef.current.push(inst); });
  }, [markers, onMarkerClick, loaded, useFallback]);

  return (
    <div className="relative w-full">
      <div className="fixed left-0 right-0 top-[64px] bottom-[88px]">
        {useFallback ? (
          <FallbackLeaflet markers={markers} onClick={addingMode ? onAddAt : undefined} onMarkerClick={onMarkerClick} onReady={(m) => (leafletRef.current = m)} />
        ) : (
          <div ref={mapContainer} className="absolute inset-0" />
        )}
      </div>
      {addingMode && (
        <div className="pointer-events-none fixed left-1/2 top-[72px] -translate-x-1/2 rounded-full bg-card px-3 py-1 text-sm shadow">
          Тапните по карте, чтобы поставить метку
        </div>
      )}
      {mapError && (
        <div className="fixed left-1/2 top-[96px] z-20 -translate-x-1/2 rounded-md bg-card p-2 text-xs text-muted-foreground shadow">
          {mapError}
        </div>
      )}
      {canLocate && (
        <button onClick={locateMe} className="fixed bottom-[120px] right-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground shadow hover:opacity-90">
          <Crosshair size={16} /> Я тут
        </button>
      )}
    </div>
  );
}