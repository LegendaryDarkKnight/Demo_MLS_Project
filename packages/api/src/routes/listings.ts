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

// GET /api/listings
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      borough, postcode,
      city, state,
      limit = '200', offset = '0',
    } = req.query as Record<string, string>;

    const boroughFilter = borough?.trim() || undefined;
    const postcodeFilter = postcode?.trim() || undefined;
    const cityParam = city?.trim() || undefined;
    const stateParam = state?.trim() || undefined;
    const nyc = isNYC(cityParam, stateParam);

    // Resolve which city/state to query RentCast with
    const rcCity = cityParam ?? 'New York';
    const rcState = stateParam ?? 'NY';

    const [nycResult, rentcastAll] = await Promise.all([
      nyc
        ? fetchListings({
            borough: boroughFilter,
            postcode: postcodeFilter,
            limit: Math.min(parseInt(limit) || 200, 500),
            offset: parseInt(offset) || 0,
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

    const combined = [...nycResult.listings, ...rentcastListings];

    res.json({
      success: true,
      data: combined,
      meta: {
        total: combined.length,
        nycTotal: nycResult.listings.length,
        rentcastTotal: rentcastListings.length,
        city: rcCity,
        state: rcState,
        limit: parseInt(limit),
        offset: parseInt(offset),
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
