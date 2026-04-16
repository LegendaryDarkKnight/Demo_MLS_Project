import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { Listing } from './nycOpenData';

const CACHE_FILE = path.join(__dirname, '../../data/rentcast-cache.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days per city entry
const BASE_URL = 'https://api.rentcast.io/v1';

// In-memory store: "city:state" → listings
const memCache = new Map<string, Listing[]>();

interface CacheEntry { fetchedAt: number; listings: Listing[] }
type DiskCache = Record<string, CacheEntry>;

function cacheKey(city: string, state: string): string {
  return `${city.toLowerCase()}:${state.toLowerCase()}`;
}

function loadDisk(): DiskCache {
  try {
    if (fs.existsSync(CACHE_FILE))
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as DiskCache;
  } catch { /* ignore */ }
  return {};
}

function saveDisk(store: DiskCache): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store));
  } catch (err) {
    console.error('[rentcast] disk write failed:', err);
  }
}

function zipToBorough(zip: string): string {
  const p = zip.slice(0, 3);
  if (p === '100' || p === '101' || p === '102') return 'Manhattan';
  if (p === '104') return 'Bronx';
  if (p === '112') return 'Brooklyn';
  if (p === '113' || p === '114' || p === '116') return 'Queens';
  if (p === '103') return 'Staten Island';
  return 'New York';
}

function mapRecord(r: Record<string, unknown>, index: number, city: string): Listing | null {
  const address = (r.formattedAddress ?? r.addressLine1) as string | undefined;
  if (!address?.trim()) return null;

  const zip = (r.zipCode as string) ?? '';
  const price = (r.price as number) ?? 0;
  const isNYC = city.toLowerCase() === 'new york';

  return {
    id: `rc-${(r.id as string) ?? index}`,
    projectName: address.trim(),
    borough: isNYC ? zipToBorough(zip) : (r.city as string) ?? city,
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

export async function fetchRentCastListings(city: string, state: string): Promise<Listing[]> {
  const key = cacheKey(city, state);

  // 1. In-memory hit
  if (memCache.has(key)) return memCache.get(key)!;

  // 2. Disk hit
  const store = loadDisk();
  const entry = store[key];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    console.log(`[rentcast] disk cache hit for ${key}`);
    memCache.set(key, entry.listings);
    return entry.listings;
  }

  // 3. Live fetch
  const apiKey = process.env.RENT_CAST_API;
  if (!apiKey) {
    console.warn('[rentcast] RENT_CAST_API not set');
    return [];
  }

  console.log(`[rentcast] fetching ${city}, ${state} (1 of ~50 monthly calls)`);
  try {
    const { data } = await axios.get(`${BASE_URL}/listings/rental/long-term`, {
      params: { city, state, status: 'Active', limit: 500 },
      headers: { 'X-Api-Key': apiKey },
      timeout: 20_000,
    });

    const raw = Array.isArray(data) ? data : [];
    const listings = raw
      .map((r, i) => mapRecord(r as Record<string, unknown>, i, city))
      .filter((l): l is Listing => l !== null);

    store[key] = { fetchedAt: Date.now(), listings };
    saveDisk(store);
    memCache.set(key, listings);
    console.log(`[rentcast] cached ${listings.length} listings for ${key}`);
    return listings;
  } catch (err) {
    console.error(`[rentcast] fetch failed for ${key}:`, err);
    return [];
  }
}
