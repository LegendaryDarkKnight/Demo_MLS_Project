'use client';

import Image from 'next/image';
import { Bed, Building2, Database, MapPin, Star } from 'lucide-react';
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
      <div
        onMouseEnter={() => onHover(listing.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(listing)}
        className={cn(
          'flex gap-4 rounded-2xl border bg-white p-4 cursor-pointer transition-all duration-200',
          isHovered
            ? 'border-brand shadow-lg scale-[1.005]'
            : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
        )}
      >
        <div className="relative h-28 w-36 flex-shrink-0 rounded-xl overflow-hidden">
          <Image src={imgSrc} alt={listing.projectName} fill className="object-cover" sizes="144px" />
        </div>
        <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', getBoroughAccent(listing.borough))}>
                {listing.borough}
              </span>
              <Badge variant={listing.buildingStatus === 'Completed' ? 'success' : 'warning'}>
                {listing.buildingStatus}
              </Badge>
            </div>
            <p className="font-semibold text-navy-700 text-sm leading-snug line-clamp-2">
              {listing.projectName}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {listing.postcode}
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-base font-bold text-navy-700">
              {formatPrice(listing.priceRange.min)}
              <span className="text-xs text-slate-400 font-normal ml-0.5">/mo</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{listing.bedrooms} bed</span>
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{listing.totalUnits} units</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
            <Database className="h-2.5 w-2.5 text-slate-300" />
            <span className="text-[10px] text-slate-400">
              {listing.source === 'rentcast' ? 'RentCast' : 'NYC Open Data'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(listing)}
      className={cn(
        'group rounded-2xl overflow-hidden border bg-white cursor-pointer transition-all duration-200',
        isHovered
          ? 'border-brand shadow-xl -translate-y-1'
          : 'border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300'
      )}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <Image
          src={imgSrc}
          alt={listing.projectName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/65 via-transparent to-transparent" />

        {/* Borough badge */}
        <div className="absolute top-3 left-3">
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm', getBoroughAccent(listing.borough))}>
            {listing.borough}
          </span>
        </div>

        {/* Favourite */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors"
        >
          <Star className="h-4 w-4 text-white" />
        </button>

        {/* Price overlay */}
        <div className="absolute bottom-3 left-4">
          <p className="text-white font-bold text-xl leading-none">
            {formatPrice(listing.priceRange.min)}
            <span className="text-white/70 text-sm font-normal ml-1">/mo</span>
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <h3 className="font-semibold text-navy-700 text-sm leading-snug line-clamp-2 flex-1">
            {listing.projectName}
          </h3>
          <Badge variant={listing.buildingStatus === 'Completed' ? 'success' : 'warning'} className="flex-shrink-0 mt-0.5">
            {listing.buildingStatus}
          </Badge>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {listing.postcode} · {listing.rentalUnits} rental units
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-600 border-t border-slate-100 pt-3.5">
          <span className="flex items-center gap-1.5">
            <Bed className="h-3.5 w-3.5 text-slate-400" />
            {listing.bedrooms} bed
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            {listing.totalUnits} units
          </span>
          <span className="ml-auto text-slate-400 text-[11px]">
            up to {formatPrice(listing.priceRange.max)}/mo
          </span>
        </div>

        {listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {listing.amenities.slice(0, 3).map((a) => (
              <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {a}
              </span>
            ))}
            {listing.amenities.length > 3 && (
              <span className="text-xs text-slate-400 px-1">+{listing.amenities.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 mt-3.5 pt-3 border-t border-slate-100">
          <Database className="h-2.5 w-2.5 text-slate-300" />
          <span className="text-[10px] text-slate-400">
            {listing.source === 'rentcast' ? 'RentCast' : 'NYC Open Data'}
          </span>
        </div>
      </div>
    </div>
  );
}
