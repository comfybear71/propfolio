"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/data";

export default function TaxGuidePage() {
  const [activeSection, setActiveSection] = useState("negative-gearing");
  // Depreciation calculator
  const [buildCost, setBuildCost] = useState(400000);
  const [buildYear, setBuildYear] = useState(2026);
  const [furnishingsCost, setFurnishingsCost] = useState(30000);
  // Negative gearing calculator
  const [weeklyRent, setWeeklyRent] = useState(600);
  const [loanBalance, setLoanBalance] = useState(400000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [councilRates, setCouncilRates] = useState(2500);
  const [insurance, setInsurance] = useState(2000);
  const [propertyMgmt, setPropertyMgmt] = useState(8);
  const [maintenance, setMaintenance] = useState(2000);
  const [marginalTaxRate, setMarginalTaxRate] = useState(37);

  // Depreciation calcs (Div 43 - building at 2.5% over 40 years)
  const annualBuildingDeprn = buildCost * 0.025;
  const yearsRemaining = Math.max(0, 40 - (new Date().getFullYear() - buildYear));
  const totalBuildingDeprn = annualBuildingDeprn * yearsRemaining;
  // Div 40 - plant & equipment (simplified declining value at ~20% avg)
  const year1PlantDeprn = furnishingsCost * 0.20;

  // Negative gearing calcs
  const annualRent = weeklyRent * 52;
  const annualInterest = loanBalance * (interestRate / 100);
  const annualMgmtFees = annualRent * (propertyMgmt / 100);
  const totalExpenses = annualInterest + councilRates + insurance + annualMgmtFees + maintenance;
  const netRentalIncome = annualRent - totalExpenses;
  const isNegativelyGeared = netRentalIncome < 0;
  const taxSaving = isNegativelyGeared ? Math.abs(netRentalIncome) * (marginalTaxRate / 100) : 0;
  const afterTaxCost = isNegativelyGeared ? Math.abs(netRentalIncome) - taxSaving : 0;
  const depreciationTaxSaving = (annualBuildingDeprn + year1PlantDeprn) * (marginalTaxRate / 100);

  const sections = [
    { id: "negative-gearing", label: "Negative Gearing" },
    { id: "depreciation", label: "Depreciation" },
    { id: "cgt", label: "Capital Gains Tax" },
    { id: "stamp-duty", label: "Stamp Duty (NT)" },
    { id: "nt-grants", label: "NT Grants" },
    { id: "lending", label: "Lending Rules" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Australian Property Tax Guide</h2>
        <p className="text-[var(--muted)]">Key rules, deductions, and calculators for property investors</p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              activeSection === s.id
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}>{s.label}</button>
        ))}
      </div>

      {/* Negative Gearing */}
      {activeSection === "negative-gearing" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="font-semibold mb-3">What is Negative Gearing?</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              When your investment property expenses exceed your rental income, the loss can be deducted
              from your other taxable income (wages), reducing your overall tax bill. This is a key strategy
              for Australian property investors.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Scenario Inputs</h4>
                <InputRow label="Weekly Rent" value={weeklyRent} onChange={setWeeklyRent} prefix="$" />
                <InputRow label="Loan Balance" value={loanBalance} onChange={setLoanBalance} prefix="$" />
                <InputRow label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" step={0.1} />
                <InputRow label="Council Rates (annual)" value={councilRates} onChange={setCouncilRates} prefix="$" />
                <InputRow label="Insurance (annual)" value={insurance} onChange={setInsurance} prefix="$" />
                <InputRow label="Property Mgmt Fee" value={propertyMgmt} onChange={setPropertyMgmt} suffix="%" />
                <InputRow label="Maintenance (annual)" value={maintenance} onChange={setMaintenance} prefix="$" />
                <InputRow label="Your Marginal Tax Rate" value={marginalTaxRate} onChange={setMarginalTaxRate} suffix="%" />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Results</h4>
                <InfoRow label="Annual Rental Income" value={formatCurrency(annualRent)} />
                <InfoRow label="Annual Interest" value={`-${formatCurrency(annualInterest)}`} />
                <InfoRow label="Council Rates" value={`-${formatCurrency(councilRates)}`} />
                <InfoRow label="Insurance" value={`-${formatCurrency(insurance)}`} />
                <InfoRow label="Management Fees" value={`-${formatCurrency(annualMgmtFees)}`} />
                <InfoRow label="Maintenance" value={`-${formatCurrency(maintenance)}`} />
                <div className="border-t border-[var(--card-border)] pt-2">
                  <InfoRow label="Total Expenses" value={formatCurrency(totalExpenses)} />
                  <InfoRow label="Net Rental Income" value={formatCurrency(netRentalIncome)}
                    className={isNegativelyGeared ? "text-[var(--negative)]" : "text-[var(--positive)]"} />
                </div>
                {isNegativelyGeared && (
                  <div className="border-t border-[var(--card-border)] pt-2 space-y-2">
                    <InfoRow label="Tax Saving (negative gearing)" value={formatCurrency(taxSaving)} className="text-[var(--positive)]" />
                    <InfoRow label="Depreciation Tax Saving" value={formatCurrency(depreciationTaxSaving)} className="text-[var(--positive)]" />
                    <InfoRow label="Actual After-Tax Cost" value={`${formatCurrency(afterTaxCost - depreciationTaxSaving)}/yr`} className="font-bold" />
                    <InfoRow label="" value={`${formatCurrency((afterTaxCost - depreciationTaxSaving) / 52)}/week out of pocket`} className="text-[var(--muted)] text-xs" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h4 className="font-semibold mb-2">Deductible Expenses for Investment Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[var(--muted)]">
              <div className="space-y-1">
                <p>- Loan interest (not principal)</p>
                <p>- Council rates</p>
                <p>- Water rates</p>
                <p>- Landlord insurance</p>
                <p>- Property management fees</p>
                <p>- Repairs and maintenance</p>
                <p>- Pest control</p>
              </div>
              <div className="space-y-1">
                <p>- Advertising for tenants</p>
                <p>- Body corporate fees</p>
                <p>- Cleaning</p>
                <p>- Gardening / lawn mowing</p>
                <p>- Legal fees (evictions, lease prep)</p>
                <p>- Tax depreciation (building + fixtures)</p>
                <p>- Travel to property (limited)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation */}
      {activeSection === "depreciation" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="font-semibold mb-3">Tax Depreciation Calculator</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Property depreciation allows you to claim the wear and tear of your investment property as a tax deduction.
              There are two types: <strong>Division 43</strong> (building/structure at 2.5% over 40 years) and{" "}
              <strong>Division 40</strong> (plant & equipment like carpets, blinds, appliances).
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Inputs</h4>
                <InputRow label="Building Construction Cost" value={buildCost} onChange={setBuildCost} prefix="$" />
                <InputRow label="Year Built" value={buildYear} onChange={setBuildYear} />
                <InputRow label="Fixtures & Fittings Cost" value={furnishingsCost} onChange={setFurnishingsCost} prefix="$" />
                <InputRow label="Your Marginal Tax Rate" value={marginalTaxRate} onChange={setMarginalTaxRate} suffix="%" />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Annual Deductions</h4>
                <InfoRow label="Div 43 (Building) — 2.5%/yr" value={`${formatCurrency(annualBuildingDeprn)}/yr`} />
                <InfoRow label="Years remaining" value={`${yearsRemaining} years`} />
                <InfoRow label="Total building deduction left" value={formatCurrency(totalBuildingDeprn)} />
                <InfoRow label="Div 40 (Plant) — Year 1 est." value={`${formatCurrency(year1PlantDeprn)}/yr`} />
                <div className="border-t border-[var(--card-border)] pt-2">
                  <InfoRow label="Total Year 1 Depreciation" value={formatCurrency(annualBuildingDeprn + year1PlantDeprn)} className="font-bold" />
                  <InfoRow label="Tax Saving (Year 1)" value={formatCurrency(depreciationTaxSaving)} className="text-[var(--positive)] font-bold" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5">
            <h4 className="font-semibold mb-2">Important: New Build Advantage</h4>
            <p className="text-sm text-[var(--muted)]">
              New builds (post-2017) get FULL depreciation on both Division 43 (building) and Division 40 (plant & equipment).
              For existing properties purchased after 9 May 2017, Division 40 deductions are only available to the original owner.
              This is a major reason to consider building new — especially combined with the NT $30,000 BuildBonus grant.
            </p>
          </div>
        </div>
      )}

      {/* CGT */}
      {activeSection === "cgt" && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-4">
          <h3 className="font-semibold">Capital Gains Tax (CGT)</h3>
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">50% CGT Discount</p>
              <p>Hold an investment property for 12+ months and you only pay tax on 50% of the capital gain.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">PPOR Exemption</p>
              <p>Your principal place of residence (PPOR) is generally CGT-free when sold. The 6-year absence rule lets you rent it out for up to 6 years while still claiming the exemption.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Cost Base Additions</p>
              <p>You can add these to your cost base (reducing CGT): stamp duty, legal fees, renovation costs, building inspections, and non-deductible borrowing costs.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Timing Strategy</p>
              <p>Sell in a low-income year (e.g., after leaving a job, or split between financial years) to minimise the tax rate applied to your gain.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stamp Duty NT */}
      {activeSection === "stamp-duty" && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-4">
          <h3 className="font-semibold">NT Stamp Duty</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Northern Territory stamp duty is calculated on a sliding scale. The NT generally has lower stamp duty than most other states.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)]">
                  <th className="pb-2 font-medium">Property Value</th>
                  <th className="pb-2 font-medium text-right">Rate</th>
                  <th className="pb-2 font-medium text-right">Approx. Duty</th>
                </tr>
              </thead>
              <tbody className="text-[var(--muted)]">
                {[300000, 400000, 500000, 600000, 700000, 800000].map((price) => (
                  <tr key={price} className="border-t border-[var(--card-border)]">
                    <td className="py-2">{formatCurrency(price)}</td>
                    <td className="py-2 text-right">~{((calculateNTStampDuty(price) / price) * 100).toFixed(2)}%</td>
                    <td className="py-2 text-right">{formatCurrency(calculateNTStampDuty(price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Note: First home buyers in the NT may be eligible for stamp duty concessions. These are estimates — check with your conveyancer for exact figures.
          </p>
        </div>
      )}

      {/* NT Grants */}
      {activeSection === "nt-grants" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5">
            <h3 className="font-semibold text-[var(--positive)] mb-3">NT BuildBonus — $30,000 Grant</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              The Northern Territory Government offers a $30,000 BuildBonus grant for new residential construction.
              This can significantly reduce the cash required for a new build.
            </p>
            <div className="space-y-3 text-sm">
              <div className="rounded bg-[var(--background)] p-3">
                <p className="font-medium text-[var(--foreground)] mb-1">Eligibility</p>
                <ul className="text-[var(--muted)] space-y-1 ml-4 list-disc">
                  <li>Must be a new residential build in the NT</li>
                  <li>Construction must commence within specified timeframes</li>
                  <li>The property can be an owner-occupied or investment property</li>
                  <li>Must use a licensed NT builder</li>
                  <li>Minimum build value applies (check current requirements)</li>
                </ul>
              </div>
              <div className="rounded bg-[var(--background)] p-3">
                <p className="font-medium text-[var(--foreground)] mb-1">How It Helps Your Strategy</p>
                <ul className="text-[var(--muted)] space-y-1 ml-4 list-disc">
                  <li>$30,000 off the build cost (or towards deposit)</li>
                  <li>Combined with full depreciation on a new build = maximum tax deductions</li>
                  <li>New builds typically attract higher rent and better tenants</li>
                  <li>Lower maintenance costs in early years</li>
                  <li>Can be combined with equity release from existing properties</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="font-semibold mb-3">Other NT Grants & Concessions</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded bg-[var(--background)] p-3">
                <p className="font-medium text-[var(--foreground)] mb-1">First Home Owner Grant (FHOG)</p>
                <p className="text-[var(--muted)]">$10,000 for first home buyers purchasing or building a new home in the NT. Cannot be combined with BuildBonus if already claimed for the same property.</p>
              </div>
              <div className="rounded bg-[var(--background)] p-3">
                <p className="font-medium text-[var(--foreground)] mb-1">Home Renovation Grant</p>
                <p className="text-[var(--muted)]">Up to $10,000 for significant renovations to existing NT homes. Minimum spend applies.</p>
              </div>
              <div className="rounded bg-[var(--background)] p-3">
                <p className="font-medium text-[var(--foreground)] mb-1">Stamp Duty Concessions</p>
                <p className="text-[var(--muted)]">Various concessions available for first home buyers, pensioners, and principal place of residence purchases in the NT.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lending Rules */}
      {activeSection === "lending" && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-4">
          <h3 className="font-semibold">Australian Lending Rules for Investors</h3>
          <div className="space-y-3 text-sm">
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Serviceability Buffer (APRA)</p>
              <p className="text-[var(--muted)]">Banks must assess your ability to repay at the loan rate + 3% buffer. If you borrow at 6%, they assess at 9%. This is the biggest factor limiting borrowing capacity.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">LVR Thresholds</p>
              <p className="text-[var(--muted)]">Up to 80% LVR: no LMI required. 80-90% LVR: LMI applies (can be $10,000-$40,000+). Over 90%: limited lender options, higher LMI. Investment loans often capped at 80% LVR.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Rental Income Shading</p>
              <p className="text-[var(--muted)]">Banks only count 70-80% of rental income for serviceability. This accounts for vacancies, management fees, and maintenance.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Debt-to-Income Ratio (DTI)</p>
              <p className="text-[var(--muted)]">Many lenders now cap total debt at 6-7x gross income. With your combined gross of ~$245K, that&apos;s roughly $1.47M-$1.72M total debt ceiling (including existing mortgages).</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Equity Release / Cross-Collateralisation</p>
              <p className="text-[var(--muted)]">You can use equity in existing properties as a deposit for new purchases. Banks will lend up to 80% of the property value — the difference between 80% and your current loan is your usable equity. Avoid cross-collateralisation (using one property as security for another loan with the same bank) where possible, as it limits flexibility.</p>
            </div>
            <div className="rounded bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)] mb-1">Interest-Only vs P&I</p>
              <p className="text-[var(--muted)]">Interest-only loans reduce repayments (improving cash flow) but don&apos;t reduce the principal. Common strategy: interest-only on investment properties (to maximise tax deductions) and P&I on your PPOR (to pay it off faster since it&apos;s not tax-deductible).</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--muted)] text-center">
        This is general information only, not financial advice. Tax laws change — consult a qualified accountant or financial adviser for advice specific to your situation.
      </p>
    </div>
  );
}

function calculateNTStampDuty(price: number): number {
  if (price <= 525000) return price * 0.0495;
  if (price <= 3000000) return 525000 * 0.0495 + (price - 525000) * 0.055;
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
        <input type="number" value={value} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1.5 text-sm text-right w-32 focus:border-[var(--accent)] outline-none" />
        {suffix && <span className="text-sm text-[var(--muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className={`text-sm font-medium ${className ?? ""}`}>{value}</span>
    </div>
  );
}
