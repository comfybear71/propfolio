"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/data";
import { useProperties, useLoans, useIncomes } from "@/lib/useData";

interface Strategy {
  summary: string;
  phases: {
    title: string;
    timeline: string;
    steps: {
      title: string;
      description: string;
      priority: "critical" | "important" | "normal";
      actionItems: string[];
    }[];
  }[];
  keyMetrics: { label: string; current: string; target: string; timeframe: string }[];
  risks: string[];
  immediateActions: string[];
}

export default function RoadmapPage() {
  const { properties, loaded: pL } = useProperties();
  const { loans, loaded: lL } = useLoans();
  const { incomes, loaded: iL } = useIncomes();
  const [goal, setGoal] = useState("");
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pL || !lL || !iL) return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;

  if (properties.length === 0 && incomes.length === 0) {
    return (
      <div className="text-center py-20 space-y-3 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold">Your Property Investment Roadmap</h2>
        <p className="text-[var(--muted)]">Complete your setup first to generate a personalised roadmap.</p>
        <a href="/setup" className="inline-block px-6 py-2 bg-[var(--accent)] text-white rounded-lg text-sm">Go to Setup</a>
      </div>
    );
  }

  // Current position
  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0);
  const totalDebt = loans.reduce((s, l) => s + l.balance, 0);
  const totalEquity = totalValue - totalDebt;
  const totalOffset = loans.reduce((s, l) => s + l.offsetBalance, 0);
  const totalWeeklyRent = properties.reduce((s, p) => s + p.weeklyRent, 0);
  const combinedGross = incomes.reduce((s, i) => s + i.annualGross, 0);
  const usableEquity = properties.reduce((s, p) => {
    const loan = loans.find((l) => l.propertyId === p.id);
    return s + Math.max(0, p.currentValue * 0.8 - (loan?.balance ?? 0));
  }, 0);

  async function generateStrategy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (data.ok && data.strategy) {
        setStrategy(data.strategy);
      } else {
        setError(data.error || "Failed to generate strategy");
      }
    } catch (err) {
      setError("Network error: " + String(err));
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Your Property Investment Roadmap</h2>
        <p className="text-[var(--muted)]">
          AI-powered strategy based on your actual portfolio data
        </p>
      </div>

      {/* Current Position Snapshot */}
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5">
        <h3 className="font-semibold mb-3">Where You Are Now</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Portfolio Value" value={formatCurrency(totalValue)} />
          <Stat label="Total Equity" value={formatCurrency(totalEquity)} positive />
          <Stat label="Usable Equity (80%)" value={formatCurrency(usableEquity)} positive />
          <Stat label="Combined Income" value={`${formatCurrency(combinedGross)}/yr`} />
          <Stat label="Rental Income" value={`${formatCurrency(totalWeeklyRent * 52)}/yr`} positive />
          <Stat label="Offset Savings" value={formatCurrency(totalOffset)} positive />
        </div>
      </div>

      {/* Goal Input */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-4">
        <h3 className="font-semibold">What&apos;s Your Goal?</h3>
        <p className="text-sm text-[var(--muted)]">
          Tell us what you want to achieve. The AI will analyse your portfolio and create a personalised roadmap.
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Examples:&#10;• Build a portfolio of 5+ properties in 5 years using equity and NT BuildBonus&#10;• I'm a first-time buyer with $80K savings, earning $95K — how do I get started?&#10;• I have 3 investment properties and want to maximise rental yield&#10;• Plan my retirement through property — I want $2,000/wk passive income by 2035"
          rows={4}
          className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:border-[var(--accent)] outline-none resize-none"
        />
        <button
          onClick={generateStrategy}
          disabled={loading}
          className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          {loading ? "Generating your roadmap..." : "Generate My Roadmap"}
        </button>
        {error && (
          <div className="text-sm text-[var(--negative)] bg-[var(--negative)]/10 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-[var(--accent)] animate-pulse text-lg mb-2">Analysing your portfolio...</div>
          <p className="text-sm text-[var(--muted)]">
            The AI is reviewing your income, properties, equity, and expenses to build a personalised strategy.
          </p>
        </div>
      )}

      {/* AI-Generated Strategy */}
      {strategy && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5">
            <h3 className="font-semibold mb-2">Strategy Overview</h3>
            <p className="text-sm">{strategy.summary}</p>
          </div>

          {/* Phases */}
          {strategy.phases.map((phase, i) => (
            <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg font-bold text-[var(--accent)] bg-[var(--accent)]/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{phase.title}</h3>
                  <span className="text-xs text-[var(--muted)]">{phase.timeline}</span>
                </div>
              </div>
              <div className="space-y-4">
                {phase.steps.map((step, j) => (
                  <div key={j} className="pl-4 border-l-2 border-[var(--card-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      {step.priority === "critical" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--negative)]/20 text-[var(--negative)] font-medium">CRITICAL</span>
                      )}
                      {step.priority === "important" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">IMPORTANT</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-2">{step.description}</p>
                    {step.actionItems && step.actionItems.length > 0 && (
                      <div className="text-xs space-y-1">
                        {step.actionItems.map((action, k) => (
                          <div key={k} className="flex items-start gap-2 text-[var(--muted)]">
                            <span className="text-[var(--accent)] shrink-0">-</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Key Metrics */}
          {strategy.keyMetrics && strategy.keyMetrics.length > 0 && (
            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5">
              <h3 className="font-semibold mb-3">Key Metrics to Track</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {strategy.keyMetrics.map((m, i) => (
                  <div key={i} className="bg-[var(--background)] rounded-lg p-3 text-sm">
                    <div className="font-medium mb-1">{m.label}</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--muted)]">Now: {m.current}</span>
                      <span className="text-[var(--positive)]">Target: {m.target}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">{m.timeframe}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {strategy.risks && strategy.risks.length > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
              <h3 className="font-semibold mb-3">Risks to Watch</h3>
              <div className="space-y-2 text-sm">
                {strategy.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500 shrink-0">-</span>
                    <span className="text-[var(--muted)]">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immediate Actions */}
          {strategy.immediateActions && strategy.immediateActions.length > 0 && (
            <div className="rounded-xl border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5">
              <h3 className="font-semibold mb-3">Do This Week</h3>
              <div className="space-y-2 text-sm">
                {strategy.immediateActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[var(--muted)] shrink-0">{i + 1}.</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regenerate */}
          <div className="text-center pt-4">
            <button
              onClick={generateStrategy}
              disabled={loading}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Regenerate with different goal
            </button>
          </div>

          <p className="text-xs text-[var(--muted)] text-center pt-4">
            This is AI-generated strategic guidance based on your portfolio data. It is not financial advice.
            Consult a qualified financial adviser, mortgage broker, and tax accountant before making investment decisions.
          </p>
        </div>
      )}
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
