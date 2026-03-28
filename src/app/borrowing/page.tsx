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

  // New Build Scenario
  const [landPrice, setLandPrice] = useState(250000);
  const [buildCost, setBuildCost] = useState(350000);
  const [depositPercent, setDepositPercent] = useState(20);
  const [newLoanRate, setNewLoanRate] = useState(6.5);
  const [newLoanTerm, setNewLoanTerm] = useState(30);
  const [expectedRent, setExpectedRent] = useState(600);
  const [useEquity, setUseEquity] = useState(true);
  const [claimBuildBonus, setClaimBuildBonus] = useState(true);

  // Bank assessment rate (typically 3% buffer)
  const assessmentBuffer = 3.0;

  // Gross rental income — banks typically shade rental at 80%
  const rentalShading = 0.80;
  const totalGrossIncome = stuartGross + sasitronGross;
  const totalRentalIncome = (rentalIncome60 + rentalIncome72) * rentalShading;
  const totalAssessedIncome = totalGrossIncome + totalRentalIncome;

  // Annual expenses & debt
  const annualExpenses = monthlyExpenses * 12;
  const annualExistingDebt = existingDebt;
  const netSurplus = totalAssessedIncome - annualExpenses - annualExistingDebt;

  // Max borrowing (simplified DSR method)
  const dsrLimit = 0.35;
  const maxAnnualRepayment = totalAssessedIncome * dsrLimit - annualExistingDebt;
  const assessmentRate = (Math.max(...loans.map((l) => l.interestRate)) + assessmentBuffer) / 100;
  const maxMonthlyRepayment = maxAnnualRepayment / 12;
  const monthlyRate = assessmentRate / 12;
  const numPayments = newLoanTerm * 12;
  const maxLoanAmount =
    maxMonthlyRepayment > 0
      ? maxMonthlyRepayment * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate)
      : 0;

  // DTI check
  const totalExistingDebt = loans.reduce((s, l) => s + l.balance, 0);
  const dtiLimit = 6;
  const maxDebtByDTI = totalGrossIncome * dtiLimit;
  const remainingDTI = maxDebtByDTI - totalExistingDebt;

  // New Build calculations
  const totalPropertyCost = landPrice + buildCost;
  const ntBuildBonus = claimBuildBonus ? 30000 : 0;
  // Stamp duty on LAND ONLY for new builds in NT
  const stampDutyOnLand = calculateNTStampDuty(landPrice);
  const depositAmount = totalPropertyCost * (depositPercent / 100);
  const newLoanAmount = totalPropertyCost - depositAmount;
  const totalCashNeeded = depositAmount + stampDutyOnLand - ntBuildBonus;

  // Equity available
  const usableEquity = properties.reduce((sum, p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    const available = p.currentValue * 0.8 - (loan?.balance ?? 0);
    return sum + Math.max(0, available);
  }, 0);
  const offsetCash = loans.reduce((s, l) => s + l.offsetBalance, 0);
  const totalAvailableFunds = (useEquity ? usableEquity : 0) + offsetCash;
  const fundingGap = totalCashNeeded - totalAvailableFunds;

  // Repayment calcs
  const newMonthlyRate = newLoanRate / 100 / 12;
  const newMonthlyRepayment =
    newLoanAmount > 0 && newMonthlyRate > 0
      ? (newLoanAmount * newMonthlyRate * Math.pow(1 + newMonthlyRate, numPayments)) /
        (Math.pow(1 + newMonthlyRate, numPayments) - 1)
      : 0;
  const newAnnualRepayment = newMonthlyRepayment * 12;
  const newAnnualRent = expectedRent * 52;
  const newCashFlow = newAnnualRent - newAnnualRepayment;
  const newGrossYield = totalPropertyCost > 0 ? (newAnnualRent / totalPropertyCost) * 100 : 0;
  const newLVR = totalPropertyCost > 0 ? (newLoanAmount / totalPropertyCost) * 100 : 0;
  const needsLMI = newLVR > 80;
  const canAfford = newLoanAmount <= maxLoanAmount && newLoanAmount <= remainingDTI;

  // Depreciation estimate (new build)
  const annualBuildDeprn = buildCost * 0.025; // Div 43
  const estimatedPlantDeprn = buildCost * 0.03; // Div 40 estimate
  const marginalTaxRate = 0.37; // estimated bracket
  const depreciationTaxSaving = (annualBuildDeprn + estimatedPlantDeprn) * marginalTaxRate;

  // Negative gearing
  const annualInterest = newLoanAmount * (newLoanRate / 100);
  const estimatedExpenses = annualInterest + 3000 + 2000 + 1500; // interest + rates + insurance + maintenance
  const netRentalResult = newAnnualRent - estimatedExpenses;
  const negGearingTaxSaving = netRentalResult < 0 ? Math.abs(netRentalResult) * marginalTaxRate : 0;
  const totalTaxBenefits = depreciationTaxSaving + negGearingTaxSaving;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Borrowing & New Build Planner</h2>
        <p className="text-[var(--muted)]">Plan your next new build using equity, the NT BuildBonus, and tax benefits</p>
      </div>

      {/* Current Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card label="Max Borrowing (DSR)" value={formatCurrency(Math.max(0, maxLoanAmount))} positive />
        <Card label="Max Borrowing (DTI 6x)" value={formatCurrency(Math.max(0, remainingDTI))} positive />
        <Card label="Usable Equity (80%)" value={formatCurrency(usableEquity)} positive />
        <Card label="Offset Cash" value={formatCurrency(offsetCash)} positive />
        <Card label="Total Available" value={formatCurrency(usableEquity + offsetCash)} positive />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income & Expenses */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="font-semibold mb-4">Your Financials</h3>
          <p className="text-xs text-[var(--muted)] mb-4">Adjust these to see how they affect borrowing capacity</p>
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
              <InfoRow label="DTI Ratio" value={`${(totalExistingDebt / totalGrossIncome).toFixed(1)}x (limit ~${dtiLimit}x)`} />
              <InfoRow label="Net Annual Surplus" value={formatCurrency(netSurplus)} positive={netSurplus > 0} />
            </div>
          </div>
        </div>

        {/* New Build Scenario */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="font-semibold mb-2">New Build Scenario</h3>
          <p className="text-xs text-[var(--muted)] mb-4">Land + build package — stamp duty on land only</p>
          <div className="space-y-3">
            <InputRow label="Land Price" value={landPrice} onChange={setLandPrice} prefix="$" />
            <InputRow label="Build Cost" value={buildCost} onChange={setBuildCost} prefix="$" />
            <InputRow label="Deposit" value={depositPercent} onChange={setDepositPercent} suffix="%" />
            <InputRow label="Interest Rate" value={newLoanRate} onChange={setNewLoanRate} suffix="%" step={0.05} />
            <InputRow label="Loan Term" value={newLoanTerm} onChange={setNewLoanTerm} suffix="years" />
            <InputRow label="Expected Weekly Rent" value={expectedRent} onChange={setExpectedRent} prefix="$" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Use equity for deposit</span>
              <button onClick={() => setUseEquity(!useEquity)}
                className={`px-3 py-1 rounded text-xs font-medium ${useEquity ? "bg-[var(--positive)]/20 text-[var(--positive)]" : "bg-[var(--card-border)] text-[var(--muted)]"}`}>
                {useEquity ? "Yes" : "No"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Claim NT BuildBonus $30K</span>
              <button onClick={() => setClaimBuildBonus(!claimBuildBonus)}
                className={`px-3 py-1 rounded text-xs font-medium ${claimBuildBonus ? "bg-[var(--positive)]/20 text-[var(--positive)]" : "bg-[var(--card-border)] text-[var(--muted)]"}`}>
                {claimBuildBonus ? "Yes" : "No"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h3 className="font-semibold mb-4">New Build Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Costs</h4>
            <InfoRow label="Land" value={formatCurrency(landPrice)} />
            <InfoRow label="Build" value={formatCurrency(buildCost)} />
            <InfoRow label="Total Property Cost" value={formatCurrency(totalPropertyCost)} />
            <InfoRow label="Stamp Duty (land only)" value={formatCurrency(stampDutyOnLand)} />
            {claimBuildBonus && <InfoRow label="NT BuildBonus Grant" value={`-${formatCurrency(ntBuildBonus)}`} positive />}
            <div className="border-t border-[var(--card-border)] pt-2">
              <InfoRow label="Deposit ({depositPercent}%)" value={formatCurrency(depositAmount)} />
              <InfoRow label="Loan Amount" value={formatCurrency(newLoanAmount)} />
              <InfoRow label="LVR" value={`${newLVR.toFixed(1)}%`} />
              {needsLMI && (
                <div className="text-xs text-[var(--negative)] bg-[var(--negative)]/10 rounded px-2 py-1 mt-1">
                  LVR over 80% — LMI will apply
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Funding</h4>
            <InfoRow label="Cash Required" value={formatCurrency(Math.max(0, totalCashNeeded))} />
            {useEquity && <InfoRow label="Available Equity" value={formatCurrency(usableEquity)} positive />}
            <InfoRow label="Offset Cash" value={formatCurrency(offsetCash)} positive />
            <InfoRow label="Total Available" value={formatCurrency(totalAvailableFunds)} positive />
            <div className="border-t border-[var(--card-border)] pt-2">
              {fundingGap <= 0 ? (
                <div className="p-2 rounded text-xs text-center bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/30">
                  Fully funded — {formatCurrency(Math.abs(fundingGap))} surplus
                </div>
              ) : (
                <div className="p-2 rounded text-xs text-center bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/30">
                  Shortfall of {formatCurrency(fundingGap)}
                </div>
              )}
            </div>
            <div className="border-t border-[var(--card-border)] pt-2">
              <div className={`p-2 rounded text-xs text-center ${
                canAfford
                  ? "bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/30"
                  : "bg-[var(--negative)]/10 text-[var(--negative)] border border-[var(--negative)]/30"
              }`}>
                {canAfford ? "Within borrowing capacity" : "Exceeds borrowing capacity"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Cash Flow & Tax</h4>
            <InfoRow label="Monthly Repayment" value={formatCurrencyExact(newMonthlyRepayment)} />
            <InfoRow label="Annual Repayment" value={formatCurrency(newAnnualRepayment)} />
            <InfoRow label="Annual Rent" value={formatCurrency(newAnnualRent)} positive />
            <InfoRow label="Gross Yield" value={`${newGrossYield.toFixed(2)}%`} />
            <InfoRow label="Cash Flow (before tax)" value={`${newCashFlow >= 0 ? "+" : ""}${formatCurrency(newCashFlow)}/yr`}
              positive={newCashFlow >= 0} />
            <div className="border-t border-[var(--card-border)] pt-2">
              <InfoRow label="Depreciation Saving" value={`${formatCurrency(depreciationTaxSaving)}/yr`} positive />
              {negGearingTaxSaving > 0 && (
                <InfoRow label="Neg. Gearing Saving" value={`${formatCurrency(negGearingTaxSaving)}/yr`} positive />
              )}
              <InfoRow label="Total Tax Benefits" value={`${formatCurrency(totalTaxBenefits)}/yr`} positive />
              <InfoRow label="After-Tax Cash Flow" value={`${formatCurrency(newCashFlow + totalTaxBenefits)}/yr`}
                positive={newCashFlow + totalTaxBenefits >= 0} />
              <InfoRow label="Weekly Out-of-Pocket" value={
                newCashFlow + totalTaxBenefits >= 0
                  ? `+${formatCurrency((newCashFlow + totalTaxBenefits) / 52)}/wk`
                  : `${formatCurrency((newCashFlow + totalTaxBenefits) / 52)}/wk`
              } positive={newCashFlow + totalTaxBenefits >= 0} />
            </div>
          </div>
        </div>
      </div>

      {/* Equity Breakdown */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h3 className="font-semibold mb-4">Equity Breakdown — How Equity Release Works</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Banks will lend up to 80% of your property&apos;s value. The gap between 80% and your current loan is equity you can access
          as a deposit for a new property — without selling.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="pb-2 font-medium">Property</th>
                <th className="pb-2 font-medium text-right">Value</th>
                <th className="pb-2 font-medium text-right">Loan</th>
                <th className="pb-2 font-medium text-right">Total Equity</th>
                <th className="pb-2 font-medium text-right">80% of Value</th>
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
                    <td className="py-2">
                      <div>{p.address}</div>
                      <div className="text-xs text-[var(--muted)]">{p.owner}</div>
                    </td>
                    <td className="py-2 text-right">{formatCurrency(p.currentValue)}</td>
                    <td className="py-2 text-right">{formatCurrency(bal)}</td>
                    <td className="py-2 text-right text-[var(--positive)]">{formatCurrency(eq)}</td>
                    <td className="py-2 text-right">{formatCurrency(eighty)}</td>
                    <td className="py-2 text-right text-[var(--positive)] font-semibold">{formatCurrency(usable)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[var(--card-border)] font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{formatCurrency(properties.reduce((s, p) => s + p.currentValue, 0))}</td>
                <td className="py-2 text-right">{formatCurrency(loans.reduce((s, l) => s + l.balance, 0))}</td>
                <td className="py-2 text-right text-[var(--positive)]">
                  {formatCurrency(properties.reduce((s, p) => s + p.currentValue, 0) - loans.reduce((s, l) => s + l.balance, 0))}
                </td>
                <td className="py-2 text-right">{formatCurrency(properties.reduce((s, p) => s + p.currentValue * 0.8, 0))}</td>
                <td className="py-2 text-right text-[var(--positive)]">{formatCurrency(usableEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 rounded bg-[var(--accent)]/5 border border-[var(--accent)]/30 text-sm text-[var(--muted)]">
          <strong className="text-[var(--accent)]">Your strategy:</strong> Release {formatCurrency(usableEquity)} in usable equity + {formatCurrency(offsetCash)} offset cash
          = {formatCurrency(usableEquity + offsetCash)} available for your next property deposit without selling anything.
        </div>
      </div>

      <p className="text-xs text-[var(--muted)] text-center">
        These are rough estimates only. Actual borrowing capacity depends on lender policy, credit history, and full financial assessment. Consult a mortgage broker for accurate figures.
      </p>
    </div>
  );
}

function calculateNTStampDuty(landPrice: number): number {
  // NT stamp duty on land only for new builds
  if (landPrice <= 525000) return landPrice * 0.0495;
  if (landPrice <= 3000000) return 525000 * 0.0495 + (landPrice - 525000) * 0.055;
  return landPrice * 0.0595;
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
        <input type="number" value={value} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1.5 text-sm text-right w-32 focus:border-[var(--accent)] outline-none" />
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
