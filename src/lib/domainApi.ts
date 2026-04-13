// Domain.com.au API helper — shared OAuth token + endpoint wrappers

const DOMAIN_CLIENT_ID = process.env.DOMAIN_CLIENT_ID;
const DOMAIN_CLIENT_SECRET = process.env.DOMAIN_CLIENT_SECRET;
const TOKEN_URL = "https://auth.domain.com.au/v1/connect/token";
const API_BASE = "https://api.domain.com.au/v1";

// All scopes we need across the app
const SCOPES = [
  "api_properties_read",
  "api_listings_read",
  "api_suburbperformance_read",
  "api_demographics_read",
  "api_salesresults_read",
  "api_addresslocators_read",
].join(" ");

// Cache token in memory
let cachedToken: string | null = null;
let tokenExpiry = 0;

export function isDomainConfigured(): boolean {
  return !!(DOMAIN_CLIENT_ID && DOMAIN_CLIENT_SECRET);
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: DOMAIN_CLIENT_ID!,
      client_secret: DOMAIN_CLIENT_SECRET!,
      scope: SCOPES,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Domain token request failed: ${response.status} — ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken!;
}

function clearToken() {
  cachedToken = null;
  tokenExpiry = 0;
}

async function domainGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("Domain API: unauthorized (token expired)");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Domain API ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.json();
}

// ─── Address Suggestions ──────────────────────────────────────
// GET /v1/properties/_suggest?terms=...
export interface AddressSuggestion {
  id: string;
  address: string;
  addressComponents: {
    streetNumber?: string;
    streetName?: string;
    streetType?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    unitNumber?: string;
  };
  relativeScore: number;
}

export async function suggestAddresses(terms: string): Promise<AddressSuggestion[]> {
  const data = await domainGet("/properties/_suggest", {
    terms,
    channel: "residential",
    pageSize: "6",
  });
  return (data as AddressSuggestion[]) || [];
}

// ─── Property Details ─────────────────────────────────────────
// GET /v1/properties/{id}
export interface PropertyDetails {
  id: number;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  landArea: number | null;
  buildingArea: number | null;
  yearBuilt: number | null;
  features: string[];
  photos: string[];
  saleHistory: { date: string; price: number; type: string }[];
}

export async function getPropertyDetails(propertyId: string): Promise<PropertyDetails> {
  const raw = await domainGet(`/properties/${propertyId}`) as Record<string, unknown>;

  // Normalise the response into our shape
  const photos: string[] = [];
  if (Array.isArray(raw.photos)) {
    for (const p of raw.photos) {
      if (typeof p === "string") photos.push(p);
      else if (p && typeof p === "object" && "fullUrl" in p) photos.push(p.fullUrl as string);
      else if (p && typeof p === "object" && "url" in p) photos.push(p.url as string);
    }
  }

  const saleHistory: { date: string; price: number; type: string }[] = [];
  if (Array.isArray(raw.history)) {
    for (const h of raw.history as Record<string, unknown>[]) {
      saleHistory.push({
        date: (h.date as string) || (h.soldDate as string) || "",
        price: (h.price as number) || 0,
        type: (h.type as string) || "sold",
      });
    }
  }

  return {
    id: (raw.id as number) || 0,
    address: (raw.address as string) || (raw.addressParts ? formatAddressParts(raw.addressParts as Record<string, string>) : ""),
    suburb: ((raw.addressParts as Record<string, string>)?.suburb) || "",
    state: ((raw.addressParts as Record<string, string>)?.stateAbbreviation) || ((raw.addressParts as Record<string, string>)?.state) || "",
    postcode: ((raw.addressParts as Record<string, string>)?.postcode) || "",
    propertyType: (raw.propertyType as string) || (raw.propertyCategory as string) || "House",
    bedrooms: (raw.bedrooms as number) ?? null,
    bathrooms: (raw.bathrooms as number) ?? null,
    carSpaces: (raw.carSpaces as number) ?? (raw.carspaces as number) ?? null,
    landArea: (raw.landArea as number) ?? (raw.areaSize as number) ?? null,
    buildingArea: (raw.buildingArea as number) ?? null,
    yearBuilt: (raw.yearBuilt as number) ?? null,
    features: Array.isArray(raw.features) ? raw.features as string[] : [],
    photos,
    saleHistory,
  };
}

function formatAddressParts(parts: Record<string, string>): string {
  const bits = [];
  if (parts.unitNumber) bits.push(`${parts.unitNumber}/`);
  if (parts.streetNumber) bits.push(parts.streetNumber);
  if (parts.streetName) bits.push(parts.streetName);
  if (parts.streetType) bits.push(parts.streetType);
  return bits.join(" ").trim();
}

// ─── Price Estimate ───────────────────────────────────────────
// GET /v1/properties/{id}/priceEstimate
export interface PriceEstimate {
  lowerPrice: number;
  midPrice: number;
  upperPrice: number;
  confidence: string;
  date: string;
}

export async function getPriceEstimate(propertyId: string): Promise<PriceEstimate | null> {
  try {
    const raw = await domainGet(`/properties/${propertyId}/priceEstimate`) as Record<string, unknown>;
    return {
      lowerPrice: (raw.lowerPrice as number) || 0,
      midPrice: (raw.midPrice as number) || (raw.price as number) || 0,
      upperPrice: (raw.upperPrice as number) || 0,
      confidence: (raw.confidence as string) || "",
      date: (raw.date as string) || new Date().toISOString(),
    };
  } catch {
    // Price estimate requires Business tier — return null if unavailable
    return null;
  }
}

// ─── Suburb Performance ───────────────────────────────────────
// GET /v1/suburbPerformanceStatistics
export interface SuburbStats {
  medianSoldPrice: number;
  medianRentPrice: number;
  numberSold: number;
  daysOnMarket: number;
  auctionClearanceRate: number;
  annualGrowth: number;
}

export async function getSuburbStats(
  state: string,
  suburbId: string,
  propertyCategory: string = "house"
): Promise<SuburbStats | null> {
  try {
    const raw = await domainGet("/suburbPerformanceStatistics", {
      state,
      suburbId,
      propertyCategory,
      chronologicalSpan: "12",
      tPlusFrom: "1",
      tPlusTo: "1",
    }) as Record<string, unknown>;

    const series = raw.series as Record<string, unknown> | undefined;
    const values = series?.values as Record<string, unknown> | undefined;

    return {
      medianSoldPrice: (values?.medianSoldPrice as number) || 0,
      medianRentPrice: (values?.medianRentListingPrice as number) || 0,
      numberSold: (values?.numberSold as number) || 0,
      daysOnMarket: (values?.daysOnMarket as number) || 0,
      auctionClearanceRate: (values?.auctionClearanceRate as number) || 0,
      annualGrowth: (values?.highestSoldPrice as number) || 0,
    };
  } catch {
    return null;
  }
}
