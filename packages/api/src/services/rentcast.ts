import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { Listing } from './nycOpenData';

const CACHE_FILE = path.join(__dirname, '../../data/rentcast-cache.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — ~4 calls/month max
const BASE_URL = 'https://api.rentcast.io/v1';

function zipToBorough(zip: string): string {
  const prefix = zip.slice(0, 3);
  if (prefix === '100' || prefix === '101' || prefix === '102') return 'Manhattan';
  if (prefix === '104') return 'Bronx';
  if (prefix === '112') return 'Brooklyn';
  if (prefix === '113' || prefix === '114' || prefix === '116') return 'Queens';
  if (prefix === '103') return 'Staten Island';
  return 'New York';
}

function mapRecord(r: Record<string, unknown>, index: number): Listing | null {
  const address = (r.formattedAddress ?? r.addressLine1) as string | undefined;
  if (!address?.trim()) return null;

  const zip = (r.zipCode as string) ?? '';
  const price = (r.price as number) ?? 0;

  return {
    id: `rc-${(r.id as string) ?? index}`,
    projectName: address.trim(),
    borough: zipToBorough(zip),
    postcode: zip,
    latitude: (r.latitude as number) ?? 0,
    longitude: (r.longitude as number) ?? 0,
    totalUnits: 1,
    rentalUnits: 1,
    buildingStatus: (r.status as string) === 'Active' ? 'Active' : 'Inactive',
    completionDate: r.listedDate as string | undefined,
    priceRange: { min: price, max: price },
    bedrooms: (r.bedrooms as number) ?? 0,
    amenities: [],
    source: 'rentcast',
  };
}

interface DiskCache {
  fetchedAt: number;
  listings: Listing[];
}

function readDiskCache(): Listing[] | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const parsed: DiskCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    console.log('[rentcast] disk cache hit');
    return parsed.listings;
  } catch {
    return null;
  }
}

function writeDiskCache(listings: Listing[]): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), listings }));
    console.log(`[rentcast] cached ${listings.length} listings to disk`);
  } catch (err) {
    console.error('[rentcast] failed to write disk cache:', err);
  }
}

let memCache: Listing[] | null = null;

export async function fetchRentCastListings(): Promise<Listing[]> {
  if (memCache) return memCache;

  const disk = readDiskCache();
  if (disk) {
    memCache = disk;
    return memCache;
  }

  const apiKey = process.env.RENT_CAST_API;
  if (!apiKey) {
    console.warn('[rentcast] RENT_CAST_API not set — skipping');
    return [];
  }

  console.log('[rentcast] fetching fresh data from API (1 of ~50 monthly calls)');
  const { data } = await axios.get(`${BASE_URL}/listings/rental/long-term`, {
    params: { city: 'New York', state: 'NY', status: 'Active', limit: 500 },
    headers: { 'X-Api-Key': apiKey },
    timeout: 20_000,
  });

  const raw = Array.isArray(data) ? data : [];
  const listings = raw
    .map((r, i) => mapRecord(r as Record<string, unknown>, i))
    .filter((l): l is Listing => l !== null);

  writeDiskCache(listings);
  memCache = listings;
  return listings;
}
