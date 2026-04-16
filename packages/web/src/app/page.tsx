'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Map } from 'lucide-react';
import { useListings } from '@/hooks/useListings';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/filters/FilterBar';
import ListingGrid from '@/components/listings/ListingGrid';
import ListingDetail from '@/components/listings/ListingDetail';
import type { FilterState, Listing, SearchSuggestion } from '@/types/listing';

// Dynamic import — Leaflet is browser-only
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-200 animate-pulse flex items-center justify-center">
      <Map className="h-10 w-10 text-slate-400" />
    </div>
  ),
});

const DEFAULT_FILTERS: FilterState = {
  borough: '',
  priceMin: 0,
  priceMax: 99999,
  buildingStatus: '',
  postcode: '',
};

const NYC_CENTER: [number, number] = [40.7128, -74.006];

export default function HomePage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(NYC_CENTER);
  const [mapZoom, setMapZoom] = useState(11);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileMap, setShowMobileMap] = useState(false);

  // Server-side filter (borough/postcode go to API)
  const { data, isLoading, isError } = useListings({
    borough: filters.borough || undefined,
    postcode: filters.postcode || undefined,
  });

  // Client-side filter (price, status)
  const filteredListings = useMemo<Listing[]>(() => {
    if (!data?.listings) return [];
    return data.listings.filter((l) => {
      // Strict price filtering: listing range must stay inside the selected range.
      if (filters.priceMin > 0 && l.priceRange.min < filters.priceMin) return false;
      if (filters.priceMax < 99999 && l.priceRange.max > filters.priceMax) return false;
      if (filters.buildingStatus && l.buildingStatus !== filters.buildingStatus) return false;
      return true;
    });
  }, [data, filters]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId((prev) => (prev === id ? prev : id));
  }, []);

  function handleSearch(result: SearchSuggestion) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (isFinite(lat) && isFinite(lon)) {
      setMapCenter([lat, lon]);
      setMapZoom(14);
    }
  }

  function handlePinClick(listing: Listing) {
    setSelectedListing(listing);
    setHoveredId(listing.id);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* ── Header ── */}
      <Header onSearch={handleSearch} />

      {/* ── Filter bar ── */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredListings.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* ── Main split-screen ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map panel — hidden on mobile unless toggled */}
        <div
          className={[
            'flex-shrink-0 relative',
            // Desktop: always visible, 42% width
            'hidden md:flex md:w-[42%] lg:w-[38%]',
            // Mobile: toggled
            showMobileMap ? '!flex !w-full absolute inset-0 z-20' : '',
          ].join(' ')}
        >
          <MapView
            listings={filteredListings}
            hoveredId={hoveredId}
            center={mapCenter}
            zoom={mapZoom}
            onListingClick={handlePinClick}
            onListingHover={handleHover}
          />

          {/* "Back to list" overlay on mobile map */}
          {showMobileMap && (
            <button
              onClick={() => setShowMobileMap(false)}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-navy-700 text-white text-sm font-medium px-5 py-2 rounded-full shadow-lg flex items-center gap-2"
            >
              ← Back to listings
            </button>
          )}
        </div>

        {/* Listings panel */}
        <div
          className={[
            'flex-1 overflow-y-auto',
            showMobileMap ? 'hidden md:block' : '',
          ].join(' ')}
        >
          <ListingGrid
            listings={filteredListings}
            isLoading={isLoading}
            isError={isError}
            viewMode={viewMode}
            hoveredId={hoveredId}
            selectedId={selectedListing?.id ?? null}
            onHover={handleHover}
            onSelect={setSelectedListing}
          />
        </div>
      </div>

      {/* ── Mobile "View Map" FAB ── */}
      {!showMobileMap && (
        <button
          onClick={() => setShowMobileMap(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden z-30 flex items-center gap-2 bg-navy-700 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xl active:scale-95 transition-transform"
        >
          <Map className="h-4 w-4" />
          View Map
        </button>
      )}

      {/* ── Listing detail slide-over ── */}
      <ListingDetail
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </div>
  );
}
