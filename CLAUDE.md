# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UrbanLease NYC** — a rental listing aggregator that combines NYC Open Data affordable housing projects with live RentCast market listings. Users search by location, filter by borough/price/status/source, and browse results in a grid/list/map view.

---

## Commands

**Root (runs both packages concurrently):**
```bash
npm run dev      # API on :3001 + Web on :3000
npm run build    # Build both packages
npm run start    # Production mode, both packages
```

**Per-package:**
```bash
# Frontend
cd packages/web && npm run dev
cd packages/web && npm run lint

# Backend
cd packages/api && npm run dev
cd packages/api && npm run build    # compiles TS → dist/
```

---

## Environment Variables

Create `.env` at the **repo root** (not inside packages):
```
RENT_CAST_API=<your-rentcast-api-key>

# MySQL Docker (docker-compose vars)
MYSQL_CONTAINER_NAME=mls-db
MYSQL_PORT=3306
MYSQL_ROOT_PASSWORD=<strong-password>
MYSQL_DATABASE=urbanlease

# MySQL connection for API (optional — if omitted, falls back to JSON disk cache)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<same-as-MYSQL_ROOT_PASSWORD>
DB_NAME=urbanlease
```

> API startup reads this from `../../../.env` relative to `src/index.ts`. If the key is missing, RentCast service returns an empty array and logs `[rentcast] RENT_CAST_API not set`.
> If DB env vars are missing or the connection fails, the service logs a warning and falls back to the JSON disk cache automatically.

Frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).

---

## Architecture

Monorepo (npm workspaces) — `packages/api` and `packages/web` are independent TypeScript projects.

### Backend — `packages/api/`

**Entry:** `src/index.ts` — calls `initDb()` first, then sets up Express, CORS (localhost:3000 and :3001 only), parses JSON, mounts routes.

**Routes:**
| Route | Handler | Description |
|---|---|---|
| `GET /health` | inline | Status + ISO timestamp |
| `GET /api/listings` | `src/routes/listings.ts` | Fetch + combine listings |
| `GET /api/listings/:id` | `src/routes/listings.ts` | Single listing by ID |
| `GET /api/search` | `src/routes/search.ts` | Nominatim geocoding |
| `GET /api/search/reverse` | `src/routes/search.ts` | Reverse geocode (uncached) |

**Data sources and caching:**

| Source | Service | Cache Layer | TTL |
|---|---|---|---|
| NYC Open Data (SODA `hg8x-zxpr`) | `nycOpenData.ts` | In-memory (NodeCache) | 5 min |
| RentCast API (long-term rentals) | `rentcast.ts` | In-memory Map → MySQL → JSON fallback | 7 days |
| Nominatim geocoding | `search.ts` | In-memory | 10 min |

**RentCast cache layers (in order):**
1. **L1 — in-memory `Map`:** fastest, lives for the process lifetime
2. **L2 — MySQL** (`rentcast_cache` + `rentcast_listings` tables): persistent, survives restarts; initialized via `init/init.sql`
3. **L2 fallback — JSON** (`packages/api/data/rentcast-cache.json`): used automatically if DB env vars are missing or MySQL connection fails at startup

Cache key is `city:state` (e.g. `new york:ny`). TTL is 7 days — on expiry the next request triggers a live API call and overwrites the stored entry.

**New service:** `src/services/db.ts` — manages MySQL connection pool via the `mysql2` package (`initDb`, `getCacheEntry`, `saveCacheEntry`). If `initDb` fails, `isDbAvailable()` returns `false` and `rentcast.ts` silently uses the JSON path.

**Schema init:** `init/init.sql` — MySQL script run by the `mysql-init` Docker service on first startup. Creates `rentcast_cache` and `rentcast_listings` tables with indexes if they don't already exist.

### Frontend — `packages/web/`

**Entry:** `src/app/page.tsx` — manages all state: `filters`, `location`, `viewMode`, `hoveredId`, `selectedListing`.

**Key components:**
- `FilterBar` — borough, price range, status, postcode, source, sort, topN controls
- `SearchBar` — 350ms debounced Nominatim search with dropdown; calls `onSelect(SearchSuggestion)`
- `ListingGrid` — renders grid or list view; delegates to `ListingCard`
- `MapView` — Leaflet map with CircleMarkers; optimized to diff markers rather than full re-render

**Data flow:**
1. `SearchBar` → `handleSearch(result)` in `page.tsx`
2. `extractLocation(result)` (in `src/lib/locationUtils.ts`) → `{ city, state, isNYC, bounds? }`
3. `useListings(filters)` React Query hook → `GET /api/listings?city=...&state=...`
4. `filteredListings` useMemo: bounding-box → price range → status/source → sort → topN
5. Results rendered in `ListingGrid` and `MapView` simultaneously

**API client:** `src/lib/api.ts` — Axios with 20s timeout, base URL from `NEXT_PUBLIC_API_URL`.

**Response envelope from API:**
```typescript
{ success: boolean; data: T; error?: string; meta?: { total, limit, offset } }
```

---

## Core Types

Defined in `packages/web/src/types/listing.ts` — the backend mirrors this shape:

```typescript
interface Listing {
  id: string;
  projectName: string;
  borough: string;
  postcode: string;
  latitude: number;
  longitude: number;
  totalUnits: number;
  rentalUnits: number;
  buildingStatus: 'Completed' | 'In Progress' | 'Active' | 'Inactive' | string;
  completionDate?: string;
  priceRange: { min: number; max: number };
  bedrooms: number;
  amenities: string[];
  source: 'nyc-open-data' | 'rentcast';
}
```

```typescript
interface FilterState {
  borough: string;
  priceMin: number;
  priceMax: number;
  buildingStatus: string;
  postcode: string;
  source: string;           // '' | 'nyc-open-data' | 'rentcast'
  sortPrice: 'asc' | 'desc' | '';
  topN: number;             // 0 = no cap
}
```

---

## Developer Notes

### NYC Open Data — Price Generation
Prices are **synthetic and deterministic** — generated from a seeded PRNG based on `listing.id`. Same ID always produces the same price. Base rents by borough:

| Borough | Base Rent |
|---|---|
| Manhattan | $3,600 |
| Brooklyn | $2,900 |
| Queens | $2,300 |
| Bronx | $1,900 |
| Staten Island | $2,000 |

If an NYC Open Data record is missing coordinates, it falls back to borough centroid (`BOROUGH_COORDS` in `nycOpenData.ts`). If borough is also unrecognized, falls back to NYC center `[40.7128, -74.006]`.

### RentCast — Field Differences
RentCast listings differ from NYC Open Data in key ways:
- `amenities` is always `[]` — RentCast API doesn't return amenity data
- `buildingStatus` is `'Active'` or `'Inactive'` (not `'Completed'`/`'In Progress'`)
- `bedrooms` is real (from API), not randomly generated
- `priceRange.min === priceRange.max` — single price point
- Borough is derived from ZIP prefix when city is "new york" (ZIP 100–102 → Manhattan, 104 → Bronx, 112 → Brooklyn, 113/114/116 → Queens, 103 → Staten Island); unmatched ZIPs become 'New York'

### NYC Detection Logic
Both the backend (`routes/listings.ts`) and frontend (`locationUtils.ts`) share an `isNYC` heuristic:
- State must be `'NY'`
- City must match: `['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', '']`
- "New York City" is normalized → "New York" before this check

Only when `isNYC` is true does the backend query NYC Open Data.

### RentCast API Quota
The service comment notes **~50 calls/month** on the current plan. The 7-day disk cache is critical to stay within quota. Each distinct `city:state` pair is a separate cached entry and a separate API call when cache misses.

### Map Initialization Quirk (Leaflet + React)
`MapView` explicitly deletes `_leaflet_id` from the container DOM element on mount. This handles React StrictMode's double-mount in dev — without it, Leaflet throws on re-init because it sees an already-initialized container.

Markers are diffed on each render (not recreated from scratch). Hover effects update marker style in-place via Leaflet methods rather than triggering a React re-render.

### Frontend Filtering is Client-Side
Filters like `priceMin/Max`, `sortPrice`, `topN`, and `source` are applied **in the frontend** via `filteredListings` useMemo — they do not trigger new API requests. Only `city`, `state`, `borough`, and `postcode` are sent to the backend.

Bounding-box filtering (from Nominatim's `boundingbox` field) is also client-side and only activates when a specific location is selected.

### Logging Prefixes
All API-side logs follow a `[prefix]` convention:
- `[cache]` — NodeCache HIT/MISS
- `[nyc]` — NYC Open Data fetches and errors
- `[rentcast]` — cache hits, disk I/O, API calls, quota warnings
- `[search]` — Nominatim errors
- `[listings]` — route-level errors

### Known Limitations
- **No rate limiting** on any API endpoint
- **Reverse geocoding** (`/api/search/reverse`) is uncached — can be called frequently
- **NYC Open Data IDs** are suffixed with array index to ensure uniqueness, but ID stability breaks if the SODA API returns records in a different order between cache refreshes
- **CORS** only allows localhost — needs updating for production deployment
- **RentCast disk cache** has no corruption handling; if `rentcast-cache.json` is malformed, the service logs a warning and falls back to in-memory only
