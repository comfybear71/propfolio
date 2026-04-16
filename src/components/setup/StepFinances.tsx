"use client";

import { type SetupProperty } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  properties: SetupProperty[];
  bankBalance: number;
  onUpdateProperty: (i: number, partial: Partial<SetupProperty>) => void;
  onUpdateBank: (val: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepFinances({
  properties, bankBalance, onUpdateProperty, onUpdateBank, onNext, onBack,
}: Props) {
  const canProceed = properties.every((p) => p.estimatedValue > 0);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your Finances</h2>
        <p className="text-[var(--muted)]">
          Loan balances and savings — just a few numbers
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {properties.map((prop, i) => (
          <div key={prop.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-4">
            <div className="font-medium text-sm">{prop.address}</div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Estimated value"
                value={prop.estimatedValue}
                onChange={(v) => onUpdateProperty(i, { estimatedValue: v })}
                prefix="$"
              />
              <NumberField
                label="Loan balance"
                value={prop.loanBalance}
                onChange={(v) => onUpdateProperty(i, { loanBalance: v })}
                prefix="$"
              />
              <NumberField
                label="Interest rate"
                value={prop.interestRate}
                onChange={(v) => onUpdateProperty(i, { interestRate: v })}
                suffix="%"
                step={0.01}
              />
              <NumberField
                label="Offset balance"
                value={prop.offsetBalance}
                onChange={(v) => onUpdateProperty(i, { offsetBalance: v })}
                prefix="$"
              />
              {prop.type === "Investment" && (
                <NumberField
                  label="Weekly rent"
                  value={prop.weeklyRent}
                  onChange={(v) => onUpdateProperty(i, { weeklyRent: v })}
                  prefix="$"
                  suffix="/wk"
                />
              )}
            </div>

            {prop.estimatedValue > 0 && prop.loanBalance > 0 && (
              <div className="pt-2 border-t border-[var(--card-border)] text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Equity</span>
                  <span className="text-[var(--positive)] font-medium">
                    {formatCurrency(prop.estimatedValue - prop.loanBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">LVR</span>
                  <span>{((prop.loanBalance / prop.estimatedValue) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Usable equity (80% LVR)</span>
                  <span className="text-[var(--positive)] font-medium">
                    {formatCurrency(Math.max(0, prop.estimatedValue * 0.8 - prop.loanBalance))}
                  </span>
                </div>
              </div>
            )}
            {prop.estimatedValue === 0 && (
              <p className="text-xs text-[var(--negative)]">
                Enter an estimated value to see equity calculations
              </p>
            )}
          </div>
        ))}

        {/* Bank balance / savings */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-3">
          <div className="font-medium text-sm">Savings / Cash</div>
          <p className="text-xs text-[var(--muted)]">
            Total savings across all bank accounts (excluding offset balances above)
          </p>
          <NumberField
            label="Total savings"
            value={bankBalance}
            onChange={onUpdateBank}
            prefix="$"
          />
        </div>
      </div>

      <div className="flex justify-between max-w-lg mx-auto pt-4">
        <button onClick={onBack} className="px-6 py-3 text-[var(--muted)] hover:text-white transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label, value, onChange, prefix, suffix, step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">{prefix}</span>
        )}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step || 1}
          className={`w-full bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--accent)] ${prefix ? "pl-7" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">{suffix}</span>
        )}
      </div>
    </div>
  );
}
