'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { useSearchSuggestions } from '@/hooks/useSearch';
import type { SearchSuggestion } from '@/types/listing';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSelect: (result: SearchSuggestion) => void;
}

function shortDisplayName(full: string): string {
  return full.split(',').slice(0, 3).join(',');
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data: suggestions = [], isFetching } = useSearchSuggestions(debouncedQuery);

  useEffect(() => {
    setOpen(suggestions.length > 0 && query.length >= 2);
  }, [suggestions, query]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(item: SearchSuggestion) {
    setQuery(shortDisplayName(item.display_name));
    setOpen(false);
    onSelect(item);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search any city, neighborhood, or zip code…"
          className={cn(
            'w-full h-9 rounded-lg border border-white/20 bg-navy-600 pl-9 pr-9 text-sm text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand/60',
            'transition-all'
          )}
        />
        {isFetching && (
          <Loader2 className="absolute right-3 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          {suggestions.map((item, index) => (
            <button
              key={`${item.place_id}-${index}`}
              onMouseDown={() => handleSelect(item)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
            >
              <MapPin className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {shortDisplayName(item.display_name)}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{item.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
