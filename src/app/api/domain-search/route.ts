import { NextRequest, NextResponse } from "next/server";

const DOMAIN_API_KEY = process.env.DOMAIN_API_KEY;
const DOMAIN_API_URL = "https://api.domain.com.au/v1/listings/residential/_search";

export async function POST(req: NextRequest) {
  if (!DOMAIN_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Domain API key not configured. Add DOMAIN_API_KEY to your environment variables." },
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
    const response = await fetch(DOMAIN_API_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": DOMAIN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
