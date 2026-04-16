import axios from 'axios';
import type { ApiResponse, Listing, SearchSuggestion } from '@/types/listing';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function getListings(params: {
  borough?: string;
  postcode?: string;
  limit?: number;
  offset?: number;
}): Promise<{ listings: Listing[]; total: number }> {
  const { data } = await apiClient.get<ApiResponse<Listing[]>>('/api/listings', { params });
  return { listings: data.data, total: data.meta?.total ?? data.data.length };
}

export async function getListing(id: string): Promise<Listing> {
  const { data } = await apiClient.get<ApiResponse<Listing>>(`/api/listings/${id}`);
  return data.data;
}

export async function searchLocations(q: string): Promise<SearchSuggestion[]> {
  if (!q.trim()) return [];
  const { data } = await apiClient.get<ApiResponse<SearchSuggestion[]>>('/api/search', {
    params: { q },
  });
  return data.data;
}
