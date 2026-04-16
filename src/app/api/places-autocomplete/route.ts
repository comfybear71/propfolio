import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.GOOGLE_MAPS_API_KEY;

// GET /api/places-autocomplete?input=60+Bagshaw+Gray
// Returns Google Places autocomplete suggestions for AU addresses
export async function GET(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_MAPS_API_KEY not configured" },
      { status: 503 }
    );
  }

  const input = req.nextUrl.searchParams.get("input") || "";
  if (input.length < 3) {
    return NextResponse.json({ ok: true, predictions: [] });
  }

  // Use the new Places API (v1) — text autocomplete
  const url = "https://places.googleapis.com/v1/places:autocomplete";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["au"],
        // Bias toward addresses (not businesses)
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, error: `Google Places error: ${res.status} - ${text.substring(0, 300)}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Normalise predictions
    interface AutocompleteSuggestion {
      placePrediction?: {
        placeId: string;
        text?: { text: string };
        structuredFormat?: {
          mainText?: { text: string };
          secondaryText?: { text: string };
        };
      };
    }

    const predictions = (data.suggestions || []).map((s: AutocompleteSuggestion) => {
      const p = s.placePrediction;
      if (!p) return null;
      return {
        placeId: p.placeId,
        description: p.text?.text || "",
        mainText: p.structuredFormat?.mainText?.text || "",
        secondaryText: p.structuredFormat?.secondaryText?.text || "",
      };
    }).filter(Boolean);

    return NextResponse.json({ ok: true, predictions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Autocomplete failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
