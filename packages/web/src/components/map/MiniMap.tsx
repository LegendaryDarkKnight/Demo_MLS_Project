'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MiniMapProps {
  lat: number;
  lon: number;
  label?: string;
}

export default function MiniMap({ lat, lon, label }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const branded = container as HTMLDivElement & { _leaflet_id?: number };
    if (branded._leaflet_id !== undefined) delete branded._leaflet_id;

    const map = L.map(container, {
      center: [lat, lon],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.circleMarker([lat, lon], {
      radius: 10,
      fillColor: '#E05C2A',
      fillOpacity: 0.9,
      color: '#ffffff',
      weight: 2.5,
    }).addTo(map);

    if (label) marker.bindPopup(label, { closeButton: false }).openPopup();

    mapRef.current = map;

    // Sheet animation means the container has zero size on first render;
    // invalidate after a tick so Leaflet recalculates tile layout.
    const t = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
    // lat/lon changes handled by flyTo effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.flyTo([lat, lon], 15, { duration: 0.8 });
  }, [lat, lon]);

  return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />;
}
