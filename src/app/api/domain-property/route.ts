import { NextRequest, NextResponse } from "next/server";
import {
  isDomainConfigured,
  getPropertyDetails,
  getPriceEstimate,
  getSuburbStats,
} from "@/lib/domainApi";

// GET /api/domain-property?id=<propertyId>
// Returns property details + price estimate + suburb stats in one call
export async function GET(req: NextRequest) {
  if (!isDomainConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Domain API not configured" },
      { status: 503 }
    );
  }

  const propertyId = req.nextUrl.searchParams.get("id");
  if (!propertyId) {
    return NextResponse.json(
      { ok: false, error: "Missing property id" },
      { status: 400 }
    );
  }

  try {
    // Fetch all data in parallel
    const [details, priceEstimate] = await Promise.all([
      getPropertyDetails(propertyId),
      getPriceEstimate(propertyId),
    ]);

    // Suburb stats needs a suburbId — try to fetch if we have state info
    let suburbStats = null;
    if (details.state) {
      // Domain API suburb ID isn't directly available from property details,
      // so suburb stats may not work in all cases. We'll try and gracefully fail.
      try {
        suburbStats = await getSuburbStats(details.state, details.suburb, "house");
      } catch {
        // Suburb stats not available — that's OK
      }
    }

    return NextResponse.json({
      ok: true,
      property: details,
      priceEstimate,
      suburbStats,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Property lookup failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
