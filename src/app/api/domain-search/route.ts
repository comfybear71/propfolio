import { NextRequest, NextResponse } from "next/server";

const DOMAIN_CLIENT_ID = process.env.DOMAIN_CLIENT_ID;
const DOMAIN_CLIENT_SECRET = process.env.DOMAIN_CLIENT_SECRET;
const DOMAIN_TOKEN_URL = "https://auth.domain.com.au/v1/connect/token";
const DOMAIN_API_URL = "https://api.domain.com.au/v1/listings/residential/_search";

// Cache the access token in memory to avoid re-fetching every request
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const response = await fetch(DOMAIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: DOMAIN_CLIENT_ID!,
      client_secret: DOMAIN_CLIENT_SECRET!,
      scope: "api_listings_read",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken!;
}

export async function POST(req: NextRequest) {
  if (!DOMAIN_CLIENT_ID || !DOMAIN_CLIENT_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Domain API credentials not configured. Add DOMAIN_CLIENT_ID and DOMAIN_CLIENT_SECRET to your environment variables." },
      { status: 503 }
    );
  }

  const filters = await req.json();

  // Build Domain API search body
  const searchBody: Record<string, unknown> = {
    listingType: "Sale",
    propertyTypes: filters.propertyTypes || ["House"],
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    minBedrooms: filters.minBedrooms || undefined,
    minBathrooms: filters.minBathrooms || undefined,
    locations: [
      {
        state: filters.state || "NT",
        ...(filters.suburb ? { suburb: filters.suburb } : {}),
        ...(filters.postcode ? { postCode: filters.postcode } : {}),
      },
    ],
    pageSize: filters.pageSize || 20,
    pageNumber: filters.pageNumber || 1,
  };

  // Remove undefined values
  Object.keys(searchBody).forEach((key) => {
    if (searchBody[key] === undefined) delete searchBody[key];
  });

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(DOMAIN_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If token expired mid-flight, clear cache so next request gets a fresh one
      if (response.status === 401) {
        cachedToken = null;
        tokenExpiry = 0;
      }
      return NextResponse.json(
        { ok: false, error: `Domain API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalise Domain API results into our DiscoverProperty shape
    interface DomainMedia {
      url?: string;
    }
    interface DomainListing {
      id?: string | number;
      displayableAddress?: string;
      suburb?: string;
      state?: string;
      postcode?: string;
      propertyTypes?: string[];
      displayPrice?: string;
      price?: number;
      priceFrom?: number;
      bedrooms?: number;
      bathrooms?: number;
      carspaces?: number;
      landArea?: number;
      buildingArea?: number;
      dateUpdated?: string;
      seoUrl?: string;
      media?: DomainMedia[];
    }
    interface DomainResult {
      type?: string;
      listing?: DomainListing;
    }

    const normalised = (data as DomainResult[])
      .filter((item: DomainResult) => item.type === "PropertyListing" && item.listing)
      .map((item: DomainResult) => {
        const l = item.listing!;
        return {
          id: `domain-${l.id}`,
          address: l.displayableAddress || "",
          suburb: l.suburb || "",
          state: l.state || "",
          postcode: l.postcode || "",
          price: l.price || l.priceFrom || 0,
          displayPrice: l.displayPrice || "",
          propertyType: (l.propertyTypes?.[0] as string) || "House",
          bedrooms: l.bedrooms ?? null,
          bathrooms: l.bathrooms ?? null,
          carSpaces: l.carspaces ?? null,
          landSize: l.landArea ?? null,
          buildingSize: l.buildingArea ?? null,
          yearBuilt: null,
          estimatedWeeklyRent: 0,
          imageUrl: l.media?.[0]?.url || "",
          listingUrl: l.seoUrl || "",
          notes: "",
          landPrice: null,
          buildCost: null,
          source: "domain-api" as const,
          createdAt: l.dateUpdated || new Date().toISOString(),
        };
      });

    return NextResponse.json({ ok: true, results: normalised, total: data.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to search Domain API: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
