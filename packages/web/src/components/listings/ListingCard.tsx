'use client';

import Image from 'next/image';
import { Bed, Building2, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice, getBoroughAccent, getListingImage } from '@/lib/utils';
import type { Listing } from '@/types/listing';

interface ListingCardProps {
  listing: Listing;
  isHovered: boolean;
  viewMode: 'grid' | 'list';
  onHover: (id: string | null) => void;
  onSelect: (listing: Listing) => void;
}

export default function ListingCard({
  listing,
  isHovered,
  viewMode,
  onHover,
  onSelect,
}: ListingCardProps) {
  const imgSrc = getListingImage(listing.id);

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onMouseEnter={() => onHover(listing.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(listing)}
        className={cn(
          'flex gap-4 rounded-xl border bg-white p-3 cursor-pointer transition-all duration-200',
          isHovered
            ? 'border-brand shadow-card-hover scale-[1.005]'
            : 'border-slate-200 shadow-card hover:shadow-card-hover hover:border-slate-300'
        )}
      >
        <div className="relative h-24 w-32 flex-shrink-0 rounded-lg overflow-hidden">
          <Image src={imgSrc} alt={listing.projectName} fill className="object-cover" sizes="128px" />
        </div>
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getBoroughAccent(listing.borough))}>
                {listing.borough}
              </span>
              <Badge variant={listing.buildingStatus === 'Completed' ? 'success' : 'warning'}>
                {listing.buildingStatus}
              </Badge>
            </div>
            <p className="font-semibold text-navy-700 text-sm leading-snug line-clamp-2">
              {listing.projectName}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {listing.postcode}
            </p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm font-bold text-navy-700">
              {formatPrice(listing.priceRange.min)}
              <span className="text-xs text-slate-400 font-normal">/mo</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{listing.bedrooms}bd</span>
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{listing.totalUnits} units</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(listing)}
      className={cn(
        'group rounded-2xl overflow-hidden border bg-white cursor-pointer transition-all duration-200',
        isHovered
          ? 'border-brand shadow-card-hover -translate-y-0.5'
          : 'border-slate-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 hover:border-slate-300'
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={imgSrc}
          alt={listing.projectName}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent" />

        {/* Top-left borough badge */}
        <div className="absolute top-3 left-3">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm', getBoroughAccent(listing.borough))}>
            {listing.borough}
          </span>
        </div>

        {/* Top-right favourite */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors"
        >
          <Star className="h-4 w-4 text-white" />
        </button>

        {/* Bottom price overlay */}
        <div className="absolute bottom-3 left-3">
          <p className="text-white font-bold text-lg leading-none">
            {formatPrice(listing.priceRange.min)}
            <span className="text-white/70 text-xs font-normal ml-1">/mo</span>
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-navy-700 text-sm leading-snug line-clamp-2 flex-1">
            {listing.projectName}
          </h3>
          <Badge variant={listing.buildingStatus === 'Completed' ? 'success' : 'warning'} className="flex-shrink-0 mt-0.5">
            {listing.buildingStatus}
          </Badge>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {listing.postcode} · {listing.rentalUnits} rental units
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1">
            <Bed className="h-3.5 w-3.5 text-slate-400" />
            {listing.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            {listing.totalUnits} units
          </span>
          <span className="ml-auto text-slate-400">
            up to {formatPrice(listing.priceRange.max)}/mo
          </span>
        </div>

        {/* Amenity pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {listing.amenities.slice(0, 3).map((a) => (
            <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {a}
            </span>
          ))}
          {listing.amenities.length > 3 && (
            <span className="text-xs text-slate-400 px-1">+{listing.amenities.length - 3} more</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
