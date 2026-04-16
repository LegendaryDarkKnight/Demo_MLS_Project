import type { SearchSuggestion } from '@/types/listing';

const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN',
  Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'District of Columbia': 'DC',
};

export interface ResolvedLocation {
  city: string;
  state: string; // 2-char abbreviation
  label: string; // display label e.g. "Austin, TX"
  isNYC: boolean;
}

export function extractLocation(result: SearchSuggestion): ResolvedLocation | null {
  const addr = result.address;
  if (!addr) return null;

  const rawCity =
    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? '';
  const rawState = addr.state ?? '';
  const stateAbbr = STATE_ABBR[rawState] ?? '';

  if (!rawCity || !stateAbbr) return null;

  // Normalise "New York City" → "New York" for RentCast compatibility
  const city = rawCity.toLowerCase() === 'new york city' ? 'New York' : rawCity;

  const nyc =
    stateAbbr === 'NY' &&
    ['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'].includes(
      city.toLowerCase()
    );

  // Build a readable label: prefer suburb for NYC neighbourhoods
  const subLabel = addr.suburb && stateAbbr === 'NY' ? addr.suburb : city;
  const label = `${subLabel}, ${stateAbbr}`;

  return { city, state: stateAbbr, label, isNYC: nyc };
}
