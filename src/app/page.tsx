"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/data";
import { useProperties, useLoans, useIncomes } from "@/lib/useData";

export default function Dashboard() {
  const { properties, loaded: pLoaded } = useProperties();
  const { loans, loaded: lLoaded } = useLoans();
  const { incomes, loaded: iLoaded } = useIncomes();

  if (!pLoaded || !lLoaded || !iLoaded) {
    return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;
  }

  function getLoanForProperty(propertyId: string) {
    return loans.find((l) => l.propertyId === propertyId);
  }

  const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalMortgage = loans.reduce((sum, l) => sum + l.balance, 0);
  const totalEquity = totalValue - totalMortgage;
  const totalWeeklyRent = properties.reduce((sum, p) => sum + p.weeklyRent, 0);
  const annualRentalIncome = totalWeeklyRent * 52;
  const totalAnnualNetIncome = incomes.reduce((sum, i) => sum + i.annualNet, 0);
  const totalAnnualGrossIncome = incomes.reduce((sum, i) => sum + i.annualGross, 0);
  const totalOffsetBalance = loans.reduce((sum, l) => sum + l.offsetBalance, 0);
  const portfolioLVR = (totalMortgage / totalValue) * 100;
  const effectiveDebt = totalMortgage - totalOffsetBalance;

  // Borrowing capacity calculations
  const rentalShading = 0.80;
  const assessmentBuffer = 3.0;
  const dsrLimit = 0.35;
  const loanTerm = 30;
  const totalAssessedIncome = totalAnnualGrossIncome + (annualRentalIncome * rentalShading);
  const existingAnnualDebt = loans.reduce((s, l) =>
    s + l.repaymentAmount * (l.repaymentFrequency === "fortnightly" ? 26 : 12), 0
  );
  const assessmentRate = (Math.max(...loans.map((l) => l.interestRate)) + assessmentBuffer) / 100;
  const maxAnnualRepayment = totalAssessedIncome * dsrLimit - existingAnnualDebt;
  const monthlyRate = assessmentRate / 12;
  const numPayments = loanTerm * 12;
  const maxBorrowing = maxAnnualRepayment > 0
    ? (maxAnnualRepayment / 12) * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate)
    : 0;
  // DTI check
  const dtiLimit = 6;
  const maxDebtByDTI = totalAnnualGrossIncome * dtiLimit - totalMortgage;
  const effectiveMaxBorrowing = Math.min(Math.max(0, maxBorrowing), Math.max(0, maxDebtByDTI));
  // Usable equity
  const usableEquity = properties.reduce((sum, p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    return sum + Math.max(0, p.currentValue * 0.8 - (loan?.balance ?? 0));
  }, 0);
  // Max property price (with 20% deposit from equity + offset)
  const totalAvailableFunds = usableEquity + totalOffsetBalance;
  const maxPropertyPrice = Math.min(effectiveMaxBorrowing / 0.8, totalAvailableFunds / 0.2);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
        <p className="text-[var(--muted)]">Stuart & Sasitron — Portfolio Overview</p>
      </div>

      {/* Top Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Portfolio Value" value={formatCurrency(totalValue)} />
        <SummaryCard label="Total Equity" value={formatCurrency(totalEquity)} positive />
        <SummaryCard label="Total Debt" value={formatCurrency(totalMortgage)} />
        <SummaryCard label="Effective Debt (after offset)" value={formatCurrency(effectiveDebt)} />
      </div>

      {/* Income & Rent Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Combined Gross Income" value={formatCurrency(totalAnnualGrossIncome)} subtext="/year" />
        <SummaryCard label="Combined Net Income" value={formatCurrency(totalAnnualNetIncome)} positive subtext="/year" />
        <SummaryCard label="Rental Income" value={formatCurrency(annualRentalIncome)} positive subtext="/year" />
        <SummaryCard label="Offset Savings" value={formatCurrency(totalOffsetBalance)} positive />
      </div>

      {/* Borrowing Capacity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Borrowing Power</h3>
          <Link href="/borrowing" className="text-sm text-[var(--accent)] hover:underline">
            Full calculator
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Est. Max New Borrowing" value={formatCurrency(effectiveMaxBorrowing)} positive />
          <SummaryCard label="Usable Equity (80% LVR)" value={formatCurrency(usableEquity)} positive />
          <SummaryCard label="Available for Deposit" value={formatCurrency(totalAvailableFunds)} positive subtext="equity + offset" />
          <SummaryCard label="Max Property Price" value={formatCurrency(maxPropertyPrice)} positive subtext="at 20% deposit" />
        </div>
        <div className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
          <div className="text-sm font-medium mb-2">Your Price Range</div>
          <div className="text-2xl font-bold text-[var(--positive)]">Up to {formatCurrency(maxPropertyPrice)}</div>
          <div className="text-xs text-[var(--muted)] mt-1">
            Based on {formatCurrency(effectiveMaxBorrowing)} max borrowing + {formatCurrency(totalAvailableFunds)} available funds for deposit.
            Assessment rate: {(assessmentRate * 100).toFixed(1)}% | DTI: {(totalMortgage / totalAnnualGrossIncome).toFixed(1)}x of {dtiLimit}x limit
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--accent)]/20">
            <div className="text-xs font-medium text-[var(--muted)] mb-2">How to increase your borrowing power:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-[var(--muted)]">
              <div>- Pay down existing debt (reduces DTI)</div>
              <div>- Increase rental income (raises assessed income)</div>
              <div>- Reduce living expenses on record</div>
              <div>- Close unused credit cards (limits count as debt)</div>
              <div>- Switch investment loans to interest-only (lower repayments)</div>
              <div>- Refinance to a lower rate (reduces assessment rate)</div>
              <div>- Add offset funds (doesn&apos;t reduce loan but shows savings)</div>
              <div>- Use a broker to find lenders with higher DTI tolerance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Properties</h3>
          <Link href="/properties" className="text-sm text-[var(--accent)] hover:underline">
            View details
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {properties.map((property) => {
            const loan = getLoanForProperty(property.id);
            const equity = property.currentValue - (loan?.balance ?? 0);
            const growthPct = ((property.currentValue - property.purchasePrice) / property.purchasePrice * 100).toFixed(1);

            return (
              <div key={property.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image
                    src={property.image}
                    alt={property.address}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{property.address}</h4>
                    <p className="text-sm text-[var(--muted)]">{property.suburb}, {property.state} {property.postcode}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    property.type === "PPOR"
                      ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                      : "bg-[var(--positive)]/20 text-[var(--positive)]"
                  }`}>
                    {property.type}
                  </span>
                </div>
                <div className="text-sm text-[var(--muted)] mb-1">Owner: {property.owner}</div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Stat label="Current Value" value={formatCurrency(property.currentValue)} />
                  <Stat label="Growth" value={`+${formatCurrency(property.growthSincePurchase)}`} sub={`+${growthPct}%`} positive />
                  <Stat label="Loan Balance" value={formatCurrency(loan?.balance ?? 0)} />
                  <Stat label="Equity" value={formatCurrency(equity)} positive />
                  <Stat label="Weekly Rent" value={formatCurrency(property.weeklyRent)} />
                  <Stat label="Interest Rate" value={`${loan?.interestRate ?? 0}%`} />
                </div>
                {loan && loan.offsetBalance > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)] text-sm">
                    <span className="text-[var(--muted)]">Offset: </span>
                    <span className="text-[var(--positive)] font-medium">{formatCurrency(loan.offsetBalance)}</span>
                    <span className="text-[var(--muted)]"> (paying interest on {formatCurrency(loan.balance - loan.offsetBalance)})</span>
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-sm mb-1">Portfolio LVR</div>
          <div className="text-2xl font-bold">{portfolioLVR.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-sm mb-1">Weekly Rent (Total)</div>
          <div className="text-2xl font-bold text-[var(--positive)]">{formatCurrency(totalWeeklyRent)}<span className="text-sm text-[var(--muted)]">/wk</span></div>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-[var(--muted)] text-sm mb-1">Combined Net Fortnightly</div>
          <div className="text-2xl font-bold text-[var(--positive)]">{formatCurrency(incomes.reduce((s, i) => s + i.netFortnightly, 0))}</div>
        </div>
      </div>

      <SeedButton />

      <p className="text-center text-[var(--muted)] text-xs pt-4">
        Built with care in Gray, NT
      </p>
    </div>
  );
}

function SummaryCard({ label, value, positive, subtext }: {
  label: string; value: string; positive?: boolean; subtext?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="text-[var(--muted)] text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${positive ? "text-[var(--positive)]" : ""}`}>
        {value}
        {subtext && <span className="text-sm text-[var(--muted)] font-normal ml-1">{subtext}</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`text-sm font-semibold ${positive ? "text-[var(--positive)]" : ""}`}>
        {value}
        {sub && <span className="text-xs ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function SeedButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<string>("");

  async function handleSeed() {
    setStatus("loading");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatus("done");
        setResult(JSON.stringify(data.seeded, null, 2));
      } else {
        setStatus("error");
        setResult(data.error || "Unknown error");
      }
    } catch (e) {
      setStatus("error");
      setResult(String(e));
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Database Setup</div>
          <div className="text-xs text-[var(--muted)]">Seed MongoDB with your property, loan, income & expense data</div>
        </div>
        <button
          onClick={handleSeed}
          disabled={status === "loading"}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            status === "done"
              ? "bg-[var(--positive)]/20 text-[var(--positive)] border border-[var(--positive)]/30"
              : status === "error"
              ? "bg-[var(--negative)]/20 text-[var(--negative)] border border-[var(--negative)]/30"
              : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          }`}
        >
          {status === "loading" ? "Seeding..." : status === "done" ? "Seeded" : status === "error" ? "Failed" : "Seed Database"}
        </button>
      </div>
      {result && (
        <pre className="mt-3 text-xs text-[var(--muted)] bg-[var(--background)] rounded p-2 overflow-x-auto">{result}</pre>
      )}
    </div>
  );
}
