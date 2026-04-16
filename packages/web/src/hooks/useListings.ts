import { useQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';

interface ListingFilters {
  borough?: string;
  postcode?: string;
}

export function useListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () =>
      getListings({
        borough: filters.borough || undefined,
        postcode: filters.postcode || undefined,
        limit: 200,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}
