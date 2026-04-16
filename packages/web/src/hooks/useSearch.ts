import { useQuery } from '@tanstack/react-query';
import { searchLocations } from '@/lib/api';

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchLocations(query),
    enabled: query.trim().length >= 2,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
