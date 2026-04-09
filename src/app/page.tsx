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

  // Equity release — how much you can pull from each property (80% LVR)
  const equityPerProperty = properties.map((p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    const bal = loan?.balance ?? 0;
    const maxLoan = p.currentValue * 0.8;
    return { address: p.address, owner: p.owner, value: p.currentValue, loan: bal, usable: Math.max(0, maxLoan - bal) };
  });
  const usableEquity = equityPerProperty.reduce((s, e) => s + e.usable, 0);
  const totalAvailableFunds = usableEquity + totalOffsetBalance;

  // Your strategy: release equity as deposit, borrow the rest
  // If you release $100K each = $200K deposit, what property can you target?
  const equityRelease = Math.min(usableEquity, 200000); // $100K each as you described
  const depositFromOffset = 0; // keeping offset for interest savings
  const totalDeposit = equityRelease;
  // At 20% deposit, max property = deposit / 0.2 = deposit * 5
  // At 25% deposit, max property = deposit / 0.25 = deposit * 4
  const maxPropertyAt20 = totalDeposit / 0.20;
  const maxPropertyAt25 = totalDeposit / 0.25;
  const newLoanAt20 = maxPropertyAt20 * 0.80;
  const newLoanAt25 = maxPropertyAt25 * 0.75;

  // What does the repayment look like?
  const estRate = 6.5;
  const monthlyRate = estRate / 100 / 12;
  const numPayments = 30 * 12;
  const repaymentAt20 = newLoanAt20 > 0
    ? (newLoanAt20 * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;
  const estNewRentWeekly = 1050; // 3 rooms x $350/wk
  const estAnnualRent = estNewRentWeekly * 52;
  const cashFlowAt20 = estAnnualRent - (repaymentAt20 * 12);

  // DTI check (total debt including new loan)
  const totalDebtAfterPurchase = totalMortgage + equityRelease + newLoanAt20;
  const dtiAfterPurchase = totalDebtAfterPurchase / totalAnnualGrossIncome;

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

      {/* Equity Release & Next Property */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Next Property — Equity Release Strategy</h3>
          <Link href="/borrowing" className="text-sm text-[var(--accent)] hover:underline">
            Full calculator
          </Link>
        </div>

        {/* How equity release works */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 mb-4">
          <div className="text-sm font-medium mb-3">Your Available Equity</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)]">
                  <th className="pb-2 font-medium">Property</th>
                  <th className="pb-2 font-medium text-right">Value</th>
                  <th className="pb-2 font-medium text-right">Current Loan</th>
                  <th className="pb-2 font-medium text-right">80% of Value</th>
                  <th className="pb-2 font-medium text-right">You Can Release</th>
                </tr>
              </thead>
              <tbody>
                {equityPerProperty.map((e) => (
                  <tr key={e.address} className="border-t border-[var(--card-border)]">
                    <td className="py-2"><div className="font-medium">{e.address}</div><div className="text-xs text-[var(--muted)]">{e.owner}</div></td>
                    <td className="py-2 text-right">{formatCurrency(e.value)}</td>
                    <td className="py-2 text-right">{formatCurrency(e.loan)}</td>
                    <td className="py-2 text-right">{formatCurrency(e.value * 0.8)}</td>
                    <td className="py-2 text-right text-[var(--positive)] font-semibold">{formatCurrency(e.usable)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[var(--card-border)] font-semibold">
                  <td className="py-2">Total Available</td>
                  <td className="py-2 text-right">{formatCurrency(totalValue)}</td>
                  <td className="py-2 text-right">{formatCurrency(totalMortgage)}</td>
                  <td className="py-2 text-right">{formatCurrency(totalValue * 0.8)}</td>
                  <td className="py-2 text-right text-[var(--positive)]">{formatCurrency(usableEquity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)] mt-2">
            Plus {formatCurrency(totalOffsetBalance)} in offset = {formatCurrency(totalAvailableFunds)} total available funds
          </p>
        </div>

        {/* The scenario */}
        <div className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5 mb-4">
          <div className="text-sm font-medium mb-3">Example: Release $100K Each → Buy a $1M New Build (rent 3 rooms @ $350/wk)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Step 1: Get Deposit</div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Release from 60 Bagshaw</span><span>{formatCurrency(Math.min(equityPerProperty[0]?.usable ?? 0, 100000))}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Release from 72 Bagshaw</span><span>{formatCurrency(Math.min(equityPerProperty[1]?.usable ?? 0, 100000))}</span></div>
              <div className="flex justify-between font-semibold border-t border-[var(--positive)]/20 pt-1"><span>Total Deposit</span><span className="text-[var(--positive)]">{formatCurrency(equityRelease)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">NT BuildBonus</span><span className="text-[var(--positive)]">+{formatCurrency(30000)}</span></div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Step 2: Buy Property</div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Max price (20% deposit)</span><span className="font-semibold text-[var(--positive)]">{formatCurrency(maxPropertyAt20)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Max price (25% deposit)</span><span>{formatCurrency(maxPropertyAt25)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">New loan (at 20%)</span><span>{formatCurrency(newLoanAt20)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Monthly repayment</span><span>{formatCurrency(repaymentAt20)}/mo</span></div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Step 3: Cash Flow</div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Expected rent</span><span className="text-[var(--positive)]">{formatCurrency(estNewRentWeekly)}/wk</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Annual rent</span><span className="text-[var(--positive)]">{formatCurrency(estAnnualRent)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Annual repayment</span><span>{formatCurrency(repaymentAt20 * 12)}</span></div>
              <div className="flex justify-between font-semibold border-t border-[var(--positive)]/20 pt-1">
                <span>Cash flow</span>
                <span className={cashFlowAt20 >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                  {cashFlowAt20 >= 0 ? "+" : ""}{formatCurrency(cashFlowAt20)}/yr
                </span>
              </div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">DTI after purchase</span>
                <span className={dtiAfterPurchase > 6 ? "text-[var(--negative)] font-semibold" : ""}>{dtiAfterPurchase.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Your Deposit Power" value={formatCurrency(usableEquity)} positive subtext="equity release" />
          <SummaryCard label="Max Property (20% dep)" value={formatCurrency(maxPropertyAt20)} positive />
          <SummaryCard label="Max Property (25% dep)" value={formatCurrency(maxPropertyAt25)} />
          <SummaryCard label="Offset (keep for savings)" value={formatCurrency(totalOffsetBalance)} positive />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="text-xs font-medium text-[var(--muted)] mb-2">Tips to strengthen your position:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-[var(--muted)]">
            <div>- Keep offset funds high (reduces interest on 72 Bagshaw)</div>
            <div>- Get formal property valuations (may be higher than estimates)</div>
            <div>- Close any unused credit cards before applying</div>
            <div>- Consider interest-only on investment loans (frees cash flow)</div>
            <div>- Use a mortgage broker (access to more lenders)</div>
            <div>- Gather all documents early (see Documents page)</div>
            <div>- New builds get $30K grant + full depreciation benefits</div>
            <div>- Stamp duty on land only for new builds in NT</div>
          </div>
        </div>
      </div>

      {/* Offset Strategy Tracker */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Offset & Debt Reduction Strategy</h3>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)] mb-4">
            Every dollar into offset/redraw saves interest. Once Sasitron&apos;s loan is 100% offset, all income shifts to the next property&apos;s offset.
          </p>

          {/* Progress bars for each property */}
          {properties.map((p) => {
            const loan = loans.find((l) => l.propertyId === p.id);
            if (!loan) return null;
            const bal = loan.balance;
            const offsetOrRedraw = loan.offsetBalance > 0 ? loan.offsetBalance : loan.availableRedraw;
            const offsetPct = Math.min(100, (offsetOrRedraw / bal) * 100);
            const interestPaidOn = Math.max(0, bal - offsetOrRedraw);
            const annualInterestSaved = offsetOrRedraw * (loan.interestRate / 100);
            const annualInterestPaying = interestPaidOn * (loan.interestRate / 100);
            const label = loan.offsetBalance > 0 ? "Offset" : "Redraw";
            const isComplete = offsetPct >= 100;

            return (
              <div key={p.id} className="mb-5 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium">{p.address}</span>
                    <span className="text-xs text-[var(--muted)] ml-2">({p.owner})</span>
                  </div>
                  <span className={`text-sm font-bold ${isComplete ? "text-[var(--positive)]" : ""}`}>
                    {offsetPct.toFixed(0)}% {label}
                  </span>
                </div>
                <div className="w-full bg-[var(--card-border)] rounded-full h-4 mb-2">
                  <div
                    className={`h-4 rounded-full transition-all ${isComplete ? "bg-[var(--positive)]" : "bg-[var(--accent)]"}`}
                    style={{ width: `${Math.min(100, offsetPct)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--muted)]">Loan: </span>
                    <span>{formatCurrency(bal)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">{label}: </span>
                    <span className="text-[var(--positive)]">{formatCurrency(offsetOrRedraw)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Paying interest on: </span>
                    <span>{formatCurrency(interestPaidOn)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Interest saved: </span>
                    <span className="text-[var(--positive)]">{formatCurrency(annualInterestSaved)}/yr</span>
                  </div>
                </div>
                {!isComplete && (
                  <div className="text-xs text-[var(--muted)] mt-1">
                    Still paying {formatCurrency(annualInterestPaying)}/yr interest — need {formatCurrency(bal - offsetOrRedraw)} more in {label.toLowerCase()} to reach 100%
                  </div>
                )}
                {isComplete && (
                  <div className="text-xs text-[var(--positive)] mt-1 font-medium">
                    100% offset — effectively paying $0 interest on this loan
                  </div>
                )}
              </div>
            );
          })}

          {/* Combined monthly income available to offset */}
          <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
            <div className="text-sm font-medium mb-2">Cash Flow Into Offset</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-[var(--muted)]">Stuart net pay</span><span>{formatCurrency(incomes[0]?.netFortnightly * 26)}/yr</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Sasitron net pay</span><span>{formatCurrency(incomes[1]?.netFortnightly * 26)}/yr</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">60 Bagshaw rent</span><span>{formatCurrency(properties[0]?.weeklyRent * 52)}/yr</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">72 Bagshaw rent</span><span>{formatCurrency(properties[1]?.weeklyRent * 52)}/yr</span></div>
                <div className="flex justify-between font-semibold border-t border-[var(--card-border)] pt-1">
                  <span>Total income</span><span className="text-[var(--positive)]">{formatCurrency(totalAnnualNetIncome + annualRentalIncome)}/yr</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-[var(--muted)]">60 Bagshaw repayment</span><span>-{formatCurrency(loans[0]?.repaymentAmount * (loans[0]?.repaymentFrequency === "fortnightly" ? 26 : 12))}/yr</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">72 Bagshaw repayment</span><span>-{formatCurrency(loans[1]?.repaymentAmount * (loans[1]?.repaymentFrequency === "fortnightly" ? 26 : 12))}/yr</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Est. living expenses</span><span>-{formatCurrency(60000)}/yr</span></div>
                <div className="flex justify-between font-semibold border-t border-[var(--card-border)] pt-1">
                  <span>Surplus to offset</span>
                  <span className="text-[var(--positive)]">
                    ~{formatCurrency(
                      totalAnnualNetIncome + annualRentalIncome
                      - loans.reduce((s, l) => s + l.repaymentAmount * (l.repaymentFrequency === "fortnightly" ? 26 : 12), 0)
                      - 60000
                    )}/yr
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] mt-3">
              At this rate, every {formatCurrency(
                (totalAnnualNetIncome + annualRentalIncome
                - loans.reduce((s, l) => s + l.repaymentAmount * (l.repaymentFrequency === "fortnightly" ? 26 : 12), 0)
                - 60000) / 12
              )}/month goes straight into building your offset position.
              Once a property hits 100% offset, that interest saving accelerates the next property even faster.
            </p>
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

      <MigrateButton />
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

function MigrateButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<string>("");

  async function handleMigrate() {
    setStatus("loading");
    try {
      const res = await fetch("/api/migrate", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatus("done");
        setResult(JSON.stringify(data.migrated, null, 2));
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
          <div className="text-sm font-medium">Claim Existing Data</div>
          <div className="text-xs text-[var(--muted)]">Link pre-existing data to your account (run once after first login)</div>
        </div>
        <button
          onClick={handleMigrate}
          disabled={status === "loading" || status === "done"}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            status === "done"
              ? "bg-[var(--positive)]/20 text-[var(--positive)] border border-[var(--positive)]/30"
              : status === "error"
              ? "bg-[var(--negative)]/20 text-[var(--negative)] border border-[var(--negative)]/30"
              : "bg-[#22c55e] text-white hover:bg-green-600"
          }`}
        >
          {status === "loading" ? "Migrating..." : status === "done" ? "Done" : status === "error" ? "Failed" : "Migrate Data"}
        </button>
      </div>
      {result && (
        <pre className="mt-3 text-xs text-[var(--muted)] bg-[var(--background)] rounded p-2 overflow-x-auto">{result}</pre>
      )}
    </div>
  );
}
