"use client";

import { useState } from "react";
import {
  properties,
  loans,
  incomes,
  formatCurrency,
  formatCurrencyExact,
} from "@/lib/data";

export default function BorrowingPage() {
  // Editable scenario inputs
  const [stuartGross, setStuartGross] = useState(incomes[0].annualGross);
  const [sasitronGross, setSasitronGross] = useState(incomes[1].annualGross);
  const [rentalIncome60, setRentalIncome60] = useState(properties[0].weeklyRent * 52);
  const [rentalIncome72, setRentalIncome72] = useState(properties[1].weeklyRent * 52);
  const [monthlyExpenses, setMonthlyExpenses] = useState(5000);
  const [existingDebt, setExistingDebt] = useState(
    loans.reduce((s, l) => s + l.repaymentAmount * (l.repaymentFrequency === "fortnightly" ? 26 : 12), 0)
  );
  const [newPropertyPrice, setNewPropertyPrice] = useState(500000);
  const [newPropertyDeposit, setNewPropertyDeposit] = useState(20);
  const [newLoanRate, setNewLoanRate] = useState(6.5);
  const [newLoanTerm, setNewLoanTerm] = useState(30);
  const [expectedRent, setExpectedRent] = useState(500);

  // Bank assessment rate (typically 3% buffer)
  const assessmentBuffer = 3.0;

  // Gross rental income — banks typically shade rental at 80%
  const rentalShading = 0.80;
  const totalGrossIncome = stuartGross + sasitronGross;
  const totalRentalIncome = (rentalIncome60 + rentalIncome72) * rentalShading;
  const totalAssessedIncome = totalGrossIncome + totalRentalIncome;

  // Annual expenses
  const annualExpenses = monthlyExpenses * 12;

  // Existing commitments (annual)
  const annualExistingDebt = existingDebt;

  // Net Surplus (simplified)
  const netSurplus = totalAssessedIncome - annualExpenses - annualExistingDebt;

  // Max borrowing estimate (simplified DSR method)
  // Banks typically want total debt servicing < 30-35% of gross income
  const dsrLimit = 0.35;
  const maxAnnualRepayment = totalAssessedIncome * dsrLimit - annualExistingDebt;
  const assessmentRate = (Math.max(...loans.map((l) => l.interestRate)) + assessmentBuffer) / 100;

  // Monthly payment to annual
  const maxMonthlyRepayment = maxAnnualRepayment / 12;

  // Reverse PMT to find max loan (P&I, monthly)
  const monthlyRate = assessmentRate / 12;
  const numPayments = newLoanTerm * 12;
  const maxLoanAmount =
    maxMonthlyRepayment > 0
      ? maxMonthlyRepayment * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate)
      : 0;

  // New property scenario
  const newLoanAmount = newPropertyPrice * (1 - newPropertyDeposit / 100);
  const depositAmount = newPropertyPrice * (newPropertyDeposit / 100);
  const stampDutyNT = calculateNTStampDuty(newPropertyPrice);
  const totalCashRequired = depositAmount + stampDutyNT;
  const newMonthlyRate = newLoanRate / 100 / 12;
  const newMonthlyRepayment =
    (newLoanAmount * newMonthlyRate * Math.pow(1 + newMonthlyRate, numPayments)) /
    (Math.pow(1 + newMonthlyRate, numPayments) - 1);
  const newAnnualRepayment = newMonthlyRepayment * 12;
  const newAnnualRent = expectedRent * 52;
  const newCashFlow = newAnnualRent - newAnnualRepayment;
  const newGrossYield = (newAnnualRent / newPropertyPrice) * 100;
  const canAfford = newLoanAmount <= maxLoanAmount;
  const newLVR = ((newLoanAmount / newPropertyPrice) * 100);
  const needsLMI = newLVR > 80;

  // Equity available for deposit (80% usable equity)
  const totalEquity = properties.reduce((sum, p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    return sum + p.currentValue - (loan?.balance ?? 0);
  }, 0);
  const usableEquity = properties.reduce((sum, p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    const available = p.currentValue * 0.8 - (loan?.balance ?? 0);
    return sum + Math.max(0, available);
  }, 0);
  const offsetCash = loans.reduce((s, l) => s + l.offsetBalance, 0);
  const totalAvailableFunds = usableEquity + offsetCash;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Borrowing Capacity</h2>
        <p className="text-[var(--muted)]">Estimate what you could borrow and test scenarios</p>
      </div>

      {/* Current Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Estimated Max Borrowing" value={formatCurrency(Math.max(0, maxLoanAmount))} positive />
        <Card label="Usable Equity (80% LVR)" value={formatCurrency(usableEquity)} positive />
        <Card label="Offset Cash Available" value={formatCurrency(offsetCash)} positive />
        <Card label="Total Available Funds" value={formatCurrency(totalAvailableFunds)} positive />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income & Expenses Inputs */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="font-semibold mb-4">Your Financials</h3>
          <p className="text-xs text-[var(--muted)] mb-4">Adjust these to see how it affects borrowing capacity</p>
          <div className="space-y-3">
            <InputRow label="Stuart Gross Annual" value={stuartGross} onChange={setStuartGross} prefix="$" />
            <InputRow label="Sasitron Gross Annual" value={sasitronGross} onChange={setSasitronGross} prefix="$" />
            <InputRow label="60 Bagshaw Rent (annual)" value={rentalIncome60} onChange={setRentalIncome60} prefix="$" />
            <InputRow label="72 Bagshaw Rent (annual)" value={rentalIncome72} onChange={setRentalIncome72} prefix="$" />
            <InputRow label="Monthly Living Expenses" value={monthlyExpenses} onChange={setMonthlyExpenses} prefix="$" />
            <InputRow label="Annual Existing Debt Payments" value={existingDebt} onChange={setExistingDebt} prefix="$" />

            <div className="border-t border-[var(--card-border)] pt-3 mt-3 space-y-2">
              <InfoRow label="Total Assessed Income" value={formatCurrency(totalAssessedIncome)} />
              <InfoRow label="(Rent shaded at 80%)" value={formatCurrency(totalRentalIncome)} muted />
              <InfoRow label="Assessment Rate" value={`${(assessmentRate * 100).toFixed(2)}% (best rate + ${assessmentBuffer}%)`} />
              <InfoRow label="Max DSR (35%)" value={formatCurrency(totalAssessedIncome * dsrLimit)} />
              <InfoRow label="Net Annual Surplus" value={formatCurrency(netSurplus)} positive={netSurplus > 0} />
            </div>
          </div>
        </div>

        {/* New Property Scenario */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="font-semibold mb-4">Test a Property Purchase</h3>
          <p className="text-xs text-[var(--muted)] mb-4">Enter a scenario to see if it works</p>
          <div className="space-y-3">
            <InputRow label="Property Price" value={newPropertyPrice} onChange={setNewPropertyPrice} prefix="$" />
            <InputRow label="Deposit" value={newPropertyDeposit} onChange={setNewPropertyDeposit} suffix="%" />
            <InputRow label="Interest Rate" value={newLoanRate} onChange={setNewLoanRate} suffix="%" step={0.05} />
            <InputRow label="Loan Term" value={newLoanTerm} onChange={setNewLoanTerm} suffix="years" />
            <InputRow label="Expected Weekly Rent" value={expectedRent} onChange={setExpectedRent} prefix="$" />

            <div className="border-t border-[var(--card-border)] pt-3 mt-3 space-y-2">
              <InfoRow label="Loan Amount" value={formatCurrency(newLoanAmount)} />
              <InfoRow label="Deposit Required" value={formatCurrency(depositAmount)} />
              <InfoRow label="NT Stamp Duty" value={formatCurrency(stampDutyNT)} />
              <InfoRow label="Total Cash Required" value={formatCurrency(totalCashRequired)} />
              <InfoRow label="LVR" value={`${newLVR.toFixed(1)}%`} />
              {needsLMI && (
                <div className="text-xs text-[var(--negative)] bg-[var(--negative)]/10 rounded px-2 py-1">
                  LVR over 80% — Lenders Mortgage Insurance (LMI) will apply
                </div>
              )}
              <InfoRow label="Monthly Repayment" value={formatCurrencyExact(newMonthlyRepayment)} />
              <InfoRow label="Annual Repayment" value={formatCurrency(newAnnualRepayment)} />
              <InfoRow label="Expected Annual Rent" value={formatCurrency(newAnnualRent)} positive />
              <InfoRow label="Gross Yield" value={`${newGrossYield.toFixed(2)}%`} />
              <InfoRow
                label="Annual Cash Flow"
                value={`${newCashFlow >= 0 ? "+" : ""}${formatCurrency(newCashFlow)}`}
                positive={newCashFlow >= 0}
              />

              <div className={`mt-3 p-3 rounded text-sm font-medium text-center ${
                canAfford
                  ? "bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/30"
                  : "bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/30"
              }`}>
                {canAfford
                  ? `Within borrowing capacity (${formatCurrency(newLoanAmount)} < ${formatCurrency(maxLoanAmount)})`
                  : `Exceeds borrowing capacity (${formatCurrency(newLoanAmount)} > ${formatCurrency(maxLoanAmount)})`}
              </div>
              {totalAvailableFunds >= totalCashRequired ? (
                <div className="p-3 rounded text-sm text-center bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/30">
                  Sufficient funds for deposit + stamp duty ({formatCurrency(totalCashRequired)})
                </div>
              ) : (
                <div className="p-3 rounded text-sm text-center bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/30">
                  Shortfall of {formatCurrency(totalCashRequired - totalAvailableFunds)} for deposit + stamp duty
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Equity Breakdown */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h3 className="font-semibold mb-4">Equity Breakdown by Property</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="pb-2 font-medium">Property</th>
                <th className="pb-2 font-medium text-right">Value</th>
                <th className="pb-2 font-medium text-right">Loan</th>
                <th className="pb-2 font-medium text-right">Equity</th>
                <th className="pb-2 font-medium text-right">80% Value</th>
                <th className="pb-2 font-medium text-right">Usable Equity</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const loan = loans.find((l) => l.propertyId === p.id);
                const bal = loan?.balance ?? 0;
                const eq = p.currentValue - bal;
                const eighty = p.currentValue * 0.8;
                const usable = Math.max(0, eighty - bal);
                return (
                  <tr key={p.id} className="border-t border-[var(--card-border)]">
                    <td className="py-2">{p.address}</td>
                    <td className="py-2 text-right">{formatCurrency(p.currentValue)}</td>
                    <td className="py-2 text-right">{formatCurrency(bal)}</td>
                    <td className="py-2 text-right text-[var(--positive)]">{formatCurrency(eq)}</td>
                    <td className="py-2 text-right">{formatCurrency(eighty)}</td>
                    <td className="py-2 text-right text-[var(--positive)]">{formatCurrency(usable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          Usable equity = 80% of property value minus loan balance. Banks typically lend up to 80% LVR without LMI.
        </p>
      </div>

      <p className="text-xs text-[var(--muted)] text-center">
        These are rough estimates only. Actual borrowing capacity depends on lender policy, credit history, and full financial assessment. Consult a mortgage broker for accurate figures.
      </p>
    </div>
  );
}

// NT Stamp Duty Calculator (simplified)
function calculateNTStampDuty(price: number): number {
  if (price <= 525000) {
    // Simplified: ~4.95% for properties under $525k
    return price * 0.0495;
  } else if (price <= 3000000) {
    return price * 0.0495 + (price - 525000) * 0.005;
  }
  return price * 0.0595;
}

function InputRow({ label, value, onChange, prefix, suffix, step }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-[var(--muted)] shrink-0">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-[var(--muted)]">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1.5 text-sm text-right w-32 focus:border-[var(--accent)] outline-none"
        />
        {suffix && <span className="text-sm text-[var(--muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, positive, muted }: {
  label: string; value: string; positive?: boolean; muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-sm ${muted ? "text-[var(--muted)] text-xs" : "text-[var(--muted)]"}`}>{label}</span>
      <span className={`text-sm font-medium ${positive ? "text-[var(--positive)]" : muted ? "text-[var(--muted)] text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Card({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="text-[var(--muted)] text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${positive ? "text-[var(--positive)]" : ""}`}>{value}</div>
    </div>
  );
}
