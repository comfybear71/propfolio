import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/apiAuth";

// POST /api/ocr-rea-screenshot
// Body: multipart/form-data with "file" = image of REA property profile page
// Uses Claude Vision to extract property details from the screenshot

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
  if (file.type === "image/png") mediaType = "image/png";
  else if (file.type === "image/webp") mediaType = "image/webp";
  else if (file.type === "image/gif") mediaType = "image/gif";

  const prompt = `You are looking at a screenshot from realestate.com.au showing an Australian property. Extract every visible data point into a JSON object.

Return ONLY a valid JSON object with these fields (use 0 or empty string if not visible):
{
  "address": "street address if visible",
  "suburb": "",
  "state": "",
  "postcode": "",
  "propertyType": "House / Unit / Townhouse / etc.",
  "bedrooms": 0,
  "bathrooms": 0,
  "carSpaces": 0,
  "landSize": 0,
  "buildingSize": 0,
  "yearBuilt": 0,
  "estimatedValue": 0,
  "estimatedValueLow": 0,
  "estimatedValueHigh": 0,
  "estimateConfidence": "Low / Medium / High",
  "growthMonth": 0,
  "growthSinceLastSold": 0,
  "weeklyRent": 0,
  "weeklyRentLow": 0,
  "weeklyRentHigh": 0,
  "rentalYield": 0,
  "suburbAvgYield": 0,
  "suburbMedianHouse": 0,
  "suburbMedianUnit": 0,
  "suburb12mGrowth": 0,
  "saleHistory": [{"date": "YYYY-MM-DD or year", "price": 0}]
}

RULES:
1. "estimatedValue" is the main "realEstimate" value (e.g. $628k means 628000)
2. "estimatedValueLow" and "estimatedValueHigh" are the range values (e.g. $560k - $700k)
3. "weeklyRent" is the main rental estimate (mid-range if showing a range)
4. Growth percentages should be decimal numbers (e.g. "Up 3.4%" = 3.4, "Up 222%" = 222)
5. "rentalYield" and "suburbAvgYield" are percentages (e.g. "5.5%" = 5.5)
6. Land size in square metres (e.g. "35,469 m²" = 35469)
7. Dashes (e.g. "Bedrooms: -") mean the data isn't filled on this property — use 0
8. Parse k/K as thousands (e.g. $628k = 628000, $5.5M = 5500000)
9. For saleHistory, include ALL visible entries. Format dates as ISO when possible.
10. Return ONLY the JSON, no commentary.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: prompt },
        ],
      }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock ? textBlock.text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ ok: true, data });
      } catch {
        return NextResponse.json({ ok: false, error: "Could not parse extracted data", raw: responseText.substring(0, 500) });
      }
    }

    return NextResponse.json({ ok: false, error: "No data extracted", raw: responseText.substring(0, 500) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `OCR failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
