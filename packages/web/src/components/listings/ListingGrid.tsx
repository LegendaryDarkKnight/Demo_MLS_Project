'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SearchX, ChevronDown } from 'lucide-react';
import ListingCard from './ListingCard';
import SkeletonCard from './SkeletonCard';
import type { Listing } from '@/types/listing';

interface ListingGridProps {
  listings: Listing[];
  isLoading: boolean;
  isError: boolean;
  viewMode: 'grid' | 'list';
  hoveredId: string | null;
  selectedId?: string | null;
  onHover: (id: string | null) => void;
  onSelect: (listing: Listing) => void;
  displayCount?: number;
  onShowMore?: () => void;
}

export default function ListingGrid({
  listings,
  isLoading,
  isError,
  viewMode,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  displayCount,
  onShowMore,
}: ListingGridProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const visible = displayCount ? listings.slice(0, displayCount) : listings;
  const hasMore = displayCount ? listings.length > displayCount : false;
  const remaining = displayCount ? listings.length - displayCount : 0;

  useEffect(() => {
    if (selectedId) {
      const el = cardRefs.current.get(selectedId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!inView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3 p-8">
        <SearchX className="h-10 w-10 text-slate-300" />
        <p className="font-medium">Couldn't load listings</p>
        <p className="text-sm text-slate-400 text-center">
          Make sure the API server is running on port 3001.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5'
            : 'flex flex-col gap-4 p-5'
        }
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3 p-8">
        <SearchX className="h-10 w-10 text-slate-300" />
        <p className="font-medium text-navy-700">No results found</p>
        <p className="text-sm text-slate-400 text-center">
          Try adjusting your filters or search for a different area.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 pb-8">
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
            : 'flex flex-col gap-4'
        }
      >
        <AnimatePresence mode="popLayout">
          {visible.map((listing) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              ref={(el) => {
                if (el) cardRefs.current.set(listing.id, el);
                else cardRefs.current.delete(listing.id);
              }}
            >
              <ListingCard
                listing={listing}
                isHovered={listing.id === hoveredId}
                viewMode={viewMode}
                onHover={onHover}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasMore && onShowMore && (
        <div className="flex flex-col items-center gap-1 mt-8">
          <p className="text-sm text-slate-400">{remaining} more listings</p>
          <button
            onClick={onShowMore}
            className="flex items-center gap-2 mt-1 px-6 py-2.5 rounded-full border border-slate-300 bg-white text-sm font-medium text-navy-700 hover:border-navy-700 hover:bg-navy-700 hover:text-white transition-all duration-200 shadow-sm"
          >
            <ChevronDown className="h-4 w-4" />
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
