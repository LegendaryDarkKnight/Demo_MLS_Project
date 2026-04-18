import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { Listing } from './nycOpenData';
import { isDbAvailable, getCacheEntry, saveCacheEntry } from './db';

const CACHE_FILE = path.join(__dirname, '../../data/rentcast-cache.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BASE_URL = 'https://api.rentcast.io/v1';

// L1: in-memory cache
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

async function readCache(key: string): Promise<CacheEntry | null> {
  if (isDbAvailable()) {
    const entry = await getCacheEntry(key);
    if (entry) {
      console.log(`[rentcast] db cache hit for ${key}`);
      return entry;
    }
    return null;
  }

  // JSON fallback
  const store = loadDisk();
  const entry = store[key];
  if (entry) {
    console.log(`[rentcast] disk cache hit for ${key}`);
    return entry;
  }
  return null;
}

async function writeCache(key: string, listings: Listing[]): Promise<void> {
  const fetchedAt = Date.now();
  if (isDbAvailable()) {
    await saveCacheEntry(key, fetchedAt, listings);
    return;
  }

  // JSON fallback
  const store = loadDisk();
  store[key] = { fetchedAt, listings };
  saveDisk(store);
}

// Tracks in-progress fetches to avoid duplicate API calls for the same key
const pendingFetch = new Map<string, Promise<Listing[]>>();

export async function fetchRentCastListings(city: string, state: string): Promise<Listing[]> {
  const key = cacheKey(city, state);

  // L1: in-memory
  if (memCache.has(key)) return memCache.get(key)!;

  // Deduplicate concurrent requests for the same key
  if (pendingFetch.has(key)) return pendingFetch.get(key)!;

  const work = _doFetch(key, city, state);
  pendingFetch.set(key, work);
  work.finally(() => pendingFetch.delete(key));
  return work;
}

async function _doFetch(key: string, city: string, state: string): Promise<Listing[]> {
  // L2: DB or JSON
  const cached = await readCache(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    memCache.set(key, cached.listings);
    return cached.listings;
  }

  // L3: live fetch — paginate through all results to build a full cache
  const apiKey = process.env.RENT_CAST_API;
  if (!apiKey) {
    console.warn('[rentcast] RENT_CAST_API not set');
    // Return stale cache rather than nothing
    if (cached) return cached.listings;
    return [];
  }

  const PAGE = 500; // RentCast max per call
  let allRaw: Record<string, unknown>[] = [];
  let offset = 0;

  console.log(`[rentcast] fetching ${city}, ${state} (1 of ~50 monthly calls)`);
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data } = await axios.get(`${BASE_URL}/listings/rental/long-term`, {
        params: { city, state, status: 'Active', limit: PAGE, offset },
        headers: { 'X-Api-Key': apiKey },
        timeout: 20_000,
      });

      const page = Array.isArray(data) ? data as Record<string, unknown>[] : [];
      allRaw = allRaw.concat(page);

      // RentCast returns fewer than PAGE → no more pages
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    const listings = allRaw
      .map((r, i) => mapRecord(r, i, city))
      .filter((l): l is Listing => l !== null);

    await writeCache(key, listings);
    memCache.set(key, listings);
    console.log(`[rentcast] cached ${listings.length} listings for ${key}`);
    return listings;
  } catch (err) {
    console.error(`[rentcast] fetch failed for ${key}:`, err);
    // Return stale cache if available rather than empty
    if (cached) {
      console.warn(`[rentcast] returning stale cache for ${key}`);
      memCache.set(key, cached.listings);
      return cached.listings;
    }
    return [];
  }
}
