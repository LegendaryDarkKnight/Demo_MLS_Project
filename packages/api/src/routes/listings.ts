import { Router, Request, Response } from 'express';
import { fetchListings } from '../services/nycOpenData';
import { fetchRentCastListings } from '../services/rentcast';

const router = Router();

function isNYC(city?: string, state?: string): boolean {
  if (!city && !state) return true; // default → NYC
  if ((state ?? '').toUpperCase() !== 'NY') return false;
  const c = (city ?? '').toLowerCase();
  return ['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', ''].some(
    (v) => c === v || c.includes('new york')
  );
}

const GUEST_LIMIT = 10;

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
    const nyc = isNYC(cityParam, stateParam);
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = parseInt(offset) || 0;

    const rcCity = cityParam ?? 'New York';
    const rcState = stateParam ?? 'NY';

    const [nycResult, rentcastAll] = await Promise.all([
      nyc
        ? fetchListings({
            borough: boroughFilter,
            postcode: postcodeFilter,
            limit: Math.min(parsedLimit, 500),
            offset: parsedOffset,
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

    const combined = [...nycResult.listings, ...rentcastListings];
    const totalCount = combined.length;

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
