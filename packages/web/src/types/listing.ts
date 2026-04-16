export interface Listing {
  id: string;
  projectName: string;
  borough: string;
  postcode: string;
  latitude: number;
  longitude: number;
  totalUnits: number;
  rentalUnits: number;
  buildingStatus: 'Completed' | 'In Progress' | string;
  completionDate?: string;
  priceRange: { min: number; max: number };
  bedrooms: number;
  amenities: string[];
  source: 'nyc-open-data' | 'rentcast';
}

export interface FilterState {
  borough: string;
  priceMin: number;
  priceMax: number;
  buildingStatus: string;
  postcode: string;
  source: string;
}

export interface SearchSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
  type: string;
  importance: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: { total: number; limit: number; offset: number };
}
