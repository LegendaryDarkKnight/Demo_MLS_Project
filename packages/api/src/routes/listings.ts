import { Router, Request, Response } from 'express';
import { fetchListings } from '../services/nycOpenData';
import { fetchRentCastListings } from '../services/rentcast';

const router = Router();

// GET /api/listings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { borough, postcode, limit = '150', offset = '0' } = req.query as Record<string, string>;
    const boroughFilter = borough?.trim() || undefined;
    const postcodeFilter = postcode?.trim() || undefined;

    const [nycResult, rentcastAll] = await Promise.all([
      fetchListings({
        borough: boroughFilter,
        postcode: postcodeFilter,
        limit: Math.min(parseInt(limit) || 150, 500),
        offset: parseInt(offset) || 0,
      }),
      fetchRentCastListings(),
    ]);

    // Filter RentCast listings in-memory (full dataset is cached locally)
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
      fetchRentCastListings(),
    ]);
    const listing = [...nycListings, ...rentcastAll].find((l) => l.id === id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch listing' });
  }
});

export default router;
