'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Map } from 'lucide-react';
import { useListings } from '@/hooks/useListings';
import { useMapToggle } from '@/hooks/useMapToggle';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/filters/FilterBar';
import ListingGrid from '@/components/listings/ListingGrid';
import ListingDetail from '@/components/listings/ListingDetail';
import { extractLocation } from '@/lib/locationUtils';
import type { FilterState, Listing, SearchSuggestion } from '@/types/listing';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-200 animate-pulse flex items-center justify-center">
      <Map className="h-10 w-10 text-slate-400" />
    </div>
  ),
});

const DEFAULT_FILTERS: FilterState = {
  borough: '', priceMin: 0, priceMax: 99999,
  buildingStatus: '', postcode: '', source: '', sortPrice: '', topN: 0,
};

const NYC_CENTER: [number, number] = [40.7128, -74.006];

interface ActiveLocation {
  city: string;
  state: string;
  label: string;
  isNYC: boolean;
  bounds?: [number, number, number, number];
}

export default function HomePage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [location, setLocation] = useState<ActiveLocation | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(NYC_CENTER);
  const [mapZoom, setMapZoom] = useState(11);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { showMap, toggle: toggleMap } = useMapToggle(true);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  const { data, isLoading, isError } = useListings({
    borough: filters.borough || undefined,
    postcode: filters.postcode || undefined,
    city: location?.city,
    state: location?.state,
  });

  const filteredListings = useMemo<Listing[]>(() => {
    if (!data?.listings) return [];

    let results = data.listings.filter((l) => {
      // Narrow to search bounding box when set
      if (location?.bounds) {
        const [south, north, west, east] = location.bounds;
        if (l.latitude < south || l.latitude > north || l.longitude < west || l.longitude > east) return false;
      }
      const price = l.priceRange.min;
      if (filters.priceMin > 0 && price < filters.priceMin) return false;
      if (filters.priceMax < 99999 && price >= filters.priceMax) return false;
      if (filters.buildingStatus && l.buildingStatus !== filters.buildingStatus) return false;
      if (filters.source && l.source !== filters.source) return false;
      return true;
    });

    if (filters.sortPrice === 'asc') results = [...results].sort((a, b) => a.priceRange.min - b.priceRange.min);
    else if (filters.sortPrice === 'desc') results = [...results].sort((a, b) => b.priceRange.min - a.priceRange.min);

    if (filters.topN > 0) results = results.slice(0, filters.topN);

    return results;
  }, [data, filters, location]);

  // Reset display count whenever filters or location change
  useEffect(() => {
    setDisplayCount(10);
  }, [filters, location]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId((prev) => (prev === id ? prev : id));
  }, []);

  function handleCardSelect(listing: Listing) {
    setSelectedListing(listing);
    setHoveredId(listing.id);
    setMapCenter([listing.latitude, listing.longitude]);
    setMapZoom(15);
  }

  function handleSearch(result: SearchSuggestion) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (isFinite(lat) && isFinite(lon)) {
      setMapCenter([lat, lon]);
      setMapZoom(13);
    }

    const resolved = extractLocation(result);
    if (resolved) {
      const bounds = result.boundingbox?.length === 4
        ? result.boundingbox.map(parseFloat) as [number, number, number, number]
        : undefined;
      setLocation({ ...resolved, bounds });
      // Reset filters that don't apply when switching city
      setFilters((prev) => ({ ...prev, borough: '', postcode: '' }));
    }
  }

  function clearLocation() {
    setLocation(null);
    setMapCenter(NYC_CENTER);
    setMapZoom(11);
    setFilters((prev) => ({ ...prev, borough: '', postcode: '', source: '' }));
  }

  function handlePinClick(listing: Listing) {
    setSelectedListing(listing);
    setHoveredId(listing.id);
    setMapCenter([listing.latitude, listing.longitude]);
    setMapZoom(15);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Header onSearch={handleSearch} />

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredListings.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeLocation={location ? { label: location.label, isNYC: location.isNYC } : null}
        onClearLocation={clearLocation}
        showMap={showMap}
        onMapToggle={toggleMap}
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          className={[
            'flex-shrink-0 relative',
            showMap ? 'hidden md:flex md:w-[42%] lg:w-[38%]' : 'hidden',
            mobileMapOpen ? '!flex !w-full absolute inset-0 z-20' : '',
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
          {mobileMapOpen && (
            <button
              onClick={() => setMobileMapOpen(false)}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-navy-700 text-white text-sm font-medium px-5 py-2 rounded-full shadow-lg flex items-center gap-2"
            >
              ← Back to listings
            </button>
          )}
        </div>

        <div className={['flex-1 overflow-y-auto', mobileMapOpen ? 'hidden md:block' : ''].join(' ')}>
          <ListingGrid
            listings={filteredListings}
            isLoading={isLoading}
            isError={isError}
            viewMode={viewMode}
            hoveredId={hoveredId}
            selectedId={selectedListing?.id ?? null}
            onHover={handleHover}
            onSelect={handleCardSelect}
            displayCount={displayCount}
            onShowMore={() => setDisplayCount((n) => n + 20)}
          />
        </div>
      </div>

      {!mobileMapOpen && (
        <button
          onClick={() => setMobileMapOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden z-30 flex items-center gap-2 bg-navy-700 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xl active:scale-95 transition-transform"
        >
          <Map className="h-4 w-4" />
          View Map
        </button>
      )}

      <ListingDetail
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </div>
  );
}
