"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/data";
import { useProperties, useLoans, useIncomes, useBorrowingSettings } from "@/lib/useData";
import ShareButton from "@/components/ShareButton";

export default function Dashboard() {
  const { properties, loaded: pLoaded } = useProperties();
  const { loans, loaded: lLoaded } = useLoans();
  const { incomes, loaded: iLoaded } = useIncomes();
  const { settings: borrowingSettings, loaded: bLoaded } = useBorrowingSettings({
    stuartGross: incomes[0]?.annualGross ?? 0,
    sasitronGross: incomes[1]?.annualGross ?? 0,
    rentalIncome60: (properties[0]?.weeklyRent ?? 0) * 52,
    rentalIncome72: (properties[1]?.weeklyRent ?? 0) * 52,
    monthlyExpenses: 0, existingDebt: 0,
    landPrice: 250000, buildCost: 350000, depositPercent: 20,
    newLoanRate: 6.5, newLoanTerm: 30, expectedRent: 600,
    useEquity: true, claimBuildBonus: true,
  });
  const router = useRouter();
  const [docStats, setDocStats] = useState({ total: 0, have: 0, loaded: false });

  // Redirect to setup wizard if user has no income data (new user OR they deleted everything)
  useEffect(() => {
    if (iLoaded && incomes.length === 0) {
      router.replace("/setup");
    }
  }, [iLoaded, incomes.length, router]);

  useEffect(() => {
    fetch("/api/documents").then(r => r.json()).then(docs => {
      if (Array.isArray(docs) && docs.length > 0) {
        setDocStats({ total: docs.length, have: docs.filter((d: { status: string }) => d.status === "have").length, loaded: true });
      } else {
        setDocStats({ total: 40, have: 0, loaded: true });
      }
    }).catch(() => setDocStats({ total: 40, have: 0, loaded: true }));
  }, []);

  if (!pLoaded || !lLoaded || !iLoaded || !bLoaded) {
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

  // --- Next Property Progress ---
  const bs = borrowingSettings;
  const targetPropertyCost = bs.landPrice + bs.buildCost;
  const targetDeposit = targetPropertyCost * (bs.depositPercent / 100);
  const targetStampDuty = bs.landPrice * 0.0495;
  const targetBuildBonus = bs.claimBuildBonus ? 30000 : 0;
  const targetCashNeeded = targetDeposit + targetStampDuty - targetBuildBonus;
  const targetLoan = targetPropertyCost - targetDeposit;

  // Borrowing capacity check
  const rentalShading = 0.80;
  const assessedIncome = bs.stuartGross + bs.sasitronGross + (bs.rentalIncome60 + bs.rentalIncome72) * rentalShading;
  const maxBorrowing = Math.max(0, (assessedIncome * 0.35 - bs.existingDebt) / 12) *
    ((1 - Math.pow(1 + ((Math.max(...loans.map(l => l.interestRate)) + 3) / 100 / 12), -(bs.newLoanTerm * 12))) /
    ((Math.max(...loans.map(l => l.interestRate)) + 3) / 100 / 12));
  const dtiCapacity = (bs.stuartGross + bs.sasitronGross) * 6 - totalMortgage;
  const canBorrow = targetLoan <= maxBorrowing && targetLoan <= dtiCapacity;

  // Progress milestones
  const depositProgress = Math.min(100, (usableEquity + totalOffsetBalance) / targetCashNeeded * 100);
  const borrowingProgress = canBorrow ? 100 : Math.min(99, Math.max(0, (maxBorrowing / targetLoan) * 100));
  const docProgress = docStats.total > 0 ? (docStats.have / docStats.total) * 100 : 0;
  const offsetProgress = loans[1] ? Math.min(100, (loans[1].offsetBalance / loans[1].balance) * 100) : 0;

  // Overall progress — weighted average
  const overallProgress = Math.round(
    depositProgress * 0.35 +
    borrowingProgress * 0.30 +
    docProgress * 0.20 +
    offsetProgress * 0.15
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
          <p className="text-[var(--muted)]">
            {incomes.length > 0
              ? `${incomes.map(i => i.person?.split(" ")[0]).filter(Boolean).join(" & ")} — Portfolio Overview`
              : "Portfolio Overview"}
          </p>
        </div>
        <ShareButton />
      </div>

      {/* Next Property Progress Tracker */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold">Next Property</h3>
            <p className="text-xs text-[var(--muted)]">
              {formatCurrency(targetPropertyCost)} new build — {formatCurrency(bs.landPrice)} land + {formatCurrency(bs.buildCost)} build
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${overallProgress >= 80 ? "text-[var(--positive)]" : overallProgress >= 50 ? "text-yellow-400" : "text-[var(--accent)]"}`}>
              {overallProgress}%
            </div>
            <div className="text-xs text-[var(--muted)]">ready to buy</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full h-3 bg-[var(--card-border)] rounded-full overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallProgress >= 80 ? "bg-[var(--positive)]" : overallProgress >= 50 ? "bg-yellow-400" : "bg-[var(--accent)]"
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Milestone breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgressMilestone
            label="Deposit"
            progress={depositProgress}
            detail={`${formatCurrency(usableEquity + totalOffsetBalance)} of ${formatCurrency(targetCashNeeded)}`}
            complete={depositProgress >= 100}
          />
          <ProgressMilestone
            label="Borrowing"
            progress={borrowingProgress}
            detail={canBorrow ? "Within capacity" : `Need ${formatCurrency(targetLoan)}`}
            complete={canBorrow}
          />
          <ProgressMilestone
            label="Documents"
            progress={docProgress}
            detail={`${docStats.have}/${docStats.total} ready`}
            complete={docProgress >= 100}
            href="/documents"
          />
          <ProgressMilestone
            label="Offset"
            progress={offsetProgress}
            detail={`${offsetProgress.toFixed(0)}% of ${properties[1]?.address || "Property 2"}`}
            complete={offsetProgress >= 100}
          />
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center justify-between">
          <Link href="/borrowing" className="text-xs text-[var(--accent)] hover:underline">
            Adjust scenario in Borrowing Planner
          </Link>
          <Link href="/strategy" className="text-xs text-[var(--accent)] hover:underline">
            View full strategy
          </Link>
        </div>
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
              {equityPerProperty.slice(0, 2).map((e, i) => (
                <div key={i} className="flex justify-between"><span className="text-[var(--muted)]">Release from {e.address}</span><span>{formatCurrency(Math.min(e.usable, 100000))}</span></div>
              ))}
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
            <div>- Keep offset funds high (reduces interest on investment loans)</div>
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
            Every dollar into offset/redraw saves interest. Once a property&apos;s loan is 100% offset, all income shifts to the next property&apos;s offset.
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
                {incomes.map((inc, i) => (
                  <div key={i} className="flex justify-between"><span className="text-[var(--muted)]">{inc.person?.split(" ")[0] || `Person ${i+1}`} net pay</span><span>{formatCurrency(inc.netFortnightly * 26)}/yr</span></div>
                ))}
                {properties.filter(p => p.weeklyRent > 0).map((prop, i) => (
                  <div key={i} className="flex justify-between"><span className="text-[var(--muted)]">{prop.address} rent</span><span>{formatCurrency(prop.weeklyRent * 52)}/yr</span></div>
                ))}
                <div className="flex justify-between font-semibold border-t border-[var(--card-border)] pt-1">
                  <span>Total income</span><span className="text-[var(--positive)]">{formatCurrency(totalAnnualNetIncome + annualRentalIncome)}/yr</span>
                </div>
              </div>
              <div className="space-y-1">
                {loans.map((loan, i) => {
                  const prop = properties.find(p => p.id === loan.propertyId);
                  return (
                    <div key={i} className="flex justify-between"><span className="text-[var(--muted)]">{prop?.address || `Loan ${i+1}`} repayment</span><span>-{formatCurrency(loan.repaymentAmount * (loan.repaymentFrequency === "fortnightly" ? 26 : 12))}/yr</span></div>
                  );
                })}
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

function ProgressMilestone({ label, progress, detail, complete, href }: {
  label: string; progress: number; detail: string; complete: boolean; href?: string;
}) {
  const content = (
    <div className={`rounded-lg border p-3 ${complete ? "border-[var(--positive)]/30 bg-[var(--positive)]/5" : "border-[var(--card-border)]"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{label}</span>
        <span className={`text-xs font-bold ${complete ? "text-[var(--positive)]" : ""}`}>
          {complete ? "Ready" : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="w-full h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-[var(--positive)]" : "bg-[var(--accent)]"}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <p className="text-[10px] text-[var(--muted)]">{detail}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

