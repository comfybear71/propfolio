import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "realty-in-au.p.rapidapi.com";

export async function POST(req: NextRequest) {
  if (!RAPIDAPI_KEY) {
    return NextResponse.json(
      { ok: false, error: "RapidAPI key not configured. Add RAPIDAPI_KEY to your environment variables." },
      { status: 503 }
    );
  }

  const filters = await req.json();

  // Build suburb search string: "suburb-state-postcode" e.g. "gray-nt-0830"
  const suburb = filters.suburb
    ? `${filters.suburb.toLowerCase().replace(/\s+/g, "-")}-${(filters.state || "nt").toLowerCase()}-${filters.postcode || ""}`
    : `${(filters.state || "nt").toLowerCase()}`;

  const params = new URLSearchParams({
    channel: "buy",
    searchLocation: suburb,
    sortType: "new-desc",
    page: String(filters.page || 1),
    pageSize: String(filters.pageSize || 20),
  });

  // Add property type filter
  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    const typeMap: Record<string, string> = {
      House: "house",
      ApartmentUnitFlat: "unit apartment",
      Townhouse: "townhouse",
      VacantLand: "land",
      Unit: "unit apartment",
      Land: "land",
    };
    filters.propertyTypes.forEach((pt: string) => {
      const mapped = typeMap[pt] || pt.toLowerCase();
      params.append("propertyTypes", mapped);
    });
  }

  // Add price filters
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minBedrooms) params.set("minimumBedrooms", String(filters.minBedrooms));

  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/properties/list?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { ok: false, error: `RapidAPI error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalise results — handle both tieredResults and flat results
    interface RapidAPIMedia {
      templatedUrl?: string;
      url?: string;
    }
    interface RapidAPIProperty {
      id?: string | number;
      propertyType?: string;
      address?: {
        display?: { shortAddress?: string; fullAddress?: string };
        suburb?: string;
        state?: string;
        postcode?: string;
      };
      generalFeatures?: {
        bedrooms?: { value?: number };
        bathrooms?: { value?: number };
        parkingSpaces?: { value?: number };
      };
      propertyFeatures?: {
        landSize?: number;
        buildingSize?: number;
      };
      price?: {
        display?: string;
        value?: number;
      };
      media?: RapidAPIMedia[];
      images?: RapidAPIMedia[];
      listingSlug?: string;
      _links?: { canonical?: { href?: string } };
    }

    // Extract listings from tiered results or flat array
    let listings: RapidAPIProperty[] = [];
    if (data.tieredResults) {
      for (const tier of data.tieredResults) {
        if (tier.results) listings.push(...tier.results);
      }
    } else if (data.results) {
      listings = data.results;
    } else if (Array.isArray(data)) {
      listings = data;
    }

    const normalised = listings.map((item: RapidAPIProperty) => {
      const addr = item.address || {};
      const features = item.generalFeatures || {};
      const propFeatures = item.propertyFeatures || {};
      const mediaList = item.media || item.images || [];
      const firstImage = mediaList[0];
      let imageUrl = "";
      if (firstImage) {
        imageUrl = firstImage.templatedUrl
          ? firstImage.templatedUrl.replace("{size}", "800x600")
          : firstImage.url || "";
      }

      // Try to extract numeric price
      let price = item.price?.value || 0;
      if (!price && item.price?.display) {
        const match = item.price.display.match(/\$?([\d,]+)/);
        if (match) price = parseInt(match[1].replace(/,/g, ""), 10);
      }

      const listingUrl = item._links?.canonical?.href
        || (item.listingSlug ? `https://www.realestate.com.au/${item.listingSlug}` : "")
        || (item.id ? `https://www.realestate.com.au/property-${(item.propertyType || "house").toLowerCase().replace(/\s+/g, "-")}-${(addr.suburb || "").toLowerCase().replace(/\s+/g, "+")}+-${addr.state || ""}+${addr.postcode || ""}/${item.id}` : "");

      return {
        id: `rapid-${item.id || Date.now()}`,
        address: addr.display?.shortAddress || addr.display?.fullAddress || "",
        suburb: addr.suburb || "",
        state: addr.state || "",
        postcode: addr.postcode || "",
        price,
        displayPrice: item.price?.display || "",
        propertyType: item.propertyType || "House",
        bedrooms: features.bedrooms?.value ?? null,
        bathrooms: features.bathrooms?.value ?? null,
        carSpaces: features.parkingSpaces?.value ?? null,
        landSize: propFeatures.landSize ?? null,
        buildingSize: propFeatures.buildingSize ?? null,
        yearBuilt: null,
        estimatedWeeklyRent: 0,
        imageUrl,
        listingUrl,
        notes: "",
        landPrice: null,
        buildCost: null,
        source: "domain-api" as const, // Use same type for compatibility
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      results: normalised,
      total: data.totalResultsCount || normalised.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to search RapidAPI: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
