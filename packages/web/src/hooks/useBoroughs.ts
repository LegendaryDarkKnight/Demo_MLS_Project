import { useQuery } from '@tanstack/react-query';
import { getBoroughs } from '@/lib/api';

export function useBoroughs() {
  return useQuery({
    queryKey: ['boroughs'],
    queryFn: getBoroughs,
    staleTime: 10 * 60 * 1000, // 10 min — boroughs rarely change
  });
}
