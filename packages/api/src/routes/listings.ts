import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fetchListings } from '../services/nycOpenData';
import { fetchRentCastListings } from '../services/rentcast';
import { isDbAvailable, getPool } from '../services/db';

// Resolve which city:state key a borough belongs to (for non-NYC boroughs).
// Returns null if borough is NYC or not found in any cache.
async function resolveBoroughCity(borough: string): Promise<{ city: string; state: string } | null> {
  const NYC_BOROUGHS = new Set(['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'new york']);
  if (NYC_BOROUGHS.has(borough.toLowerCase())) return null;

  if (isDbAvailable()) {
    const pool = getPool()!;
    // cache_key format is "city:state"
    const [rows] = await pool.query<import('mysql2').RowDataPacket[]>(
      'SELECT DISTINCT cache_key FROM rentcast_listings WHERE LOWER(borough) = LOWER(?) LIMIT 1',
      [borough]
    );
    if (rows.length) {
      const [city, state] = rows[0].cache_key.split(':');
      if (city && state) return { city, state };
    }
    return null;
  }

  // JSON fallback
  const cacheFile = path.resolve(__dirname, '../../../data/rentcast-cache.json');
  if (!fs.existsSync(cacheFile)) return null;
  try {
    const store = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as Record<string, { listings: { borough: string }[] }>;
    for (const [key, entry] of Object.entries(store)) {
      const found = (entry.listings ?? []).some(
        (l) => l.borough?.toLowerCase() === borough.toLowerCase()
      );
      if (found) {
        const [city, state] = key.split(':');
        if (city && state) return { city, state };
      }
    }
  } catch { /* ignore */ }
  return null;
}

const router = Router();

function isNYC(city?: string, state?: string): boolean {
  if (!city && !state) return true; // default → NYC
  if ((state ?? '').toUpperCase() !== 'NY') return false;
  const c = (city ?? '').toLowerCase();
  return ['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', ''].some(
    (v) => c === v || c.includes('new york')
  );
}

const GUEST_LIMIT = 50;

// GET /api/listings
router.get('/', async (req: Request, res: Response) => {
  try {
    const isAuthenticated = !!req.user;
    const {
      borough, postcode,
      city, state,
      lat, lon,
      limit = '50', offset = '0',
    } = req.query as Record<string, string>;

    const boroughFilter = borough?.trim() || undefined;
    const postcodeFilter = postcode?.trim() || undefined;
    const cityParam = city?.trim() || undefined;
    const stateParam = state?.trim() || undefined;
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = parseInt(offset) || 0;

    // If a non-NYC borough is selected without an explicit city, resolve which
    // cached city that borough belongs to so we fetch the right dataset.
    let rcCity = cityParam ?? 'New York';
    let rcState = stateParam ?? 'NY';
    if (boroughFilter && !cityParam) {
      const resolved = await resolveBoroughCity(boroughFilter);
      if (resolved) {
        rcCity = resolved.city;
        rcState = resolved.state;
      }
    }

    // Re-evaluate NYC flag after potential city resolution from borough
    const nyc = isNYC(rcCity, rcState);

    const [nycResult, rentcastAll] = await Promise.all([
      nyc
        ? fetchListings({
            borough: boroughFilter,
            postcode: postcodeFilter,
            limit: 500,
          })
        : Promise.resolve({ listings: [], total: 0 }),
      fetchRentCastListings(rcCity, rcState),
    ]);

    // Filter RentCast in-memory (entire city dataset is cached locally)
    let rentcastListings = rentcastAll;
    if (boroughFilter) {
      rentcastListings = rentcastListings.filter((l) =>
        l.borough.toLowerCase().includes(boroughFilter.toLowerCase())
      );
    }
    if (postcodeFilter) {
      rentcastListings = rentcastListings.filter((l) => l.postcode === postcodeFilter);
    }

    // For non-NYC: if caller supplies search coords, sort by proximity so
    // the first page shows listings nearest to the searched location.
    const searchLat = lat ? parseFloat(lat) : NaN;
    const searchLon = lon ? parseFloat(lon) : NaN;
    if (!nyc && isFinite(searchLat) && isFinite(searchLon)) {
      rentcastListings = [...rentcastListings].sort((a, b) => {
        const distA = (a.latitude - searchLat) ** 2 + (a.longitude - searchLon) ** 2;
        const distB = (b.latitude - searchLat) ** 2 + (b.longitude - searchLon) ** 2;
        return distA - distB;
      });
    }

    // Interleave NYC and RentCast proportionally so every page contains a
    // healthy mix of both sources rather than exhausting one before the other.
    const nycListings = nycResult.listings;
    const combined: typeof nycListings = [];
    const totalCount = nycListings.length + rentcastListings.length;

    if (nycListings.length === 0 || rentcastListings.length === 0) {
      combined.push(...nycListings, ...rentcastListings);
    } else {
      // Step size: insert one RentCast listing every N NYC listings
      const ratio = nycListings.length / rentcastListings.length;
      let rcIdx = 0;
      let nycIdx = 0;
      let nycAccum = 0;
      while (nycIdx < nycListings.length || rcIdx < rentcastListings.length) {
        if (nycIdx < nycListings.length) {
          combined.push(nycListings[nycIdx++]);
          nycAccum++;
        }
        // Insert a RentCast entry every `ratio` NYC entries
        if (rcIdx < rentcastListings.length && nycAccum >= ratio * (rcIdx + 1)) {
          combined.push(rentcastListings[rcIdx++]);
        }
      }
      // Flush any remaining RentCast entries
      while (rcIdx < rentcastListings.length) combined.push(rentcastListings[rcIdx++]);
    }

    const paginated = isAuthenticated
      ? combined.slice(parsedOffset, parsedOffset + parsedLimit)
      : combined.slice(0, GUEST_LIMIT);

    res.json({
      success: true,
      data: paginated,
      meta: {
        total: totalCount,
        visible: paginated.length,
        guestLimited: !isAuthenticated,
        nycTotal: nycResult.listings.length,
        rentcastTotal: rentcastListings.length,
        city: rcCity,
        state: rcState,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: isAuthenticated
          ? parsedOffset + parsedLimit < totalCount
          : false,
      },
    });
  } catch (err) {
    console.error('[listings] error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/boroughs — distinct boroughs from all cache sources
router.get('/boroughs', async (_req: Request, res: Response) => {
  try {
    const boroughSet = new Set<string>();

    // 1. NYC disk cache files
    const dataDir = path.resolve(__dirname, '../../../data');
    if (fs.existsSync(dataDir)) {
      for (const file of fs.readdirSync(dataDir)) {
        if (!file.startsWith('nyc-cache-')) continue;
        try {
          const { data } = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
          for (const l of data?.listings ?? []) {
            if (l.borough) boroughSet.add(l.borough);
          }
        } catch { /* skip corrupt file */ }
      }
    }

    // 2. RentCast — DB or JSON fallback
    if (isDbAvailable()) {
      const pool = getPool()!;
      const [rows] = await pool.query<import('mysql2').RowDataPacket[]>(
        'SELECT DISTINCT borough FROM rentcast_listings WHERE borough IS NOT NULL'
      );
      for (const r of rows) if (r.borough) boroughSet.add(r.borough);
    } else {
      const cacheFile = path.resolve(__dirname, '../../../data/rentcast-cache.json');
      if (fs.existsSync(cacheFile)) {
        try {
          const store = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as Record<string, { listings: { borough: string }[] }>;
          for (const entry of Object.values(store)) {
            for (const l of entry.listings ?? []) if (l.borough) boroughSet.add(l.borough);
          }
        } catch { /* ignore */ }
      }
    }

    const NYC_ORDER = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    const sorted = [
      ...NYC_ORDER.filter((b) => boroughSet.has(b)),
      ...[...boroughSet].filter((b) => !NYC_ORDER.includes(b)).sort(),
    ];

    res.json({ success: true, data: sorted });
  } catch (err) {
    console.error('[listings] boroughs error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch boroughs' });
  }
});

// GET /api/listings/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [{ listings: nycListings }, rentcastAll] = await Promise.all([
      fetchListings({ limit: 500 }),
      fetchRentCastListings('New York', 'NY'),
    ]);
    const listing = [...nycListings, ...rentcastAll].find((l) => l.id === id);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch listing' });
  }
});

export default router;
