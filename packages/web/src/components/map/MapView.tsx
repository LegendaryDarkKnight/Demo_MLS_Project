'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Listing } from '@/types/listing';
import { formatPrice, getBoroughPinColor } from '@/lib/utils';

interface MapViewProps {
  listings: Listing[];
  hoveredId: string | null;
  center: [number, number];
  zoom: number;
  onListingClick: (listing: Listing) => void;
  onListingHover: (id: string | null) => void;
}

export default function MapView({
  listings,
  hoveredId,
  center,
  zoom,
  onListingClick,
  onListingHover,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  // Keep callback refs so marker event handlers never go stale without
  // triggering the markers effect to re-run and recreate every marker.
  const onClickRef = useRef(onListingClick);
  const onHoverRef = useRef(onListingHover);
  useEffect(() => { onClickRef.current = onListingClick; });
  useEffect(() => { onHoverRef.current = onListingHover; });

  // ── 1. Initialize map exactly once ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // React StrictMode unmounts → remounts in dev.  Leaflet brands the DOM
    // element with _leaflet_id on first init; the cleanup below calls
    // map.remove() which erases it.  But if HMR reloads the module without
    // unmounting, the brand persists while mapRef is reset to null.
    // Deleting it here lets Leaflet re-initialize safely in all scenarios.
    const branded = container as HTMLDivElement & { _leaflet_id?: number };
    if (branded._leaflet_id !== undefined) {
      delete branded._leaflet_id;
    }

    const map = L.map(container, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // center/zoom intentionally omitted — flyTo effect handles subsequent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Fly to new center / zoom after a search ───────────────────────────
  useEffect(() => {
    mapRef.current?.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom]);

  // ── 3. Sync markers when the listings array changes ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const incoming = new Set(listings.map((l) => l.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!incoming.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add new markers (skip if already rendered)
    listings.forEach((listing) => {
      if (markersRef.current.has(listing.id)) return;

      const color = getBoroughPinColor(listing.borough);

      const marker = L.circleMarker([listing.latitude, listing.longitude], {
        radius: 9,
        fillColor: color,
        fillOpacity: 0.82,
        color: '#ffffff',
        weight: 2,
      });

      marker.bindPopup(buildPopupHtml(listing), { maxWidth: 260 });

      marker.on('click', () => onClickRef.current(listing));
      marker.on('mouseover', () => onHoverRef.current(listing.id));
      marker.on('mouseout', () => onHoverRef.current(null));

      marker.addTo(map);
      markersRef.current.set(listing.id, marker);
    });
  }, [listings]);

  // ── 4. Update hover styling without recreating markers ───────────────────
  useEffect(() => {
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    markersRef.current.forEach((marker, id) => {
      const isHovered = id === hoveredId;
      const borough = listingMap.get(id)?.borough ?? '';
      const color = getBoroughPinColor(borough);

      marker.setRadius(isHovered ? 11 : 9);
      marker.setStyle({
        fillColor: isHovered ? '#E05C2A' : color,
        fillOpacity: isHovered ? 0.95 : 0.82,
        weight: isHovered ? 3 : 2,
      });

      if (isHovered) marker.bringToFront();
    });
  }, [hoveredId, listings]);

  return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />;
}

// ── Popup HTML (inline styles — Tailwind is not available inside Leaflet popups) ──
function buildPopupHtml(l: Listing): string {
  return `
    <div style="padding:8px 4px;min-width:210px;font-family:system-ui,sans-serif">
      <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#0F2044;
                line-height:1.3">${l.projectName}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#64748B">
        ${l.borough} &middot; ${l.postcode}
      </p>
      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#E05C2A">
        ${formatPrice(l.priceRange.min)} – ${formatPrice(l.priceRange.max)}<span
          style="font-size:10px;font-weight:400;color:#94A3B8">/mo</span>
      </p>
      <p style="margin:0;font-size:11px;color:#94A3B8">${l.totalUnits} units</p>
    </div>`;
}
