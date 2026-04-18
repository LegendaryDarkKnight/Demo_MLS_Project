# UrbanLease NYC Context

**Architecture:** Monorepo (npm workspaces). `api` (Express, :3001), `web` (Next.js, :3000). 
**Goal:** Rental aggregator merging NYC Open Data & RentCast.

## Environment & Run
* `.env` belongs at repo root.
* Requires: `RENT_CAST_API`, `MYSQL_*`, `DB_*`, and `JWT_SECRET` vars.
* Fallbacks: If DB connection fails, RentCast degrades silently to JSON disk cache (`api/data/rentcast-cache.json`).
* Web uses `NEXT_PUBLIC_API_URL`.

## Backend (`packages/api`)
* **Entry:** `src/index.ts`. Calls `initDb()`, mounts routes. CORS restricted to localhost:3000/3001.
* **Routes:** `/api/listings` (combo fetch, paginated), `/api/search` (Nominatim geo), `/api/search/reverse` (uncached), `/api/auth` (signup/signin/signout/me).
* **Auth:** JWT stored in `httpOnly` cookie. `verifyToken` middleware runs globally — sets `req.user` if valid. Unauthenticated requests to `/api/listings` get only 10 results (`guestLimited: true` in meta).
* **Pagination (`/api/listings`):** Accepts `limit` (default 50, max 100) and `offset` query params. After merging NYC Open Data + RentCast results, the combined array is sliced server-side. Meta response includes `hasMore: boolean`. Guests always get `slice(0, 10)` regardless of pagination params.
* **Cache Layers:**
  * *Open Data:* NodeCache (5min).
  * *RentCast:* Map (L1) -> MySQL (L2) -> JSON (Fallback). TTL 7 days. Key: `city:state`. Strict quota limits (~50/mo), rely on cache.
  * *Nominatim:* NodeCache (10min).
* **Logging:** Strict prefixes: `[cache]`, `[nyc]`, `[rentcast]`, `[search]`, `[listings]`.

## Frontend (`packages/web`)
* **Entry:** `src/app/page.tsx` holds all global state (filters, location, viewMode, selection).
* **Data Flow:** Debounced `SearchBar` -> `handleSearch` -> bounds/location extraction -> React Query `useListings` (`useInfiniteQuery`, `PAGE_SIZE=50`) -> pages flattened via `flatMap` into `allListings` -> client-side `useMemo` filtering (price, status, sort) -> Render. "Load more" button calls `fetchNextPage()`; map renders only currently loaded pages.
* **Leaflet Quirk:** `MapView` explicitly deletes `_leaflet_id` from container DOM element on mount to prevent React StrictMode double-mount crashes. Hover effects diff marker styles in-place; do not re-render.

## Core Logic & Gotchas
* **Types:** See `packages/web/src/types/listing.ts` for unified schema.
* **NYC Detection Heuristic:** Triggers Open Data only if `state === 'NY'` AND city in `['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', '']`.
* **NYC Open Data Quirks:** * Prices are *synthetic/deterministic* based on seeded PRNG from `listing.id`. Base rents: Manhattan (3600), Brooklyn (2900), Queens (2300), Bronx (1900), SI (2000).
  * Missing coords fallback to borough centroid, or NYC center.
* **RentCast Quirks:** * `amenities` always `[]`. 
  * `buildingStatus` is strictly `Active`|`Inactive`. 
  * `bedrooms` is real data. `priceRange.min === priceRange.max`.
  * Borough derived from NY ZIP prefixes: 100-102 (Manhattan), 104 (Bronx), 112 (Brooklyn), 113/114/116 (Queens), 103 (SI). Unmatched = 'New York'.