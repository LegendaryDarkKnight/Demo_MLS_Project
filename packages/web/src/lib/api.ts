import axios from 'axios';
import type { ApiResponse, AuthUser, Listing, SearchSuggestion } from '@/types/listing';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export async function getListings(params: {
  borough?: string;
  postcode?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}): Promise<{ listings: Listing[]; total: number; guestLimited: boolean; hasMore: boolean }> {
  const { data } = await apiClient.get<ApiResponse<Listing[]>>('/api/listings', { params });
  return {
    listings: data.data,
    total: data.meta?.total ?? data.data.length,
    guestLimited: data.meta?.guestLimited ?? false,
    hasMore: data.meta?.hasMore ?? false,
  };
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

export async function signUp(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthUser> {
  const { data } = await apiClient.post<ApiResponse<AuthUser>>('/api/auth/signup', payload);
  return data.data;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<ApiResponse<AuthUser>>('/api/auth/signin', { email, password });
  return data.data;
}

export async function signOut(): Promise<void> {
  await apiClient.post('/api/auth/signout');
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>('/api/auth/me');
    return data.data;
  } catch {
    return null;
  }
}
