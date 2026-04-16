import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso?: string): string {
  if (!iso) return 'TBD';
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

/** Deterministic image via picsum — same ID always returns same photo */
export function getListingImage(id: string): string {
  // Hash the ID to a number 1-1000 for picsum seed
  const seed = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${seed}/800/520`;
}

export function getBoroughAccent(borough: string): string {
  const map: Record<string, string> = {
    Manhattan: 'bg-violet-100 text-violet-800',
    Brooklyn: 'bg-blue-100 text-blue-800',
    Queens: 'bg-emerald-100 text-emerald-800',
    Bronx: 'bg-amber-100 text-amber-800',
    'Staten Island': 'bg-rose-100 text-rose-800',
  };
  return map[borough] ?? 'bg-slate-100 text-slate-700';
}

export function getBoroughPinColor(borough: string): string {
  const map: Record<string, string> = {
    Manhattan: '#7C3AED',
    Brooklyn: '#2563EB',
    Queens: '#059669',
    Bronx: '#D97706',
    'Staten Island': '#DC2626',
  };
  return map[borough] ?? '#0F2044';
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
