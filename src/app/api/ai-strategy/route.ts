import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const { goal } = await req.json();

  // Gather all user data
  const [properties, loans, incomes, expenses, assets] = await Promise.all([
    db.collection("properties").find({ userId }).toArray(),
    db.collection("loans").find({ userId }).toArray(),
    db.collection("incomes").find({ userId }).toArray(),
    db.collection("expenses").find({ userId }).toArray(),
    db.collection("assets").find({ userId }).toArray(),
  ]);

  // Build financial snapshot
  const totalValue = properties.reduce((s, p) => s + (p.currentValue || 0), 0);
  const totalDebt = loans.reduce((s, l) => s + (l.balance || 0), 0);
  const totalOffset = loans.reduce((s, l) => s + (l.offsetBalance || 0), 0);
  const totalWeeklyRent = properties.reduce((s, p) => s + (p.weeklyRent || 0), 0);
  const combinedGross = incomes.reduce((s, i) => s + (i.annualGross || 0), 0);
  const combinedNet = incomes.reduce((s, i) => s + (i.annualNet || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => {
    const freq = e.frequency || "monthly";
    const mult = freq === "weekly" ? 52 : freq === "fortnightly" ? 26 : freq === "monthly" ? 12 : freq === "quarterly" ? 4 : 1;
    return s + (e.amount || 0) * mult;
  }, 0);
  const savingsAssets = assets.filter(a => a.category === "Savings" || a.category === "Superannuation");

  const dataSnapshot = `
PORTFOLIO SNAPSHOT:
- Properties owned: ${properties.length}
- Total portfolio value: $${totalValue.toLocaleString()}
- Total debt: $${totalDebt.toLocaleString()}
- Total equity: $${(totalValue - totalDebt).toLocaleString()}
- Total offset/redraw: $${totalOffset.toLocaleString()}
- Effective debt: $${(totalDebt - totalOffset).toLocaleString()}

PROPERTIES:
${properties.map(p => {
  const loan = loans.find(l => l.propertyId === p.id);
  const equity = (p.currentValue || 0) - (loan?.balance || 0);
  const usable = Math.max(0, (p.currentValue || 0) * 0.8 - (loan?.balance || 0));
  return `- ${p.address}, ${p.suburb} ${p.state} ${p.postcode}
  Type: ${p.type} | Owner: ${p.owner}
  Value: $${(p.currentValue || 0).toLocaleString()} | Loan: $${(loan?.balance || 0).toLocaleString()} @ ${loan?.interestRate || 0}%
  Equity: $${equity.toLocaleString()} | Usable equity (80% LVR): $${usable.toLocaleString()}
  Offset: $${(loan?.offsetBalance || 0).toLocaleString()} | Weekly rent: $${(p.weeklyRent || 0).toLocaleString()}`;
}).join('\n')}

INCOME:
${incomes.map(i => `- ${i.person}: ${i.employer} (${i.jobTitle})
  Annual gross: $${(i.annualGross || 0).toLocaleString()} | Annual net: $${(i.annualNet || 0).toLocaleString()}
  Pay frequency: ${i.payFrequency}`).join('\n')}
- Combined gross: $${combinedGross.toLocaleString()}/yr
- Combined net: $${combinedNet.toLocaleString()}/yr
- Rental income: $${(totalWeeklyRent * 52).toLocaleString()}/yr

EXPENSES:
- Total annual expenses: $${totalExpenses.toLocaleString()}/yr
- Annual surplus: $${(combinedNet + totalWeeklyRent * 52 - totalExpenses).toLocaleString()}/yr

ASSETS:
${savingsAssets.length > 0 ? savingsAssets.map(a => `- ${a.description}: $${(a.estimatedValue || 0).toLocaleString()} (${a.owner})`).join('\n') : '- No savings/super recorded'}

DTI RATIO: ${combinedGross > 0 ? (totalDebt / combinedGross).toFixed(1) : 'N/A'}x
PORTFOLIO LVR: ${totalValue > 0 ? ((totalDebt / totalValue) * 100).toFixed(1) : 'N/A'}%
`;

  const prompt = `You are an expert Australian property investment strategist. Analyse this investor's portfolio and create a personalised strategy and roadmap.

${dataSnapshot}

USER'S GOAL:
${goal || "Build wealth through property investment. Grow portfolio as much as possible over the next 5 years."}

CONTEXT:
- All properties are in the Northern Territory, Australia
- NT offers a $30,000 BuildBonus grant for each new build
- Stamp duty in NT is charged on land only for new builds (not the build cost)
- Room rental strategy: 4-bed ensuite houses, rent 3 rooms @ $350/wk = $1,050/wk
- Offset account strategy: all income into offset accounts, cascade to next property when 100%
- Equity release: borrow up to 80% LVR from existing properties for deposits
- Construction loans: interest-only on drawn amounts during 12-18 month build

IMPORTANT RULES:
1. Base ALL numbers on the actual data provided above — do not make up figures
2. If the user has no properties, focus on getting their first property
3. If they have properties, focus on using equity to grow
4. Be specific with dollar amounts, timelines, and action items
5. Consider their DTI ratio and borrowing capacity realistically
6. Factor in the NT BuildBonus and stamp duty savings
7. Australian tax context: negative gearing, depreciation (Div 43 + Div 40), CGT 50% discount after 12 months

Return ONLY a JSON object with this structure:
{
  "summary": "2-3 sentence overview of their position and recommendation",
  "phases": [
    {
      "title": "Phase title",
      "timeline": "e.g. Now → 6 Months",
      "steps": [
        {
          "title": "Step title",
          "description": "Detailed explanation with specific numbers from their data",
          "priority": "critical" | "important" | "normal",
          "actionItems": ["Specific action 1", "Specific action 2"]
        }
      ]
    }
  ],
  "keyMetrics": [
    { "label": "Metric name", "current": "current value", "target": "target value", "timeframe": "by when" }
  ],
  "risks": ["Risk 1 to be aware of", "Risk 2"],
  "immediateActions": ["Action 1 to do this week", "Action 2"]
}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock ? textBlock.text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const strategy = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ ok: true, strategy });
      } catch {
        return NextResponse.json({ ok: true, strategy: null, raw: responseText.substring(0, 2000), error: "Could not parse strategy" });
      }
    }

    return NextResponse.json({ ok: true, strategy: null, raw: responseText.substring(0, 2000) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Strategy generation failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
