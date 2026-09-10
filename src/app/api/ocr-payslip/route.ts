import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/apiAuth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  // Convert file to base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // Determine media type
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
  if (file.type === "image/png") mediaType = "image/png";
  else if (file.type === "image/webp") mediaType = "image/webp";
  else if (file.type === "image/gif") mediaType = "image/gif";

  // For PDFs, we'll still send as base64 but use a different approach
  const isPdf = file.type === "application/pdf";

  try {
    const message = await anthropic.messages.create({
      // claude-sonnet-4-20250514 was retired by Anthropic on 2026-06-15 —
      // every call using it now fails outright. claude-sonnet-4-6 is
      // Anthropic's documented direct replacement for that exact model.
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: isPdf
            ? [
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                },
                {
                  type: "text",
                  text: PAYSLIP_PROMPT,
                },
              ]
            : [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: base64 },
                },
                {
                  type: "text",
                  text: PAYSLIP_PROMPT,
                },
              ],
        },
      ],
    });

    // Extract the text response
    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock ? textBlock.text : "";

    if (!responseText) {
      return NextResponse.json(
        { ok: false, error: "Claude returned an empty response — try a clearer scan or a different file format." },
        { status: 502 }
      );
    }

    // Try to parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Claude replied but didn't return structured data — likely couldn't read the
      // payslip (blurry scan, wrong document, refusal, etc). Surface what it actually
      // said instead of silently reporting success with an empty/zeroed-out record.
      return NextResponse.json(
        {
          ok: false,
          error: `Claude couldn't extract payslip data: ${responseText.slice(0, 300)}`,
        },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Claude's response wasn't valid JSON — try again or enter details manually." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    // Anthropic SDK errors (bad/retired model, auth, rate limit, etc.) carry useful
    // detail in err.message — surface it instead of a generic failure so the UI
    // (and Stuart) can see the real cause instead of a blank error.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Claude API error: ${message}` },
      { status: 502 }
    );
  }
}

const PAYSLIP_PROMPT = `Analyse this Australian payslip and extract ALL the following details. Return ONLY a JSON object with these fields (use null if not found):

{
  "employeeName": "Full name",
  "employer": "Company name",
  "employerABN": "ABN if visible",
  "jobTitle": "Role/position",
  "payPeriodStart": "YYYY-MM-DD",
  "payPeriodEnd": "YYYY-MM-DD",
  "payDate": "YYYY-MM-DD",
  "payFrequency": "weekly|fortnightly|monthly",
  "hoursWorked": 0,
  "hourlyRate": 0,
  "grossPay": 0,
  "netPay": 0,
  "taxWithheld": 0,
  "superannuation": 0,
  "superRate": 0,
  "ytdGross": 0,
  "ytdTax": 0,
  "ytdNet": 0,
  "ytdSuper": 0,
  "allowances": [{"name": "string", "amount": 0}],
  "deductions": [{"name": "string", "amount": 0}],
  "leaveBalances": [{"type": "string", "hours": 0}],
  "annualGross": 0,
  "annualNet": 0,
  "fortnightlyNet": 0
}

If you can calculate annual figures from the pay period data, please do so.
For fortnightly pay: annualGross = grossPay * 26, annualNet = netPay * 26.
For monthly pay: annualGross = grossPay * 12, annualNet = netPay * 12.
Return ONLY the JSON, no other text.`;
