"use client";

import { useState, useEffect } from "react";
import {
  incomes as defaultIncomes,
  defaultExpenses,
  formatCurrency,
  formatCurrencyExact,
  toMonthly,
  toAnnual,
  type Income,
  type Expense,
} from "@/lib/data";

const STORAGE_KEY = "propfolio-expenses";

const categories = ["Housing", "Transport", "Living", "Investment", "Other"];
const frequencies = ["weekly", "fortnightly", "monthly", "quarterly", "annually"] as const;

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<"income" | "expenses">("income");
  const [incomeData, setIncomeData] = useState<Income[]>(defaultIncomes);
  const [editingIncome, setEditingIncome] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load expenses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setExpenses(JSON.parse(saved));
    } else {
      setExpenses(defaultExpenses);
    }
    setLoaded(true);
  }, []);

  // Save expenses to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses, loaded]);

  function updateIncome(id: string, field: keyof Income, value: string | number) {
    setIncomeData((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }

  function updateExpense(id: string, field: keyof Expense, value: string | number) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  function addExpense() {
    const newId = Date.now().toString();
    setExpenses((prev) => [
      ...prev,
      { id: newId, category: "Other", description: "", amount: 0, frequency: "monthly" },
    ]);
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function resetExpenses() {
    setExpenses(defaultExpenses);
  }

  const totalMonthlyExpenses = expenses.reduce(
    (sum, e) => sum + toMonthly(e.amount, e.frequency), 0
  );
  const totalAnnualExpenses = expenses.reduce(
    (sum, e) => sum + toAnnual(e.amount, e.frequency), 0
  );
  const totalAnnualNetIncome = incomeData.reduce((sum, i) => sum + i.annualNet, 0);
  const annualRentalIncome = (1400 + 1000) * 52; // weekly rent * 52
  const totalAnnualInflow = totalAnnualNetIncome + annualRentalIncome;

  const tabs = [
    { id: "income" as const, label: "Income" },
    { id: "expenses" as const, label: "Expenses" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Finances</h2>
        <p className="text-[var(--muted)]">Income, expenses, and cash flow</p>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Net Income" value={formatCurrency(totalAnnualNetIncome)} subtext="/year" positive />
        <Card label="Rental Income" value={formatCurrency(annualRentalIncome)} subtext="/year" positive />
        <Card label="Total Expenses" value={formatCurrency(totalAnnualExpenses)} subtext="/year" />
        <Card label="Annual Surplus" value={formatCurrency(totalAnnualInflow - totalAnnualExpenses)}
          subtext="/year" positive={totalAnnualInflow - totalAnnualExpenses > 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--card-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Income Tab */}
      {activeTab === "income" && (
        <div className="space-y-6">
          {incomeData.map((income) => {
            const isEditing = editingIncome === income.id;
            return (
              <div key={income.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{income.person}</h4>
                    <p className="text-sm text-[var(--muted)]">{income.employer}</p>
                  </div>
                  <button
                    onClick={() => setEditingIncome(isEditing ? null : income.id)}
                    className="text-xs px-3 py-1 rounded border border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Employment</h5>
                    <InfoRow label="Job Title" value={income.jobTitle} />
                    <InfoRow label="Classification" value={income.classification} />
                    <InfoRow label="Location" value={income.location} />
                    {income.hourlyRate && (
                      <InfoRow label="Hourly Rate" value={formatCurrencyExact(income.hourlyRate)} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Pay Summary (Fortnightly)</h5>
                    <EditableNumRow label="Gross Pay" value={income.grossFortnightly} editing={isEditing}
                      onChange={(v) => updateIncome(income.id, "grossFortnightly", v)} />
                    <EditableNumRow label="Tax (PAYG)" value={income.taxFortnightly} editing={isEditing}
                      onChange={(v) => updateIncome(income.id, "taxFortnightly", v)} />
                    <EditableNumRow label="Super" value={income.superFortnightly} editing={isEditing}
                      onChange={(v) => updateIncome(income.id, "superFortnightly", v)} />
                    <EditableNumRow label="Net Pay" value={income.netFortnightly} editing={isEditing}
                      onChange={(v) => updateIncome(income.id, "netFortnightly", v)} positive />
                    <div className="border-t border-[var(--card-border)] pt-2 mt-2">
                      <InfoRow label="Annual Gross" value={formatCurrency(income.grossFortnightly * 26)} positive={false} />
                      <InfoRow label="Annual Net" value={formatCurrency(income.netFortnightly * 26)} positive />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Combined Income Summary */}
          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5">
            <h4 className="font-semibold mb-3">Combined Household Income</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-[var(--muted)]">Gross Fortnightly</div>
                <div className="font-semibold">{formatCurrencyExact(incomeData.reduce((s, i) => s + i.grossFortnightly, 0))}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Net Fortnightly</div>
                <div className="font-semibold text-[var(--positive)]">{formatCurrencyExact(incomeData.reduce((s, i) => s + i.netFortnightly, 0))}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Annual Gross</div>
                <div className="font-semibold">{formatCurrency(incomeData.reduce((s, i) => s + i.grossFortnightly * 26, 0))}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Annual Net</div>
                <div className="font-semibold text-[var(--positive)]">{formatCurrency(incomeData.reduce((s, i) => s + i.netFortnightly * 26, 0))}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && loaded && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              Enter your living expenses. Data saves automatically to your browser.
            </p>
            <div className="flex gap-2">
              <button
                onClick={resetExpenses}
                className="text-xs px-3 py-1.5 rounded border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--negative)] hover:border-[var(--negative)] transition-colors"
              >
                Reset
              </button>
              <button
                onClick={addExpense}
                className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                + Add Expense
              </button>
            </div>
          </div>

          {/* Expense Summary by Category */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const catTotal = expenses
                .filter((e) => e.category === cat)
                .reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0);
              return (
                <div key={cat} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                  <div className="text-xs text-[var(--muted)]">{cat}</div>
                  <div className="font-semibold">{formatCurrency(catTotal)}<span className="text-xs text-[var(--muted)] font-normal">/mo</span></div>
                </div>
              );
            })}
          </div>

          {/* Expenses Table */}
          <div className="rounded-lg border border-[var(--card-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--card)] text-[var(--muted)] text-left">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium text-right">Monthly</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-[var(--card-border)] hover:bg-[var(--card)]">
                    <td className="px-4 py-2">
                      <select
                        value={expense.category}
                        onChange={(e) => updateExpense(expense.id, "category", e.target.value)}
                        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm w-full focus:border-[var(--accent)] outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => updateExpense(expense.id, "description", e.target.value)}
                        placeholder="Description..."
                        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm w-full focus:border-[var(--accent)] outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[var(--muted)]">$</span>
                        <input
                          type="number"
                          value={expense.amount || ""}
                          onChange={(e) => updateExpense(expense.id, "amount", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm text-right w-24 focus:border-[var(--accent)] outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={expense.frequency}
                        onChange={(e) => updateExpense(expense.id, "frequency", e.target.value)}
                        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm w-full focus:border-[var(--accent)] outline-none"
                      >
                        {frequencies.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--muted)]">
                      {expense.amount > 0 ? formatCurrency(toMonthly(expense.amount, expense.frequency)) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeExpense(expense.id)}
                        className="text-[var(--muted)] hover:text-[var(--negative)] transition-colors"
                        title="Remove"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--card-border)] bg-[var(--card)] font-semibold">
                  <td colSpan={4} className="px-4 py-3">Total Expenses</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalMonthlyExpenses)}/mo</td>
                  <td></td>
                </tr>
                <tr className="bg-[var(--card)]">
                  <td colSpan={4} className="px-4 py-2 text-[var(--muted)]">Annual Total</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(totalAnnualExpenses)}/yr</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, subtext, positive }: {
  label: string; value: string; subtext?: string; positive?: boolean;
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

function InfoRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className={`text-sm font-medium ${positive ? "text-[var(--positive)]" : ""}`}>{value}</span>
    </div>
  );
}

function EditableNumRow({ label, value, editing, onChange, positive }: {
  label: string; value: number; editing: boolean; onChange: (v: number) => void; positive?: boolean;
}) {
  if (!editing) return <InfoRow label={label} value={formatCurrencyExact(value)} positive={positive} />;
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-[var(--muted)]">$</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm text-right w-28 focus:border-[var(--accent)] outline-none"
        />
      </div>
    </div>
  );
}
