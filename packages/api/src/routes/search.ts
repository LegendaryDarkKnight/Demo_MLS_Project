import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getCached, setCached } from '../services/cache';

const router = Router();
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const UA = 'UrbanLeaseNYC/1.0';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
  type: string;
  importance: number;
}

// GET /api/search?q=...
router.get('/', async (req: Request, res: Response) => {
  const { q } = req.query as { q?: string };
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  const query = q.trim();
  const cacheKey = `search:${query.toLowerCase()}`;
  const hit = getCached<NominatimResult[]>(cacheKey);
  if (hit) return res.json({ success: true, data: hit });

  try {
    const { data } = await axios.get<NominatimResult[]>(`${NOMINATIM}/search`, {
      params: { q: query, format: 'json', addressdetails: 1, limit: 8, countrycodes: 'us' },
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      timeout: 8_000,
    });
    setCached(cacheKey, data, 600);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[search] error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /api/search/reverse?lat=&lon=
router.get('/reverse', async (req: Request, res: Response) => {
  const { lat, lon } = req.query as { lat?: string; lon?: string };
  if (!lat || !lon) {
    return res.status(400).json({ success: false, error: 'lat and lon required' });
  }
  try {
    const { data } = await axios.get(`${NOMINATIM}/reverse`, {
      params: { lat, lon, format: 'json' },
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      timeout: 8_000,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Reverse geocoding failed' });
  }
});

export default router;
