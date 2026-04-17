"use client";

import { formatCurrency } from "@/lib/data";
import { useProperties, useLoans, useIncomes, useStrategySettings } from "@/lib/useData";

interface PlannedProperty {
  year: number;
  landCost: number;
  buildCost: number;
  expectedRent: number;
  interestRate: number;
  depositPercent: number;
}

const defaultPlan: PlannedProperty[] = [
  { year: 2026, landCost: 250000, buildCost: 350000, expectedRent: 600, interestRate: 6.5, depositPercent: 20 },
  { year: 2027, landCost: 260000, buildCost: 370000, expectedRent: 620, interestRate: 6.5, depositPercent: 20 },
  { year: 2028, landCost: 270000, buildCost: 390000, expectedRent: 640, interestRate: 6.0, depositPercent: 20 },
  { year: 2029, landCost: 280000, buildCost: 400000, expectedRent: 660, interestRate: 6.0, depositPercent: 20 },
  { year: 2030, landCost: 290000, buildCost: 420000, expectedRent: 680, interestRate: 5.5, depositPercent: 20 },
];

export default function StrategyPage() {
  const { properties, loaded: pLoaded } = useProperties();
  const { loans, loaded: lLoaded } = useLoans();
  const { incomes, loaded: iLoaded } = useIncomes();
  const { strategy, update: updateStrategy, loaded: sLoaded } = useStrategySettings({
    plan: defaultPlan,
    growthRate: 4,
    rentGrowth: 3,
  });

  if (!pLoaded || !lLoaded || !iLoaded || !sLoaded) {
    return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;
  }

  if (properties.length === 0 && incomes.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <h2 className="text-2xl font-bold">5-Year Growth Strategy</h2>
        <p className="text-[var(--muted)]">Complete your setup first to see your strategy.</p>
        <a href="/setup" className="inline-block px-6 py-2 bg-[var(--accent)] text-white rounded-lg text-sm">Go to Setup</a>
      </div>
    );
  }

  const { plan, growthRate, rentGrowth } = strategy;

  function updatePlan(index: number, field: keyof PlannedProperty, value: number) {
    const newPlan = plan.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    updateStrategy({ plan: newPlan });
  }

  function addYear() {
    const last = plan[plan.length - 1];
    updateStrategy({ plan: [...plan, {
      year: last.year + 1,
      landCost: last.landCost + 10000,
      buildCost: last.buildCost + 20000,
      expectedRent: last.expectedRent + 20,
      interestRate: last.interestRate,
      depositPercent: 20,
    }] });
  }

  function removeYear(index: number) {
    updateStrategy({ plan: plan.filter((_, i) => i !== index) });
  }

  // Current portfolio baseline — from DB
  const currentValue = properties.reduce((s, p) => s + p.currentValue, 0);
  const currentDebt = loans.reduce((s, l) => s + l.balance, 0);
  const currentEquity = currentValue - currentDebt;
  const currentWeeklyRent = properties.reduce((s, p) => s + p.weeklyRent, 0);
  const combinedGross = incomes.reduce((s, i) => s + i.annualGross, 0);

  // Build 5-year projection
  const projection = [];
  let runningValue = currentValue;
  let runningDebt = currentDebt;
  let runningWeeklyRent = currentWeeklyRent;
  let runningProperties = properties.length;
  let cumulativeDeposits = 0;
  let cumulativeGrants = 0;

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const totalCost = p.landCost + p.buildCost;
    const deposit = totalCost * (p.depositPercent / 100);
    const loanAmount = totalCost - deposit;
    const stampDuty = p.landCost * 0.0495;
    const buildBonus = 30000;
    const cashNeeded = deposit + stampDuty - buildBonus;

    // Apply capital growth to existing portfolio
    runningValue = runningValue * (1 + growthRate / 100) + totalCost;
    runningDebt += loanAmount;
    runningWeeklyRent = runningWeeklyRent * (1 + rentGrowth / 100) + p.expectedRent;
    runningProperties += 1;
    cumulativeDeposits += cashNeeded;
    cumulativeGrants += buildBonus;

    // Monthly repayment for new loan
    const monthlyRate = p.interestRate / 100 / 12;
    const numPayments = 30 * 12;
    const monthlyRepayment = loanAmount > 0 && monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;

    // Depreciation
    const annualDeprn = p.buildCost * 0.025 + p.buildCost * 0.03;
    const deprnTaxSaving = annualDeprn * 0.37;

    // Cash flow
    const annualRent = p.expectedRent * 52;
    const annualRepayment = monthlyRepayment * 12;
    const cashFlowBeforeTax = annualRent - annualRepayment;

    // DTI check
    const dti = runningDebt / combinedGross;

    projection.push({
      year: p.year,
      properties: runningProperties,
      portfolioValue: runningValue,
      totalDebt: runningDebt,
      totalEquity: runningValue - runningDebt,
      weeklyRent: runningWeeklyRent,
      annualRent: runningWeeklyRent * 52,
      newPropertyCost: totalCost,
      newLoan: loanAmount,
      newDeposit: cashNeeded,
      newMonthlyRepayment: monthlyRepayment,
      cashFlowBeforeTax,
      deprnTaxSaving,
      dti,
      grant: buildBonus,
    });
  }

  const finalYear = projection[projection.length - 1];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">5-Year Growth Strategy</h2>
        <p className="text-[var(--muted)]">Plan your portfolio growth — one new build per year using equity and the NT BuildBonus</p>
      </div>

      {/* Target Summary */}
      {finalYear && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label={`Portfolio Value by ${finalYear.year}`} value={formatCurrency(finalYear.portfolioValue)} positive />
          <Card label="Total Equity" value={formatCurrency(finalYear.totalEquity)} positive />
          <Card label="Properties Owned" value={String(finalYear.properties)} />
          <Card label="Weekly Rent (Total)" value={`${formatCurrency(finalYear.weeklyRent)}/wk`} positive />
        </div>
      )}

      {/* Growth Assumptions */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h3 className="font-semibold mb-3">Growth Assumptions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputRow label="Annual Capital Growth" value={growthRate} onChange={(v) => updateStrategy({ growthRate: v })} suffix="%" step={0.5} />
          <InputRow label="Annual Rent Growth" value={rentGrowth} onChange={(v) => updateStrategy({ rentGrowth: v })} suffix="%" step={0.5} />
        </div>
      </div>

      {/* Year-by-Year Plan (editable) */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
          <h3 className="font-semibold">Year-by-Year Build Plan</h3>
          <button onClick={addYear}
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors">
            + Add Year
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] text-[var(--muted)] text-left">
                <th className="px-4 py-2 font-medium">Year</th>
                <th className="px-4 py-2 font-medium text-right">Land</th>
                <th className="px-4 py-2 font-medium text-right">Build</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2 font-medium text-right">Rent/wk</th>
                <th className="px-4 py-2 font-medium text-right">Rate</th>
                <th className="px-4 py-2 font-medium text-right">Deposit %</th>
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {plan.map((p, i) => (
                <tr key={i} className="border-t border-[var(--card-border)]">
                  <td className="px-4 py-2 font-medium">{p.year}</td>
                  <td className="px-4 py-2">
                    <input type="number" value={p.landCost} onChange={(e) => updatePlan(i, "landCost", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs text-right w-24 focus:border-[var(--accent)] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={p.buildCost} onChange={(e) => updatePlan(i, "buildCost", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs text-right w-24 focus:border-[var(--accent)] outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--muted)]">{formatCurrency(p.landCost + p.buildCost)}</td>
                  <td className="px-4 py-2">
                    <input type="number" value={p.expectedRent} onChange={(e) => updatePlan(i, "expectedRent", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs text-right w-20 focus:border-[var(--accent)] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={p.interestRate} step={0.1} onChange={(e) => updatePlan(i, "interestRate", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs text-right w-16 focus:border-[var(--accent)] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={p.depositPercent} onChange={(e) => updatePlan(i, "depositPercent", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs text-right w-16 focus:border-[var(--accent)] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => removeYear(i)} className="text-[var(--muted)] hover:text-[var(--negative)]">x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projection Results */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--card-border)]">
          <h3 className="font-semibold">Portfolio Projection</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--background)] text-[var(--muted)] text-left">
                <th className="px-4 py-2 font-medium">Year</th>
                <th className="px-4 py-2 font-medium text-right">Properties</th>
                <th className="px-4 py-2 font-medium text-right">Portfolio Value</th>
                <th className="px-4 py-2 font-medium text-right">Total Debt</th>
                <th className="px-4 py-2 font-medium text-right">Total Equity</th>
                <th className="px-4 py-2 font-medium text-right">Weekly Rent</th>
                <th className="px-4 py-2 font-medium text-right">DTI</th>
                <th className="px-4 py-2 font-medium text-right">Grant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--card-border)] text-[var(--muted)]">
                <td className="px-4 py-2">Now</td>
                <td className="px-4 py-2 text-right">{properties.length}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentValue)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentDebt)}</td>
                <td className="px-4 py-2 text-right text-[var(--positive)]">{formatCurrency(currentEquity)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(currentWeeklyRent)}</td>
                <td className="px-4 py-2 text-right">{(currentDebt / combinedGross).toFixed(1)}x</td>
                <td className="px-4 py-2 text-right">—</td>
              </tr>
              {projection.map((row, i) => (
                <tr key={i} className={`border-t border-[var(--card-border)] ${row.dti > 6 ? "bg-[var(--negative)]/5" : ""}`}>
                  <td className="px-4 py-2 font-medium">{row.year}</td>
                  <td className="px-4 py-2 text-right">{row.properties}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(row.portfolioValue)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(row.totalDebt)}</td>
                  <td className="px-4 py-2 text-right text-[var(--positive)]">{formatCurrency(row.totalEquity)}</td>
                  <td className="px-4 py-2 text-right text-[var(--positive)]">{formatCurrency(row.weeklyRent)}/wk</td>
                  <td className={`px-4 py-2 text-right ${row.dti > 6 ? "text-[var(--negative)] font-semibold" : ""}`}>
                    {row.dti.toFixed(1)}x
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--positive)]">{formatCurrency(row.grant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--card-border)] text-xs text-[var(--muted)]">
          DTI highlighted red when exceeding 6x — most banks won&apos;t lend beyond this ratio.
          Total grants claimed: {formatCurrency(plan.length * 30000)} over {plan.length} years.
        </div>
      </div>

      {/* Summary */}
      {finalYear && (
        <div className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5">
          <h3 className="font-semibold mb-3">5-Year Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[var(--muted)]">Portfolio Growth</div>
              <div className="font-bold text-[var(--positive)]">
                {formatCurrency(currentValue)} → {formatCurrency(finalYear.portfolioValue)}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Equity Growth</div>
              <div className="font-bold text-[var(--positive)]">
                {formatCurrency(currentEquity)} → {formatCurrency(finalYear.totalEquity)}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Rental Income Growth</div>
              <div className="font-bold text-[var(--positive)]">
                {formatCurrency(currentWeeklyRent)}/wk → {formatCurrency(finalYear.weeklyRent)}/wk
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Total NT Grants</div>
              <div className="font-bold text-[var(--positive)]">{formatCurrency(plan.length * 30000)}</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--muted)] text-center">
        This is a planning tool with simplified assumptions. Actual results depend on market conditions,
        interest rates, lending policy, and property selection. Consult a financial adviser and mortgage broker.
      </p>
    </div>
  );
}

function InputRow({ label, value, onChange, suffix, step }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-[var(--muted)] shrink-0">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" value={value} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1.5 text-sm text-right w-24 focus:border-[var(--accent)] outline-none" />
        {suffix && <span className="text-sm text-[var(--muted)]">{suffix}</span>}
      </div>
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
