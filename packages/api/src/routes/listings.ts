import { Router, Request, Response } from 'express';
import { fetchListings } from '../services/nycOpenData';

const router = Router();

// GET /api/listings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { borough, postcode, limit = '150', offset = '0' } = req.query as Record<string, string>;
    const result = await fetchListings({
      borough: borough?.trim() || undefined,
      postcode: postcode?.trim() || undefined,
      limit: Math.min(parseInt(limit) || 150, 500),
      offset: parseInt(offset) || 0,
    });

    res.json({
      success: true,
      data: result.listings,
      meta: { total: result.total, limit: parseInt(limit), offset: parseInt(offset) },
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
    // Fetch a broad set then find by ID (cached after first call)
    const { listings } = await fetchListings({ limit: 500 });
    const listing = listings.find((l) => l.id === id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch listing' });
  }
});

export default router;
