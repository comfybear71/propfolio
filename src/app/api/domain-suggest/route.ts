import { NextRequest, NextResponse } from "next/server";
import { isDomainConfigured, suggestAddresses } from "@/lib/domainApi";

export async function GET(req: NextRequest) {
  if (!isDomainConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Domain API not configured" },
      { status: 503 }
    );
  }

  const terms = req.nextUrl.searchParams.get("terms") || "";
  if (terms.length < 3) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

  try {
    const suggestions = await suggestAddresses(terms);
    return NextResponse.json({ ok: true, suggestions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Address suggest failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
