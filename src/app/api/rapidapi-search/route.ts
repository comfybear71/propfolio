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
    /* eslint-disable @typescript-eslint/no-explicit-any */
    type AnyObj = Record<string, any>;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Extract listings from tiered results or flat array
    let listings: AnyObj[] = [];
    if (data.tieredResults) {
      for (const tier of data.tieredResults) {
        if (tier.results) listings.push(...tier.results);
      }
    } else if (data.results) {
      listings = data.results;
    } else if (Array.isArray(data)) {
      listings = data;
    }

    // Log first result structure for debugging image fields
    if (listings.length > 0) {
      const sample = listings[0];
      const imageKeys = Object.keys(sample).filter(k =>
        /image|photo|media|hero|picture|thumb/i.test(k)
      );
      console.log("[RapidAPI] Image-related keys:", imageKeys);
      for (const key of imageKeys) {
        console.log(`[RapidAPI] ${key}:`, JSON.stringify(sample[key])?.substring(0, 500));
      }
    }

    const normalised = listings.map((item: AnyObj) => {
      const addr = item.address || {};
      const features = item.generalFeatures || {};
      const propFeatures = item.propertyFeatures || {};

      // Try multiple image field patterns
      let imageUrl = "";
      // 1. mainImage or heroImageUrl (common realestate.com.au fields)
      if (item.mainImage?.server && item.mainImage?.uri) {
        imageUrl = `${item.mainImage.server}/800x600${item.mainImage.uri}`;
      } else if (item.heroImageUrl) {
        imageUrl = item.heroImageUrl;
      }
      // 2. images array
      if (!imageUrl && item.images?.length > 0) {
        const img = item.images[0];
        if (img.server && img.uri) {
          imageUrl = `${img.server}/800x600${img.uri}`;
        } else if (img.templatedUrl) {
          imageUrl = img.templatedUrl.replace("{size}", "800x600");
        } else if (img.url) {
          imageUrl = img.url;
        }
      }
      // 3. media array
      if (!imageUrl && item.media?.length > 0) {
        const m = item.media[0];
        if (m.server && m.uri) {
          imageUrl = `${m.server}/800x600${m.uri}`;
        } else if (m.templatedUrl) {
          imageUrl = m.templatedUrl.replace("{size}", "800x600");
        } else if (m.url) {
          imageUrl = m.url;
        } else if (typeof m === "string") {
          imageUrl = m;
        }
      }
      // 4. image field (singular)
      if (!imageUrl && item.image) {
        if (typeof item.image === "string") {
          imageUrl = item.image;
        } else if (item.image.server && item.image.uri) {
          imageUrl = `${item.image.server}/800x600${item.image.uri}`;
        } else if (item.image.url) {
          imageUrl = item.image.url;
        }
      }
      // 5. photos array
      if (!imageUrl && item.photos?.length > 0) {
        const p = item.photos[0];
        if (typeof p === "string") imageUrl = p;
        else if (p.fullUrl) imageUrl = p.fullUrl;
        else if (p.url) imageUrl = p.url;
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

    // Include raw first result for debugging image fields
    const debug = listings.length > 0 ? {
      sampleKeys: Object.keys(listings[0]),
      imageRelatedFields: Object.keys(listings[0]).filter(k => /image|photo|media|hero|picture|thumb/i.test(k)),
      rawImageData: Object.fromEntries(
        Object.keys(listings[0])
          .filter(k => /image|photo|media|hero|picture|thumb/i.test(k))
          .map(k => [k, listings[0][k]])
      ),
    } : null;

    return NextResponse.json({
      ok: true,
      results: normalised,
      total: data.totalResultsCount || normalised.length,
      debug,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to search RapidAPI: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
