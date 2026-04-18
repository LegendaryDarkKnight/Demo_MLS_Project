import { useInfiniteQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';

const PAGE_SIZE = 50;

interface ListingFilters {
  borough?: string;
  postcode?: string;
  city?: string;
  state?: string;
  lat?: number;
  lon?: number;
}

export function useListings(filters: ListingFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: ({ pageParam = 0 }) =>
      getListings({
        borough: filters.borough || undefined,
        postcode: filters.postcode || undefined,
        city: filters.city || undefined,
        state: filters.state || undefined,
        lat: filters.lat,
        lon: filters.lon,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}
