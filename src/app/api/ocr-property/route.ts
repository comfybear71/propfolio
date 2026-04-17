import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/apiAuth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_IMAGES = 3;

type SupportedMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function mediaTypeFor(type: string): SupportedMedia {
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  if (type === "image/gif") return "image/gif";
  return "image/jpeg";
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const files: File[] = [];
  for (const value of formData.getAll("files")) {
    if (value instanceof File) files.push(value);
  }

  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ ok: false, error: `Max ${MAX_IMAGES} images per property` }, { status: 400 });
  }

  const imageBlocks = await Promise.all(
    files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaTypeFor(file.type),
          data: base64,
        },
      };
    })
  );

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: PROPERTY_PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ ok: true, data });
    }
    return NextResponse.json({ ok: true, data: {}, raw: responseText });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `OCR failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

const PROPERTY_PROMPT = `You are looking at one or more images of Australian property documents (rates notices, rental statements, valuations, listing screenshots, loan statements, etc.) for the SAME property.

Extract the property's street address and estimated value. If the documents conflict, prefer the most recent or most authoritative source (valuation > rates notice > listing).

Return ONLY a JSON object, no other text:

{
  "address": "Street number and street name only, e.g. '60 Bagshaw Crescent'",
  "suburb": "Suburb name, e.g. 'Gray'",
  "state": "Two-letter state code, e.g. 'NT'",
  "postcode": "Four-digit postcode, e.g. '0830'",
  "estimatedValue": 628000
}

Rules:
- Use null for any field you cannot read confidently.
- address must be street-level only (no suburb/state/postcode mixed in).
- estimatedValue is a number in AUD (no $ or commas). If a range is shown, use the midpoint.
- Do not guess. If unsure, return null for that field.`;
