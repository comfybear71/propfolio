import { NextRequest, NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "realty-in-au.p.rapidapi.com";

// Simple in-memory cache — rent medians don't change fast, cache for 24h
type CacheEntry = { median: number; count: number; timestamp: number };
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 24 * 60 * 60 * 1000;

// GET /api/rental-median?suburb=gray&state=nt&postcode=0830&bedrooms=4&propertyType=house
// Returns median weekly rent for rental listings matching criteria
export async function GET(req: NextRequest) {
  if (!RAPIDAPI_KEY) {
    return NextResponse.json(
      { ok: false, error: "RapidAPI key not configured" },
      { status: 503 }
    );
  }

  const suburb = req.nextUrl.searchParams.get("suburb") || "";
  const state = req.nextUrl.searchParams.get("state") || "nt";
  const postcode = req.nextUrl.searchParams.get("postcode") || "";
  const bedrooms = req.nextUrl.searchParams.get("bedrooms");
  const propertyType = (req.nextUrl.searchParams.get("propertyType") || "house").toLowerCase();

  if (!suburb) {
    return NextResponse.json({ ok: false, error: "Missing suburb" }, { status: 400 });
  }

  // Cache key
  const cacheKey = `${suburb}-${state}-${postcode}-${bedrooms || "any"}-${propertyType}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_MS) {
    return NextResponse.json({
      ok: true,
      median: cached.median,
      count: cached.count,
      cached: true,
    });
  }

  // Build search location: "suburb-state-postcode"
  const searchLocation = `${suburb.toLowerCase().replace(/\s+/g, "-")}-${state.toLowerCase()}${postcode ? `-${postcode}` : ""}`;

  const params = new URLSearchParams({
    channel: "rent",
    searchLocation,
    pageSize: "30",
  });
  if (bedrooms) params.set("minimumBedrooms", bedrooms);
  params.append("propertyTypes", propertyType);

  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/properties/list?${params.toString()}`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `RapidAPI error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract rental listings
    type AnyObj = Record<string, unknown>;
    let listings: AnyObj[] = [];
    if (Array.isArray(data.tieredResults)) {
      for (const tier of data.tieredResults as AnyObj[]) {
        if (Array.isArray(tier.results)) listings.push(...(tier.results as AnyObj[]));
      }
    } else if (Array.isArray(data.results)) {
      listings = data.results as AnyObj[];
    } else if (Array.isArray(data)) {
      listings = data as AnyObj[];
    }

    // Extract weekly rent prices
    const rents: number[] = [];
    for (const item of listings) {
      const price = item.price as AnyObj | undefined;
      if (!price) continue;

      let weeklyRent = 0;
      // Try numeric value first
      if (typeof price.value === "number" && price.value > 0) {
        weeklyRent = price.value;
      } else if (typeof price.display === "string") {
        // Parse "$450 per week", "$450/w", "$450pw" etc.
        const match = price.display.match(/\$?([\d,]+)(?:\s*(?:pw|p\.w\.|\/w|\s*per\s*week|\s*a\s*week))?/i);
        if (match) {
          const num = parseInt(match[1].replace(/,/g, ""), 10);
          // Sanity check — rentals are $100-$3000/week in AU
          if (num >= 100 && num <= 3000) weeklyRent = num;
        }
      }
      if (weeklyRent > 0) rents.push(weeklyRent);
    }

    if (rents.length === 0) {
      return NextResponse.json({
        ok: true,
        median: 0,
        count: 0,
        reason: "No rental listings found",
      });
    }

    // Calculate median
    rents.sort((a, b) => a - b);
    const mid = Math.floor(rents.length / 2);
    const median = rents.length % 2 === 0
      ? Math.round((rents[mid - 1] + rents[mid]) / 2)
      : rents[mid];

    // Cache
    cache.set(cacheKey, { median, count: rents.length, timestamp: Date.now() });

    return NextResponse.json({
      ok: true,
      median,
      count: rents.length,
      cached: false,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Rental search failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
