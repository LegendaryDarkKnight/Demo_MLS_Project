import mysql from 'mysql2/promise';
import type { Listing } from './nycOpenData';

let pool: mysql.Pool | null = null;

export function isDbAvailable(): boolean {
  return pool !== null;
}

export async function initDb(): Promise<void> {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn('[db] Missing DB env vars — falling back to JSON cache');
    return;
  }

  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT ? parseInt(DB_PORT, 10) : 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 5,
      waitForConnections: true,
      idleTimeout: 30_000,
    });

    await pool.query('SELECT 1');
    console.log('[db] MySQL connected');
  } catch (err) {
    console.error('[db] Connection failed — falling back to JSON cache:', (err as Error).message);
    pool = null;
  }
}

export async function getCacheEntry(
  key: string
): Promise<{ fetchedAt: number; listings: Listing[] } | null> {
  if (!pool) return null;
  try {
    const [cacheRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT fetched_at FROM rentcast_cache WHERE cache_key = ?',
      [key]
    );

    if (!cacheRows.length) return null;
    const fetchedAt = Number(cacheRows[0].fetched_at);

    const [listingRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM rentcast_listings WHERE cache_key = ?',
      [key]
    );

    const listings: Listing[] = listingRows.map((r) => ({
      id: r.id,
      projectName: r.project_name,
      borough: r.borough,
      postcode: r.postcode,
      latitude: r.latitude,
      longitude: r.longitude,
      totalUnits: r.total_units,
      rentalUnits: r.rental_units,
      buildingStatus: r.building_status,
      completionDate: r.completion_date ?? undefined,
      priceRange: { min: r.price_min, max: r.price_max },
      bedrooms: r.bedrooms,
      amenities: [],
      source: 'rentcast',
    }));

    return { fetchedAt, listings };
  } catch (err) {
    console.error('[db] getCacheEntry failed:', (err as Error).message);
    return null;
  }
}

export async function saveCacheEntry(
  key: string,
  fetchedAt: number,
  listings: Listing[]
): Promise<void> {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO rentcast_cache (cache_key, fetched_at)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE fetched_at = VALUES(fetched_at)`,
      [key, fetchedAt]
    );

    await conn.query('DELETE FROM rentcast_listings WHERE cache_key = ?', [key]);

    if (listings.length > 0) {
      const rows = listings.map((l) => [
        l.id, key, l.projectName, l.borough, l.postcode,
        l.latitude, l.longitude, l.totalUnits, l.rentalUnits,
        l.buildingStatus, l.completionDate ?? null,
        l.priceRange.min, l.priceRange.max, l.bedrooms,
      ]);

      await conn.query(
        `INSERT INTO rentcast_listings
           (id, cache_key, project_name, borough, postcode,
            latitude, longitude, total_units, rental_units,
            building_status, completion_date, price_min, price_max, bedrooms)
         VALUES ?`,
        [rows]
      );
    }

    await conn.commit();
    console.log(`[db] saved ${listings.length} listings for ${key}`);
  } catch (err) {
    await conn.rollback();
    console.error('[db] saveCacheEntry failed:', (err as Error).message);
  } finally {
    conn.release();
  }
}
