import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.GOOGLE_MAPS_API_KEY;

// GET /api/places-details?placeId=ChIJ...
// Returns full address components + lat/lng for a Google place
export async function GET(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_MAPS_API_KEY not configured" },
      { status: 503 }
    );
  }

  const placeId = req.nextUrl.searchParams.get("placeId");
  if (!placeId) {
    return NextResponse.json({ ok: false, error: "Missing placeId" }, { status: 400 });
  }

  // Use the new Places API (v1) — place details
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location,displayName",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, error: `Place details error: ${res.status} - ${text.substring(0, 300)}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Parse address components into easier fields
    interface AddressComponent {
      longText: string;
      shortText: string;
      types: string[];
    }

    const components: AddressComponent[] = data.addressComponents || [];

    function getComponent(type: string, useShort = false): string {
      const c = components.find((c) => c.types.includes(type));
      if (!c) return "";
      return useShort ? c.shortText : c.longText;
    }

    const streetNumber = getComponent("street_number");
    const streetName = getComponent("route");
    const subpremise = getComponent("subpremise");
    const suburb = getComponent("locality") || getComponent("postal_town") || getComponent("sublocality");
    const state = getComponent("administrative_area_level_1", true);
    const postcode = getComponent("postal_code");
    const country = getComponent("country", true);

    return NextResponse.json({
      ok: true,
      placeId: data.id,
      formattedAddress: data.formattedAddress || "",
      streetNumber: subpremise ? `${subpremise}/${streetNumber}` : streetNumber,
      streetName,
      suburb,
      state,
      postcode,
      country,
      lat: data.location?.latitude || null,
      lng: data.location?.longitude || null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Place details failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
