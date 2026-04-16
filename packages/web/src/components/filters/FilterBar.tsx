'use client';

import { useRef, useEffect, useState } from 'react';
import { SlidersHorizontal, LayoutGrid, List, MapPin, X, ChevronDown } from 'lucide-react';
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
const SORT_OPTIONS = [
  { label: 'Price: Low → High', value: 'asc' },
  { label: 'Price: High → Low', value: 'desc' },
];
const TOP_N_OPTIONS = [5, 10, 20, 50];

const EMPTY: FilterState = {
  borough: '', priceMin: 0, priceMax: 99999,
  buildingStatus: '', postcode: '', source: '', sortPrice: '', topN: 0,
};

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  resultCount: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
  activeLocation: { label: string; isNYC: boolean } | null;
  onClearLocation: () => void;
}

function activeCount(f: FilterState): number {
  let n = 0;
  if (f.borough) n++;
  if (f.priceMin > 0 || f.priceMax < 99999) n++;
  if (f.buildingStatus) n++;
  if (f.postcode) n++;
  if (f.source) n++;
  if (f.sortPrice) n++;
  if (f.topN > 0) n++;
  return n;
}

function priceLabel(min: number, max: number): string {
  const preset = PRICE_PRESETS.find((p) => p.min === min && p.max === max);
  return preset ? preset.label : `$${min}–$${max}`;
}

export default function FilterBar({
  filters,
  onFiltersChange,
  resultCount,
  viewMode,
  onViewModeChange,
  activeLocation,
  onClearLocation,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function set(patch: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...patch });
  }

  // Close panel on outside click — but not when clicking inside a Radix portal
  // (Select/Popover content is portalled outside panelRef's DOM subtree)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element;
      const insidePortal = target.closest('[data-radix-popper-content-wrapper]') !== null;
      if (insidePortal) return;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = activeCount(filters);
  const chips: { label: string; clear: () => void }[] = [];
  if (filters.borough) chips.push({ label: filters.borough, clear: () => set({ borough: '' }) });
  if (filters.priceMin > 0 || filters.priceMax < 99999)
    chips.push({ label: priceLabel(filters.priceMin, filters.priceMax), clear: () => set({ priceMin: 0, priceMax: 99999 }) });
  if (filters.buildingStatus) chips.push({ label: filters.buildingStatus, clear: () => set({ buildingStatus: '' }) });
  if (filters.postcode) chips.push({ label: `ZIP ${filters.postcode}`, clear: () => set({ postcode: '' }) });
  if (filters.source) chips.push({ label: filters.source === 'rentcast' ? 'RentCast' : 'NYC Open Data', clear: () => set({ source: '' }) });
  if (filters.sortPrice) chips.push({ label: filters.sortPrice === 'asc' ? 'Price ↑' : 'Price ↓', clear: () => set({ sortPrice: '' }) });
  if (filters.topN > 0) chips.push({ label: `Top ${filters.topN}`, clear: () => set({ topN: 0 }) });

  return (
    <div className="sticky top-16 z-30 border-b border-slate-200 bg-white shadow-sm">
      {/* ── Main bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 min-h-[48px] flex-wrap">

        {/* Filters button */}
        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors flex-shrink-0',
            open || count > 0
              ? 'border-navy-700 bg-navy-700 text-white'
              : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {count > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-navy-700 text-[10px] font-bold">
              {count}
            </span>
          )}
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>

        {/* Active location chip */}
        {activeLocation && (
          <button
            onClick={onClearLocation}
            className="flex items-center gap-1 h-8 px-2.5 rounded-full bg-brand/10 border border-brand/30 text-xs font-medium text-brand hover:bg-brand/20 transition-colors flex-shrink-0"
          >
            <MapPin className="h-3 w-3" />
            {activeLocation.label}
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Active filter chips */}
        {chips.map((chip) => (
          <button
            key={chip.label}
            onClick={chip.clear}
            className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            {chip.label}
            <X className="h-2.5 w-2.5" />
          </button>
        ))}

        {count > 0 && (
          <button
            onClick={() => onFiltersChange(EMPTY)}
            className="text-xs text-slate-400 hover:text-slate-700 flex-shrink-0 underline underline-offset-2"
          >
            Clear all
          </button>
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

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-full bg-white border-b border-slate-200 shadow-lg z-40 px-6 py-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 max-w-4xl">

            {/* Borough — only meaningful for NYC */}
            {(!activeLocation || activeLocation.isNYC) && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Borough</label>
                <Select value={filters.borough || '__all__'} onValueChange={(v) => set({ borough: v === '__all__' ? '' : v })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Boroughs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Boroughs</SelectItem>
                    {BOROUGHS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Price Range</label>
              <Select
                value={`${filters.priceMin}-${filters.priceMax}`}
                onValueChange={(v) => { const [min, max] = v.split('-').map(Number); set({ priceMin: min, priceMax: max }); }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_PRESETS.map((p) => <SelectItem key={p.label} value={`${p.min}-${p.max}`}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <Select value={filters.buildingStatus || '__all__'} onValueChange={(v) => set({ buildingStatus: v === '__all__' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Any Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Any Status</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Zip Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Zip Code</label>
              <Input
                placeholder="e.g. 10001"
                value={filters.postcode}
                onChange={(e) => set({ postcode: e.target.value })}
                maxLength={5}
                className="h-9 text-sm"
              />
            </div>

            {/* Data Source */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Data Source</label>
              <Select value={filters.source || '__all__'} onValueChange={(v) => set({ source: v === '__all__' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sources</SelectItem>
                  {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Sort by Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sort by Price</label>
              <Select value={filters.sortPrice || '__none__'} onValueChange={(v) => set({ sortPrice: v === '__none__' ? '' : v as 'asc' | 'desc' })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Default order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default order</SelectItem>
                  {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Show Top N */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Show Top</label>
              <Select value={filters.topN > 0 ? String(filters.topN) : '__all__'} onValueChange={(v) => set({ topN: v === '__all__' ? 0 : parseInt(v) })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Show all" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Show all</SelectItem>
                  {TOP_N_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Panel footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => { onFiltersChange(EMPTY); }}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
            >
              Clear all filters
            </button>
            <Button size="sm" onClick={() => setOpen(false)} className="h-8 px-5 text-xs">
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
