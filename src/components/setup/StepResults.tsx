"use client";

import { type Person, type SetupProperty } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  people: Person[];
  properties: SetupProperty[];
  bankBalance: number;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}

export default function StepResults({ people, properties, bankBalance, onBack, onFinish, saving }: Props) {
  // Combined income
  const totalGross = people.reduce((s, p) => s + (p.income?.annualGross || 0), 0);
  const totalNet = people.reduce((s, p) => s + (p.income?.annualNet || 0), 0);
  const totalRent = properties.reduce((s, p) => s + p.weeklyRent * 52, 0);

  // Equity
  const totalValue = properties.reduce((s, p) => s + p.estimatedValue, 0);
  const totalDebt = properties.reduce((s, p) => s + p.loanBalance, 0);
  const totalEquity = totalValue - totalDebt;
  const totalOffset = properties.reduce((s, p) => s + p.offsetBalance, 0);
  const usableEquity = properties.reduce(
    (s, p) => s + Math.max(0, p.estimatedValue * 0.8 - p.loanBalance), 0
  );

  // Borrowing capacity (simplified assessment)
  const rentalShading = 0.8;
  const assessedIncome = totalGross + totalRent * rentalShading;
  const bufferRate = Math.max(...properties.map((p) => p.interestRate || 6), 6) + 3;
  const monthlyRate = bufferRate / 100 / 12;
  const numPayments = 30 * 12;
  const annualRepaymentCap = assessedIncome * 0.35;
  const existingDebt = properties.reduce(
    (s, p) => s + p.loanBalance * (p.interestRate / 100 / 12) * 12, 0
  );
  const maxBorrow =
    Math.max(0, (annualRepaymentCap - existingDebt) / 12) *
    ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);

  // DTI
  const dti = totalGross > 0 ? totalDebt / totalGross : 0;
  const dtiCapacity = totalGross * 6 - totalDebt;

  // What can they buy?
  const deposit = usableEquity;
  const maxPropertyAt20 = deposit > 0 ? deposit / 0.2 : 0;
  const newLoanNeeded = maxPropertyAt20 * 0.8;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your Portfolio Summary</h2>
        <p className="text-[var(--muted)]">
          Here&apos;s where you stand — and what you can do next
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Income */}
        <Card title="Combined Income">
          <Row label="Gross income" value={`${formatCurrency(totalGross)}/yr`} highlight />
          <Row label="Net income" value={`${formatCurrency(totalNet)}/yr`} />
          {totalRent > 0 && <Row label="Rental income" value={`${formatCurrency(totalRent)}/yr`} />}
          {people.map((p) => p.income && (
            <Row
              key={p.id}
              label={`${p.name} (${p.income.employer})`}
              value={formatCurrency(p.income.annualGross)}
              sub
            />
          ))}
        </Card>

        {/* Portfolio */}
        <Card title="Property Portfolio">
          <Row label="Total value" value={formatCurrency(totalValue)} highlight />
          <Row label="Total debt" value={formatCurrency(totalDebt)} />
          <Row label="Total equity" value={formatCurrency(totalEquity)} highlight />
          <Row label="Offset savings" value={formatCurrency(totalOffset)} />
          <Row label="Bank savings" value={formatCurrency(bankBalance)} />
          <Row label="Usable equity (80% LVR)" value={formatCurrency(usableEquity)} highlight />
        </Card>

        {/* Borrowing Power */}
        <Card title="Borrowing Power">
          <Row label="Estimated max borrowing" value={formatCurrency(maxBorrow)} highlight />
          <Row label="DTI capacity remaining" value={formatCurrency(Math.max(0, dtiCapacity))} />
          <Row label="Current DTI" value={`${dti.toFixed(1)}x`} />
          {deposit > 0 && (
            <>
              <div className="border-t border-[var(--card-border)] my-2" />
              <Row label="Available deposit" value={formatCurrency(deposit)} />
              <Row label="Max property (20% deposit)" value={formatCurrency(maxPropertyAt20)} highlight />
              <Row label="New loan needed" value={formatCurrency(newLoanNeeded)} />
              {newLoanNeeded <= maxBorrow ? (
                <div className="text-sm text-[var(--positive)] font-medium mt-1">
                  Within borrowing capacity
                </div>
              ) : (
                <div className="text-sm text-[var(--negative)] font-medium mt-1">
                  Exceeds capacity — consider a smaller build or larger deposit
                </div>
              )}
            </>
          )}
        </Card>

        {/* NT Strategy hint */}
        <div className="rounded-xl border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5 text-sm space-y-2">
          <div className="font-medium">NT New Build Advantages</div>
          <div className="text-[var(--muted)] space-y-1">
            <p>- $30,000 NT BuildBonus grant per new build</p>
            <p>- Stamp duty on land only (not the build cost)</p>
            <p>- Full depreciation schedule from day one</p>
            <p>- Room rentals: 3 rooms @ $350/wk = $1,050/wk potential rent</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between max-w-2xl mx-auto pt-4">
        <button onClick={onBack} className="px-6 py-3 text-[var(--muted)] hover:text-white transition-colors">
          Back
        </button>
        <button
          onClick={onFinish}
          disabled={saving}
          className="px-8 py-3 bg-[var(--positive)] text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-40"
        >
          {saving ? "Saving..." : "Complete Setup"}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-2">
      <div className="font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${sub ? "pl-3 text-xs" : ""}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <span className={highlight ? "font-semibold text-[var(--positive)]" : ""}>{value}</span>
    </div>
  );
}
