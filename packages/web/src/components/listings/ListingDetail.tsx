'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin, Bed, Building2, Calendar, CheckCircle2, Clock,
  Phone, Mail, Send, ChevronRight,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice, formatDate, getListingImage, getBoroughAccent } from '@/lib/utils';
import type { Listing } from '@/types/listing';

interface ListingDetailProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function ListingDetail({ listing, isOpen, onClose }: ListingDetailProps) {
  const [form, setForm] = useState<ContactForm>({
    name: '', email: '', phone: '', message: "I'm interested in this property. Please contact me.",
  });
  const [submitted, setSubmitted] = useState(false);

  if (!listing) return null;

  const imgSrc = getListingImage(listing.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  const stats = [
    { label: 'Total Units', value: listing.totalUnits.toString(), icon: Building2 },
    { label: 'Rental Units', value: listing.rentalUnits.toString(), icon: Building2 },
    { label: 'Bedrooms', value: `${listing.bedrooms} BR`, icon: Bed },
    { label: 'Completion', value: formatDate(listing.completionDate), icon: Calendar },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-0">
        {/* Hero image */}
        <div className="relative h-56 w-full overflow-hidden">
          <Image src={imgSrc} alt={listing.projectName} fill className="object-cover" sizes="580px" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-navy-900/20 to-transparent" />
          <div className="absolute bottom-4 left-6 right-12">
            <p className="text-white font-bold text-2xl leading-tight drop-shadow">
              {formatPrice(listing.priceRange.min)}
              <span className="text-white/70 text-sm font-normal ml-1">/mo</span>
            </p>
            <p className="text-white/80 text-sm">
              up to {formatPrice(listing.priceRange.max)}/mo
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title + meta */}
          <SheetHeader className="p-0">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-navy-700 text-xl leading-snug">
                {listing.projectName}
              </SheetTitle>
              <Badge variant={listing.buildingStatus === 'Completed' ? 'success' : 'warning'}>
                {listing.buildingStatus === 'Completed'
                  ? <><CheckCircle2 className="h-3 w-3 mr-1" />Completed</>
                  : <><Clock className="h-3 w-3 mr-1" />In Progress</>
                }
              </Badge>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <MapPin className="h-4 w-4 text-brand" />
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getBoroughAccent(listing.borough))}>
                {listing.borough}
              </span>
              <span>·</span>
              <span>{listing.postcode}</span>
            </p>
          </SheetHeader>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700/10">
                  <Icon className="h-4 w-4 text-navy-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="font-semibold text-navy-700 text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Amenities */}
          <div>
            <h4 className="text-sm font-semibold text-navy-700 mb-2">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {listing.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1 text-xs bg-navy-50 text-navy-700 border border-navy-100 px-3 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Map location */}
          <div>
            <h4 className="text-sm font-semibold text-navy-700 mb-2">Location</h4>
            <a
              href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=15/${listing.latitude}/${listing.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl overflow-hidden border border-slate-200 relative"
            >
              {/* Static map tile */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${listing.latitude},${listing.longitude}&zoom=15&size=560x180&markers=${listing.latitude},${listing.longitude},red`}
                alt="Map location"
                className="w-full h-40 object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="hidden h-40 w-full bg-slate-100 items-center justify-center flex-col gap-2 text-slate-400">
                <MapPin className="h-8 w-8" />
                <span className="text-xs">{listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)}</span>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-2">
                <span className="text-xs bg-white/90 text-navy-700 px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                  Open in OpenStreetMap <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </a>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact About This Property
            </h4>
            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
                <p className="font-medium text-sm">Request sent! We'll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <Input
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <textarea
                  rows={3}
                  placeholder="Message…"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    <Send className="h-4 w-4 mr-1" />
                    Send Request
                  </Button>
                  <Button type="button" variant="outline" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
