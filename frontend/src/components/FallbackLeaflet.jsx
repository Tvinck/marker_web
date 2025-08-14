import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function FallbackLeaflet({ markers = [], onClick, onMarkerClick }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true });
    mapRef.current = map;
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM" });
    tiles.addTo(map);
    map.setView([55.75396, 37.620393], 12);

    map.on("click", (e) => onClick && onClick({ lng: e.latlng.lng, lat: e.latlng.lat }));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      });
    }
  }, [onClick]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    // clear existing markers layer
    if (map._markerLayer) { map.removeLayer(map._markerLayer); }
    const layer = L.layerGroup();
    markers.forEach((m) => {
      const mk = L.marker([m.location.lat, m.location.lng]);
      mk.on("click", () => onMarkerClick && onMarkerClick(m));
      mk.addTo(layer);
    });
    layer.addTo(map);
    map._markerLayer = layer;
  }, [markers, onMarkerClick]);

  return <div ref={ref} className="absolute inset-0" />;
}