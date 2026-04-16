'use client';

import { SlidersHorizontal, LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { FilterState } from '@/types/listing';
import { cn } from '@/lib/utils';

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
const SOURCES = [
  { label: 'NYC Open Data', value: 'nyc-open-data' },
  { label: 'RentCast', value: 'rentcast' },
];
const STATUSES = ['Completed', 'In Progress', 'Active', 'Inactive'];
const PRICE_PRESETS = [
  { label: 'Any Price', min: 0, max: 99999 },
  { label: 'Under $2,000', min: 0, max: 2000 },
  { label: '$2,000–$3,000', min: 2000, max: 3000 },
  { label: '$3,000–$4,500', min: 3000, max: 4500 },
  { label: '$4,500+', min: 4500, max: 99999 },
];

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  resultCount: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
}

export default function FilterBar({
  filters,
  onFiltersChange,
  resultCount,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  function set(patch: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...patch });
  }

  const hasActiveFilters =
    filters.borough || filters.buildingStatus || filters.postcode || filters.source ||
    filters.priceMin > 0 || filters.priceMax < 99999;

  function clearFilters() {
    onFiltersChange({ borough: '', priceMin: 0, priceMax: 99999, buildingStatus: '', postcode: '', source: '' });
  }

  return (
    <div className="sticky top-16 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide">
        {/* Filter icon */}
        <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-500">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs font-medium hidden sm:block">Filters</span>
        </div>

        {/* Borough */}
        <div className="flex-shrink-0 w-40">
          <Select value={filters.borough || '__all__'} onValueChange={(v) => set({ borough: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Borough" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Boroughs</SelectItem>
              {BOROUGHS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price */}
        <div className="flex-shrink-0 w-40">
          <Select
            value={`${filters.priceMin}-${filters.priceMax}`}
            onValueChange={(v) => {
              const [min, max] = v.split('-').map(Number);
              set({ priceMin: min, priceMax: max });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_PRESETS.map((p) => (
                <SelectItem key={p.label} value={`${p.min}-${p.max}`}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="flex-shrink-0 w-36">
          <Select value={filters.buildingStatus || '__all__'} onValueChange={(v) => set({ buildingStatus: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Any Status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="flex-shrink-0 w-36">
          <Select value={filters.source || '__all__'} onValueChange={(v) => set({ source: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Data Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sources</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zip */}
        <div className="flex-shrink-0 w-28">
          <Input
            placeholder="Zip Code"
            value={filters.postcode}
            onChange={(e) => set({ postcode: e.target.value })}
            maxLength={5}
            className="h-8 text-xs"
          />
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="flex-shrink-0 h-8 text-xs text-slate-500 hover:text-slate-900">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span className="flex-shrink-0 text-xs text-slate-500 hidden sm:block">
          <span className="font-semibold text-navy-700">{resultCount.toLocaleString()}</span> results
        </span>

        {/* View mode toggle */}
        <div className="flex-shrink-0 flex items-center rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'flex h-8 w-8 items-center justify-center transition-colors',
              viewMode === 'grid' ? 'bg-navy-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'flex h-8 w-8 items-center justify-center transition-colors',
              viewMode === 'list' ? 'bg-navy-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
