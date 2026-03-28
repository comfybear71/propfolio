"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import { useProperties, useLoans, useIncomes } from "@/lib/useData";

export default function RoadmapPage() {
  const { properties, loaded: pL } = useProperties();
  const { loans, loaded: lL } = useLoans();
  const { incomes, loaded: iL } = useIncomes();

  if (!pL || !lL || !iL) return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;

  // Current position
  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0);
  const totalDebt = loans.reduce((s, l) => s + l.balance, 0);
  const totalEquity = totalValue - totalDebt;
  const totalOffset = loans.reduce((s, l) => s + l.offsetBalance, 0);
  const totalWeeklyRent = properties.reduce((s, p) => s + p.weeklyRent, 0);
  const combinedGross = incomes.reduce((s, i) => s + i.annualGross, 0);
  const combinedNet = incomes.reduce((s, i) => s + i.annualNet, 0);
  const usableEquity = properties.reduce((s, p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    return s + Math.max(0, p.currentValue * 0.8 - (loan?.balance ?? 0));
  }, 0);

  // Sasitron offset progress
  const sasLoan = loans.find((l) => l.owner === "Sasitron Ransuk");
  const sasOffsetPct = sasLoan ? (sasLoan.offsetBalance / sasLoan.balance) * 100 : 0;
  const sasRemaining = sasLoan ? sasLoan.balance - sasLoan.offsetBalance : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Your Property Investment Roadmap</h2>
        <p className="text-[var(--muted)]">A personalised strategy for Stuart & Sasitron based on your current position</p>
      </div>

      {/* Current Position Snapshot */}
      <Section title="Where You Are Now" accent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
          <Stat label="Portfolio Value" value={formatCurrency(totalValue)} />
          <Stat label="Total Equity" value={formatCurrency(totalEquity)} positive />
          <Stat label="Usable Equity (80%)" value={formatCurrency(usableEquity)} positive />
          <Stat label="Combined Income" value={`${formatCurrency(combinedGross)}/yr`} />
          <Stat label="Rental Income" value={`${formatCurrency(totalWeeklyRent * 52)}/yr`} positive />
          <Stat label="Offset Savings" value={formatCurrency(totalOffset)} positive />
        </div>
        <p className="text-sm text-[var(--muted)]">
          You&apos;re in a strong position. Two properties in Gray with significant equity, solid dual income,
          high rental returns from room rentals, and a growing offset account. The goal is to turn this foundation
          into a portfolio of 5-7+ properties over the next 5 years.
        </p>
      </Section>

      {/* ═══════════════ PHASE 1 ═══════════════ */}
      <Section title="Phase 1: Foundation (Now → 12 Months)" number="1">
        <Step title="Complete Sasitron&apos;s 100% Offset" priority="critical">
          <p>
            Sasitron&apos;s offset is at {sasOffsetPct.toFixed(0)}% ({formatCurrency(totalOffset)} of {formatCurrency(sasLoan?.balance ?? 0)}).
            Only {formatCurrency(sasRemaining)} to go. Once this hits 100%, she&apos;s paying <strong>$0 interest</strong> on
            72 Bagshaw while still owning the asset and growing equity.
          </p>
          <p className="mt-2">
            <strong>Action:</strong> Every dollar of surplus income goes into the offset account. At your current rate
            (~{formatCurrency((combinedNet + totalWeeklyRent * 52 - 60000) / 12)}/month surplus), this should be complete
            in approximately {Math.ceil(sasRemaining / ((combinedNet + totalWeeklyRent * 52 - 60000) / 12))} months.
          </p>
        </Step>

        <Step title="Build Stuart&apos;s Redraw to 50%">
          <p>
            Stuart&apos;s redraw is at ~{formatCurrency(loans[0]?.availableRedraw ?? 0)}. Target 50% of the loan
            ({formatCurrency((loans[0]?.balance ?? 0) * 0.5)}). This builds your buffer and demonstrates strong
            repayment history to future lenders.
          </p>
        </Step>

        <Step title="Get Formal Property Valuations" priority="important">
          <p>
            Your realestate.com.au estimates ({formatCurrency(properties[0]?.currentValue ?? 0)} and {formatCurrency(properties[1]?.currentValue ?? 0)})
            may be conservative. If similar properties are selling for $700-800K, get independent valuations done.
            <strong> Higher valuations = more usable equity = bigger deposit for your next purchase.</strong>
          </p>
          <p className="mt-2">
            At $750K each, your usable equity jumps to ~{formatCurrency(750000 * 0.8 - (loans[0]?.balance ?? 0) + 750000 * 0.8 - (loans[1]?.balance ?? 0))}.
          </p>
        </Step>

        <Step title="Gather All Broker Documents">
          <p>
            Start collecting everything a broker will ask for now — don&apos;t wait until you&apos;re ready to buy.
            Go to your <Link href="/documents" className="text-[var(--accent)] hover:underline">Documents page</Link> and
            work through the checklist. Key items: latest payslips, 2 years of tax returns, bank statements (3 months),
            rental agreements, mortgage statements, and ID.
          </p>
        </Step>

        <Step title="Reduce Visible Liabilities">
          <p>
            Close any credit cards you don&apos;t use — banks count the <strong>limit</strong>, not the balance,
            as a liability. A $10K credit card limit reduces your borrowing capacity by ~$30K-$50K even if
            the balance is $0. Also pay off any BNPL or personal loans.
          </p>
        </Step>

        <Step title="Choose a Mortgage Broker">
          <p>
            Find a broker experienced with NT property and investors. They&apos;ll access lenders you can&apos;t go to directly,
            and some lenders have higher DTI tolerance (7-8x instead of 6x). A good broker will structure your loans to
            maximise future borrowing capacity.
          </p>
        </Step>
      </Section>

      {/* ═══════════════ PHASE 2 ═══════════════ */}
      <Section title="Phase 2: First New Build (12-18 Months)" number="2">
        <Step title="Release Equity from Both Properties" priority="critical">
          <p>
            Apply to release ~$100K from each property (total $200K). This increases your loans by $200K but gives
            you cash for a deposit. Your existing properties are still yours — you&apos;re just borrowing against the value
            you&apos;ve built up.
          </p>
          <div className="mt-2 p-3 rounded bg-[var(--background)] text-xs space-y-1">
            <div className="flex justify-between"><span>60 Bagshaw: Current loan {formatCurrency(loans[0]?.balance ?? 0)} → new loan ~{formatCurrency((loans[0]?.balance ?? 0) + 100000)}</span></div>
            <div className="flex justify-between"><span>72 Bagshaw: Current loan {formatCurrency(loans[1]?.balance ?? 0)} → new loan ~{formatCurrency((loans[1]?.balance ?? 0) + 100000)}</span></div>
            <div className="flex justify-between font-medium"><span>Cash released for deposit: {formatCurrency(200000)}</span></div>
          </div>
        </Step>

        <Step title="Buy Land + Build Package in the NT" priority="critical">
          <p>
            Target a 4-bedroom ensuite house (for room rentals). Key advantages of a new build in the NT:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc ml-5">
            <li><strong>$30,000 NT BuildBonus grant</strong> — cash off the cost</li>
            <li><strong>Stamp duty on land only</strong> — not the build cost (saves $15-25K)</li>
            <li><strong>Full tax depreciation</strong> — Div 43 (2.5% of build cost/yr for 40 years) + Div 40 (fixtures)</li>
            <li><strong>Lower maintenance</strong> — everything is new, warranty protection</li>
            <li><strong>Higher rent</strong> — new properties attract premium tenants</li>
          </ul>
        </Step>

        <Step title="Construction Loan During Build">
          <p>
            During the 12-18 month build, you only pay <strong>interest on amounts drawn down</strong> (progress payments to the builder).
            You don&apos;t start full P&I repayments until the certificate of occupancy is issued. This means your cash flow
            stays strong during construction — keep filling that offset account.
          </p>
          <div className="mt-2 p-3 rounded bg-[var(--background)] text-xs">
            <p><strong>Example build timeline payments:</strong></p>
            <p>Month 1-3: Slab poured, ~$80K drawn → interest ~$433/mo</p>
            <p>Month 4-8: Frame + roof, ~$200K drawn → interest ~$1,083/mo</p>
            <p>Month 9-14: Fit out, ~$350K drawn → interest ~$1,896/mo</p>
            <p>Month 15-18: Complete, full loan activated → P&I starts</p>
          </div>
        </Step>

        <Step title="Redirect All Income to New Property Offset">
          <p>
            Once Sasitron&apos;s offset hits 100% and the new build is complete, <strong>all surplus income shifts
            to the new property&apos;s offset account</strong>. With ~{formatCurrency((combinedNet + totalWeeklyRent * 52 - 60000) / 12)}/month
            surplus, you&apos;ll crush the interest on the new loan fast.
          </p>
        </Step>
      </Section>

      {/* ═══════════════ PHASE 3 ═══════════════ */}
      <Section title="Phase 3: Accelerate (2-3 Years)" number="3">
        <Step title="Room Rentals on New Build — $1,050/wk">
          <p>
            Your model: 4-bed ensuite house → live in 1 room, rent out 3 rooms at ~$350/wk each = <strong>$1,050/wk ($54,600/yr)</strong>.
            On a $600K loan at 6.5%, repayments are ~$45,600/yr. That&apos;s <strong>positively geared from day one</strong>.
          </p>
        </Step>

        <Step title="Maximise Tax Deductions">
          <p>For each investment property, claim every deduction:</p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-[var(--background)] space-y-1">
              <div className="font-medium text-[var(--foreground)]">Ongoing Deductions</div>
              <div>- Loan interest (biggest deduction)</div>
              <div>- Council & water rates</div>
              <div>- Landlord insurance</div>
              <div>- Property management fees</div>
              <div>- Repairs & maintenance</div>
              <div>- Pest control, cleaning, gardening</div>
              <div>- Advertising for tenants</div>
            </div>
            <div className="p-2 rounded bg-[var(--background)] space-y-1">
              <div className="font-medium text-[var(--foreground)]">Tax Depreciation (New Build)</div>
              <div>- Div 43: 2.5% of build cost/yr (40 years)</div>
              <div>- Div 40: Plant & equipment (declining value)</div>
              <div>- On a $400K build = ~$10K+/yr in depreciation</div>
              <div>- At 37% tax rate = ~$3,700+ tax refund/yr</div>
              <div className="mt-2 font-medium text-[var(--positive)]">Get a depreciation schedule from a quantity surveyor ($600-800, tax deductible)</div>
            </div>
          </div>
        </Step>

        <Step title="Negative Gearing Strategy" priority="important">
          <p>
            Even if a property is slightly negatively geared (expenses exceed rent), the <strong>tax loss reduces
            your taxable wage income</strong>. Combined with depreciation, you may get a significant tax refund
            while the property grows in value.
          </p>
          <div className="mt-2 p-3 rounded bg-[var(--background)] text-xs space-y-1">
            <div className="font-medium">Example on a $600K loan at 6.5%:</div>
            <div className="flex justify-between"><span>Rent income</span><span>$54,600</span></div>
            <div className="flex justify-between"><span>Interest expense</span><span>-$39,000</span></div>
            <div className="flex justify-between"><span>Rates, insurance, mgmt</span><span>-$8,000</span></div>
            <div className="flex justify-between"><span>Depreciation</span><span>-$13,000</span></div>
            <div className="flex justify-between border-t border-[var(--card-border)] pt-1 font-medium"><span>Taxable loss</span><span className="text-[var(--positive)]">-$5,400</span></div>
            <div className="flex justify-between"><span>Tax saving (at 37%)</span><span className="text-[var(--positive)]">$2,000 refund</span></div>
            <div className="mt-1 text-[var(--muted)]">You&apos;re cash flow positive ($54K rent vs $47K costs) but on paper negative = tax refund + wealth building</div>
          </div>
        </Step>

        <Step title="Use Property 3&apos;s Equity for Property 4">
          <p>
            Once your new build is valued (typically higher than build cost), you can release equity from it
            for the next deposit. With 4% growth, an $800K property becomes ~$832K after year 1.
            At 80% LVR: $665K borrowable minus $600K loan = <strong>$65K usable equity from the new property alone</strong>.
          </p>
          <p className="mt-2">
            Combined with continuing to build offset/redraw on your existing properties, you have multiple
            sources of deposits for future purchases.
          </p>
        </Step>
      </Section>

      {/* ═══════════════ PHASE 4 ═══════════════ */}
      <Section title="Phase 4: Portfolio Growth (3-5 Years)" number="4">
        <Step title="Repeat: One New Build Per Year">
          <p>
            Each year, release equity from existing properties → buy land → build 4-bed ensuite → rent rooms.
            Each new build adds:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc ml-5">
            <li>$30,000 NT BuildBonus grant</li>
            <li>~$54,600/yr rental income</li>
            <li>~$10,000+/yr in depreciation deductions</li>
            <li>Capital growth on the property value</li>
            <li>More equity for the next purchase</li>
          </ul>
        </Step>

        <Step title="Consider Interest-Only on Investment Loans">
          <p>
            Once you have 3-4 investment properties, consider switching them to <strong>interest-only (IO) loans</strong>:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc ml-5">
            <li>Lower repayments = more cash flow to offset accounts</li>
            <li>Investment loan interest is tax-deductible anyway</li>
            <li>Maximises negative gearing deductions (higher interest claim)</li>
            <li>Frees up serviceability for the next purchase</li>
            <li>Your offset accounts do the &quot;repaying&quot; without reducing the deductible debt</li>
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Keep P&I on your PPOR (60 Bagshaw) — that interest is NOT tax-deductible, so pay it down fast.
          </p>
        </Step>

        <Step title="Refinance to Better Rates">
          <p>
            Sasitron&apos;s ING rate at 6.04% is high. Once you have multiple properties and a strong track record,
            you have leverage to negotiate. A 0.5% rate reduction on $378K saves <strong>$1,890/yr in interest</strong>.
            Across a portfolio of $2M+ in loans, that&apos;s significant.
          </p>
        </Step>
      </Section>

      {/* ═══════════════ PHASE 5 ═══════════════ */}
      <Section title="Phase 5: Future Opportunities (5+ Years)" number="5">
        <Step title="Portfolio Target: 7 Properties, $5M+ Value">
          <p>
            With 2 existing + 5 new builds over 5 years, plus 4% annual growth:
          </p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Properties" value="7" />
            <Stat label="Est. Portfolio Value" value="$5M+" positive />
            <Stat label="Weekly Rent" value="$5,000+/wk" positive />
            <Stat label="NT Grants Claimed" value={formatCurrency(150000)} positive />
          </div>
        </Step>

        <Step title="Transition from Growth to Income">
          <p>
            As offset accounts grow and loans reduce, your cash flow becomes strongly positive.
            Options open up:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc ml-5">
            <li>Reduce working hours / semi-retire on rental income</li>
            <li>Continue building — use rental income alone for deposits</li>
            <li>Sell one property to pay off others (CGT 50% discount after 12 months)</li>
            <li>Convert room rentals to whole-house leases for passive income</li>
          </ul>
        </Step>

        <Step title="Consider a Trust or Company Structure">
          <p>
            Once your portfolio reaches 4-5 properties, speak to a tax accountant about whether a
            family trust or company structure is beneficial. This can help with:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc ml-5">
            <li>Asset protection (separate property from personal assets)</li>
            <li>Income splitting (distribute rental income to lower-tax family members)</li>
            <li>Easier estate planning</li>
            <li>Note: trusts can&apos;t claim negative gearing against personal income — timing matters</li>
          </ul>
        </Step>

        <Step title="Land Banking for Future Builds">
          <p>
            If cash flow is strong but you&apos;re hitting DTI limits, consider buying land only (cheaper, no loan needed if using equity).
            Hold the land and build when your borrowing capacity frees up. Land in growth corridors
            around Darwin (Palmerston, Zuccoli, Muirhead) may appreciate while you wait.
          </p>
        </Step>
      </Section>

      {/* ═══════════════ KEY NUMBERS ═══════════════ */}
      <Section title="Key Numbers to Watch" accent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-medium">Monitor Monthly</div>
            <div className="space-y-1 text-[var(--muted)]">
              <p>- Offset account balance (target: 100% on 72 Bagshaw)</p>
              <p>- Redraw balance (target: 50% on 60 Bagshaw)</p>
              <p>- Total surplus going to offset each month</p>
              <p>- Room rental occupancy (vacancies = lost income)</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Monitor Yearly</div>
            <div className="space-y-1 text-[var(--muted)]">
              <p>- Property valuations (update in the Properties page)</p>
              <p>- DTI ratio (keep below 6x for most lenders)</p>
              <p>- Interest rates (refinance if better deals available)</p>
              <p>- Tax return / depreciation claims (maximise deductions)</p>
              <p>- NT BuildBonus eligibility (check grant requirements)</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════ IMMEDIATE ACTIONS ═══════════════ */}
      <Section title="Immediate Action Checklist" accent>
        <div className="space-y-2 text-sm">
          {[
            { done: false, text: "Update property values to realistic estimates ($700-800K) on the Properties page" },
            { done: false, text: "Fill in all asset values on the Assets page (car, motorbike, portable homes)" },
            { done: false, text: "Enter your living expenses on the Finances page (be honest — banks will check)" },
            { done: false, text: "Close any unused credit cards" },
            { done: false, text: "Start gathering broker documents (see Documents page)" },
            { done: false, text: "Get independent property valuations for both Bagshaw properties" },
            { done: false, text: "Research mortgage brokers in Darwin with investment property experience" },
            { done: false, text: "Research NT BuildBonus current eligibility requirements" },
            { done: false, text: "Identify target suburbs and land + build packages in Darwin" },
            { done: false, text: "Book a meeting with a tax accountant to review depreciation strategy" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[var(--muted)] shrink-0">{i + 1}.</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-xs text-[var(--muted)] text-center pt-4">
        This is a general strategy based on your current financial position. It is not financial advice.
        Consult a qualified financial adviser, mortgage broker, and tax accountant before making investment decisions.
        Tax laws, grant eligibility, and lending policies can change.
      </p>
    </div>
  );
}

function Section({ title, children, number, accent }: {
  title: string; children: React.ReactNode; number?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 ${
      accent
        ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
        : "border-[var(--card-border)] bg-[var(--card)]"
    }`}>
      <div className="flex items-center gap-3 mb-4">
        {number && (
          <span className="text-lg font-bold text-[var(--accent)] bg-[var(--accent)]/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            {number}
          </span>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Step({ title, children, priority }: {
  title: string; children: React.ReactNode; priority?: "critical" | "important";
}) {
  return (
    <div className="pl-4 border-l-2 border-[var(--card-border)]">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-medium text-sm">{title}</h4>
        {priority === "critical" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--negative)]/20 text-[var(--negative)] font-medium">CRITICAL</span>
        )}
        {priority === "important" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">IMPORTANT</span>
        )}
      </div>
      <div className="text-sm text-[var(--muted)]">{children}</div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="p-2 rounded bg-[var(--background)]">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`font-semibold ${positive ? "text-[var(--positive)]" : ""}`}>{value}</div>
    </div>
  );
}
