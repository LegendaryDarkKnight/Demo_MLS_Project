'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
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
}

const containerVariants = {
  visible: { transition: { staggerChildren: 0.05 } },
};

export default function ListingGrid({
  listings,
  isLoading,
  isError,
  viewMode,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: ListingGridProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll only on explicit selection to avoid fighting with normal scrolling.
  useEffect(() => {
    if (selectedId) {
      const el = cardRefs.current.get(selectedId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4'
            : 'flex flex-col gap-3 p-4'
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
    <div className="p-4">
      <motion.div
        variants={containerVariants}
        initial="visible"
        animate="visible"
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
        }
      >
        <AnimatePresence>
          {listings.map((listing) => (
            <div
              key={listing.id}
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
            </div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
