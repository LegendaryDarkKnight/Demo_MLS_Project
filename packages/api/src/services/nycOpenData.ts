import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getCached, setCached } from './cache';

const DISK_CACHE_DIR = path.resolve(__dirname, '../../data');
const DISK_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function diskCachePath(key: string): string {
  const safe = key.replace(/[^a-z0-9]/gi, '_');
  return path.join(DISK_CACHE_DIR, `nyc-cache-${safe}.json`);
}

function readDiskCache<T>(key: string): T | null {
  const file = diskCachePath(key);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const { data, savedAt } = JSON.parse(raw) as { data: T; savedAt: number };
    if (Date.now() - savedAt < DISK_CACHE_TTL_MS) return data;
    fs.unlinkSync(file);
  } catch {
    // miss or corrupt
  }
  return null;
}

function writeDiskCache<T>(key: string, data: T): void {
  try {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
    fs.writeFileSync(diskCachePath(key), JSON.stringify({ data, savedAt: Date.now() }));
  } catch (e) {
    console.warn('[cache] disk write failed:', e);
  }
}

const NYC_BASE = 'https://data.cityofnewyork.us/resource/hg8x-zxpr.json';

// Raw shape returned by NYC Open Data SODA API
export interface RawNYCRecord {
  project_name?: string;
  borough?: string;
  postcode?: string;
  latitude?: string;
  longitude?: string;
  all_counted_units?: string;
  counted_units?: string;
  counted_rental_units?: string;
  building_completion_date?: string;
  project_completion_date?: string;
  project_start_date?: string;
  extended_affordability_status?: string;
  prevailing_wage_status?: string;
  project_id?: string;
  building_id?: string;
}

export interface Listing {
  id: string;
  projectName: string;
  borough: string;
  postcode: string;
  latitude: number;
  longitude: number;
  totalUnits: number;
  rentalUnits: number;
  buildingStatus: string;
  completionDate?: string;
  priceRange: { min: number; max: number };
  bedrooms: number;
  amenities: string[];
  source: 'nyc-open-data' | 'rentcast';
}

const BOROUGH_COORDS: Record<string, [number, number]> = {
  Manhattan: [40.7831, -73.9712],
  Brooklyn: [40.6782, -73.9442],
  Queens: [40.7282, -73.7949],
  Bronx: [40.8448, -73.8648],
  'Staten Island': [40.5795, -74.1502],
};

const BOROUGH_BASE_RENT: Record<string, number> = {
  Manhattan: 3600,
  Brooklyn: 2900,
  Queens: 2300,
  Bronx: 1900,
  'Staten Island': 2000,
};

const AMENITY_POOL = [
  'Doorman', 'Gym', 'Rooftop Deck', 'In-Unit Laundry', 'Parking',
  'Pet-Friendly', 'Storage', 'Elevator', 'Concierge', 'Swimming Pool',
  'Bike Storage', 'Virtual Doorman',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function normalizeBorough(raw: string): string {
  const map: Record<string, string> = {
    mnx: 'Manhattan', man: 'Manhattan', manhattan: 'Manhattan',
    bk: 'Brooklyn', bkn: 'Brooklyn', brooklyn: 'Brooklyn',
    qns: 'Queens', queens: 'Queens',
    bx: 'Bronx', bronx: 'Bronx',
    si: 'Staten Island', 'staten island': 'Staten Island',
  };
  return map[raw.toLowerCase()] ?? (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
}

function mapRecord(raw: RawNYCRecord, index: number): Listing | null {
  if (!raw.project_name?.trim()) return null;

  const borough = raw.borough ? normalizeBorough(raw.borough) : 'Manhattan';
  const [defLat, defLon] = BOROUGH_COORDS[borough] ?? [40.7128, -74.006];

  const lat = raw.latitude ? parseFloat(raw.latitude) : NaN;
  const lon = raw.longitude ? parseFloat(raw.longitude) : NaN;
  const latitude = isFinite(lat) && lat !== 0 ? lat : defLat;
  const longitude = isFinite(lon) && lon !== 0 ? lon : defLon;

  const totalUnits = parseInt(raw.all_counted_units ?? raw.counted_units ?? '0') || 1;
  const rentalUnits = parseInt(raw.counted_rental_units ?? '0') || Math.round(totalUnits * 0.6);

  // Always suffix with index so duplicate project_id values produce unique IDs
  const baseId = raw.project_id ?? raw.building_id ?? 'listing';
  const id = `${baseId}-${index}`;
  const rng = seededRandom(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));

  const base = BOROUGH_BASE_RENT[borough] ?? 2500;
  const spread = Math.round(rng() * 800);
  const priceRange = { min: base - spread, max: base + spread + Math.round(totalUnits / 5) };

  const shuffled = [...AMENITY_POOL].sort(() => rng() - 0.5);
  const amenityCount = 3 + Math.floor(rng() * 4);

  const hasCompletion = !!(raw.building_completion_date ?? raw.project_completion_date);

  return {
    id,
    projectName: raw.project_name.trim(),
    borough,
    postcode: raw.postcode ?? 'N/A',
    latitude,
    longitude,
    totalUnits,
    rentalUnits,
    buildingStatus: hasCompletion ? 'Completed' : 'In Progress',
    completionDate: raw.building_completion_date ?? raw.project_completion_date,
    priceRange,
    bedrooms: 1 + Math.floor(rng() * 3),
    amenities: shuffled.slice(0, amenityCount),
    source: 'nyc-open-data',
  };
}

export async function fetchListings(params: {
  borough?: string;
  postcode?: string;
  limit?: number;
  offset?: number;
}): Promise<{ listings: Listing[]; total: number }> {
  const cacheKey = `listings:${JSON.stringify(params)}`;

  const memHit = getCached<{ listings: Listing[]; total: number }>(cacheKey);
  if (memHit) {
    console.log(`[cache] HIT (memory) ${cacheKey}`);
    return memHit;
  }

  const diskHit = readDiskCache<{ listings: Listing[]; total: number }>(cacheKey);
  if (diskHit) {
    console.log(`[cache] HIT (disk) ${cacheKey}`);
    setCached(cacheKey, diskHit, 300);
    return diskHit;
  }

  const sodaParams: Record<string, string> = {
    $limit: String(Math.min(params.limit ?? 150, 500)),
    $offset: String(params.offset ?? 0),
  };

  const conditions: string[] = [];
  if (params.borough) conditions.push(`upper(borough) like upper('%${params.borough}%')`);
  if (params.postcode) conditions.push(`postcode='${params.postcode}'`);
  if (conditions.length) sodaParams.$where = conditions.join(' AND ');

  console.log(`[nyc] Fetching ${JSON.stringify(sodaParams)}`);

  const { data } = await axios.get<RawNYCRecord[]>(NYC_BASE, {
    params: sodaParams,
    timeout: 20_000,
    headers: { Accept: 'application/json' },
  });

  const listings = data.map(mapRecord).filter((l): l is Listing => l !== null);
  const result = { listings, total: listings.length };
  setCached(cacheKey, result, 300);
  writeDiskCache(cacheKey, result);
  return result;
}
