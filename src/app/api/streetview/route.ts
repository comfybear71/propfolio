import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.GOOGLE_MAPS_API_KEY;

// GET /api/streetview?lat=...&lng=...&size=600x400
// Proxies a Street View Static API image (so we don't expose the API key client-side)
// Or returns metadata if ?metadata=1 — useful to check if Street View exists for a location
export async function GET(req: NextRequest) {
  if (!KEY) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_MAPS_API_KEY not configured" },
      { status: 503 }
    );
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const address = req.nextUrl.searchParams.get("address");
  const size = req.nextUrl.searchParams.get("size") || "640x400";
  const metadata = req.nextUrl.searchParams.get("metadata") === "1";

  if (!lat && !lng && !address) {
    return NextResponse.json({ ok: false, error: "Missing lat/lng or address" }, { status: 400 });
  }

  const params = new URLSearchParams({
    size,
    fov: "80",
    pitch: "0",
    key: KEY,
    return_error_code: "true",
  });

  if (lat && lng) {
    params.set("location", `${lat},${lng}`);
  } else if (address) {
    params.set("location", address);
  }

  // Metadata mode: just check if Street View is available
  if (metadata) {
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?${params.toString()}`;
    try {
      const res = await fetch(metaUrl);
      const data = await res.json();
      return NextResponse.json({
        ok: data.status === "OK",
        available: data.status === "OK",
        status: data.status,
        location: data.location,
      });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: String(err) },
        { status: 500 }
      );
    }
  }

  // Image mode: proxy the actual image
  const imageUrl = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Street View error: ${res.status}` },
        { status: res.status }
      );
    }
    const blob = await res.arrayBuffer();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Street View fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
