import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const docCategory = formData.get("category") as string || "";

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const isPdf = file.type === "application/pdf";

  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
  if (file.type === "image/png") mediaType = "image/png";
  else if (file.type === "image/webp") mediaType = "image/webp";

  // Pick the right prompt based on document category
  const prompt = getPromptForCategory(docCategory);

  try {
    const content = isPdf
      ? [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } },
          { type: "text" as const, text: prompt },
        ]
      : [
          { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } },
          { type: "text" as const, text: prompt },
        ];

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock ? textBlock.text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ ok: true, data, documentType: data.documentType || docCategory });
    }

    return NextResponse.json({ ok: true, data: {}, raw: responseText });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `OCR failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

function getPromptForCategory(category: string): string {
  const baseInstruction = `Analyse this Australian document and extract all relevant details. First identify what type of document this is, then extract the appropriate fields. Return ONLY a JSON object.`;

  if (category.includes("Income") || category.includes("Pay")) {
    return `${baseInstruction}

For PAYSLIPS, extract:
{
  "documentType": "payslip",
  "employeeName": "", "employer": "", "employerABN": "", "jobTitle": "",
  "payPeriodStart": "YYYY-MM-DD", "payPeriodEnd": "YYYY-MM-DD", "payDate": "YYYY-MM-DD",
  "payFrequency": "weekly|fortnightly|monthly",
  "hoursWorked": 0, "hourlyRate": 0, "grossPay": 0, "netPay": 0,
  "taxWithheld": 0, "superannuation": 0, "superRate": 0,
  "ytdGross": 0, "ytdTax": 0, "ytdNet": 0, "ytdSuper": 0,
  "allowances": [{"name": "", "amount": 0}],
  "deductions": [{"name": "", "amount": 0}],
  "leaveBalances": [{"type": "", "hours": 0}],
  "annualSalary": 0, "annualGross": 0, "annualNet": 0, "fortnightlyNet": 0
}

CRITICAL RULES for annual figures:
1. Look for an "Annual Salary" field printed on the payslip — if it exists, use that as "annualSalary"
2. "annualGross" = the Annual Salary field if found, otherwise grossPay * 26 for fortnightly or grossPay * 12 for monthly
3. DO NOT calculate annual from YTD figures — YTD includes overtime and allowances that inflate the number
4. "annualNet" = netPay * 26 for fortnightly, netPay * 12 for monthly
5. "fortnightlyNet" = the net pay per pay period (for fortnightly payslips)
6. grossPay and netPay should be the amounts for THIS pay period only, not YTD

Different payslips look different — look for any field labelled "Annual Salary", "Base Salary", "Annual Rate", or similar.

Return ONLY JSON.

For TAX RETURNS / NOA, extract:
{
  "documentType": "tax_return",
  "taxpayerName": "", "tfn": "", "financialYear": "",
  "totalIncome": 0, "taxableIncome": 0, "taxPayable": 0, "taxWithheld": 0,
  "refundOrDebt": 0, "medicareLevy": 0,
  "rentalIncome": 0, "rentalDeductions": 0, "netRentalResult": 0
}

Calculate annual figures where possible. Return ONLY JSON.`;
  }

  if (category.includes("Assets") || category.includes("Bank") || category.includes("Savings")) {
    return `${baseInstruction}

For BANK STATEMENTS, extract:
{
  "documentType": "bank_statement",
  "accountHolder": "", "bankName": "", "bsb": "", "accountNumber": "",
  "accountType": "", "statementPeriod": "",
  "openingBalance": 0, "closingBalance": 0,
  "totalCredits": 0, "totalDebits": 0,
  "averageBalance": 0,
  "regularIncome": [{"description": "", "amount": 0, "frequency": ""}],
  "regularExpenses": [{"description": "", "amount": 0, "frequency": ""}]
}

For SUPER STATEMENTS, extract:
{
  "documentType": "super_statement",
  "memberName": "", "fundName": "", "memberNumber": "",
  "balance": 0, "investmentOption": "",
  "employerContributions": 0, "personalContributions": 0,
  "insuranceCover": ""
}

Return ONLY JSON.`;
  }

  if (category.includes("Properties") || category.includes("Existing")) {
    return `${baseInstruction}

For MORTGAGE/LOAN STATEMENTS, extract:
{
  "documentType": "loan_statement",
  "borrowerName": "", "lender": "", "accountNumber": "",
  "loanType": "Variable|Fixed|Split",
  "originalLoanAmount": 0, "currentBalance": 0,
  "interestRate": 0, "rateType": "variable|fixed",
  "repaymentAmount": 0, "repaymentFrequency": "weekly|fortnightly|monthly",
  "offsetBalance": 0, "redrawAvailable": 0,
  "nextRepaymentDate": "",
  "propertyAddress": ""
}

For COUNCIL RATES NOTICES, extract:
{
  "documentType": "rates_notice",
  "propertyAddress": "", "council": "",
  "annualRates": 0, "unimprovedValue": 0, "capitalImprovedValue": 0
}

For TITLE DEEDS, extract:
{
  "documentType": "title_deed",
  "propertyAddress": "", "titleReference": "", "volume": "", "folio": "",
  "registeredOwner": "", "lotPlan": "", "landArea": ""
}

For INSURANCE, extract:
{
  "documentType": "insurance",
  "insurer": "", "policyNumber": "", "policyType": "",
  "propertyAddress": "", "sumInsured": 0, "annualPremium": 0,
  "expiryDate": ""
}

For RENTAL/LEASE AGREEMENTS, extract:
{
  "documentType": "lease_agreement",
  "tenantName": "", "landlord": "", "propertyAddress": "",
  "weeklyRent": 0, "leaseStart": "", "leaseEnd": "",
  "bond": 0, "propertyManager": ""
}

Return ONLY JSON.`;
  }

  if (category.includes("Identity")) {
    return `${baseInstruction}

For DRIVERS LICENCE, extract:
{
  "documentType": "drivers_licence",
  "fullName": "", "dateOfBirth": "", "licenceNumber": "",
  "address": "", "expiryDate": "", "state": "", "licenceClass": ""
}

For PASSPORT, extract:
{
  "documentType": "passport",
  "fullName": "", "dateOfBirth": "", "passportNumber": "",
  "nationality": "", "expiryDate": "", "placeOfBirth": ""
}

For MEDICARE CARD, extract:
{
  "documentType": "medicare",
  "cardNumber": "", "members": [{"name": "", "ref": ""}], "expiryDate": ""
}

Return ONLY JSON.`;
  }

  if (category.includes("Liabilities")) {
    return `${baseInstruction}

For CREDIT CARD STATEMENTS, extract:
{
  "documentType": "credit_card",
  "cardHolder": "", "issuer": "", "cardType": "",
  "creditLimit": 0, "closingBalance": 0, "minimumPayment": 0,
  "interestRate": 0
}

For LOAN STATEMENTS (personal/car/HECS), extract:
{
  "documentType": "personal_loan",
  "borrowerName": "", "lender": "", "loanType": "",
  "originalAmount": 0, "currentBalance": 0,
  "repaymentAmount": 0, "interestRate": 0
}

Return ONLY JSON.`;
  }

  // Generic fallback
  return `${baseInstruction}

Identify the document type and extract ALL relevant details into a structured JSON object.
Include a "documentType" field describing what kind of document this is.
Extract names, dates, amounts, account numbers, addresses — everything visible.
Return ONLY JSON.`;
}
