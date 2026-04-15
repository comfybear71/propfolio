"use client";

import { useState, useEffect, use } from "react";
import { formatCurrency } from "@/lib/data";

interface ShareData {
  properties: {
    id: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    owner: string;
    type: string;
    propertyType: string;
    bedrooms: number | null;
    bathrooms: number | null;
    carSpaces: number | null;
    landSize: string;
    currentValue: number;
    weeklyRent: number;
  }[];
  loans: {
    id: string;
    propertyId: string;
    owner: string;
    lender: string;
    balance: number;
    interestRate: number;
    offsetBalance: number;
    repaymentAmount: number;
    repaymentFrequency: string;
  }[];
  incomes: {
    id: string;
    person: string;
    employer: string;
    jobTitle: string;
    annualGross: number;
    annualNet: number;
    grossFortnightly: number;
    netFortnightly: number;
  }[];
  expenses: { category: string; description: string; amount: number; frequency: string }[];
  assets: { owner: string; category: string; description: string; estimatedValue: number }[];
  files: { documentId: string; originalName: string; category: string; person: string; uploadedAt: string }[];
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedAt, setSharedAt] = useState<string>("");

  useEffect(() => {
    fetch(`/api/share/data?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        // Handle non-JSON error responses (e.g. HTML 404 pages)
        const contentType = r.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          setError(`Server returned ${r.status} (not JSON). The route may not be deployed yet.`);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((res) => {
        if (!res) return;
        if (res.ok) {
          setData(res.data);
          setSharedAt(res.sharedAt || "");
        } else {
          setError(res.error || "Could not load shared portfolio");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Network error: " + String(err));
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading shared portfolio...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center space-y-3 p-6">
          <div className="text-xl font-bold">
            <span className="text-[var(--accent)]">Prop</span>folio
          </div>
          <div className="text-lg font-bold text-[var(--negative)]">{error || "Could not load shared portfolio"}</div>
          <p className="text-sm text-[var(--muted)]">
            This share link may have been revoked or is invalid. Please contact the person
            who shared it with you for a new link.
          </p>
          <div className="text-xs text-[var(--muted)] bg-[var(--card)] border border-[var(--card-border)] rounded p-2 font-mono break-all">
            Token: {token.substring(0, 16)}...
          </div>
        </div>
      </div>
    );
  }

  // Calculations
  const totalValue = data.properties.reduce((s, p) => s + (p.currentValue || 0), 0);
  const totalDebt = data.loans.reduce((s, l) => s + (l.balance || 0), 0);
  const totalEquity = totalValue - totalDebt;
  const totalOffset = data.loans.reduce((s, l) => s + (l.offsetBalance || 0), 0);
  const combinedGross = data.incomes.reduce((s, i) => s + (i.annualGross || 0), 0);
  const combinedNet = data.incomes.reduce((s, i) => s + (i.annualNet || 0), 0);
  const totalWeeklyRent = data.properties.reduce((s, p) => s + (p.weeklyRent || 0), 0);
  const annualRentalIncome = totalWeeklyRent * 52;
  const totalExpensesAnnual = data.expenses.reduce((s, e) => {
    const mult = e.frequency === "weekly" ? 52 : e.frequency === "fortnightly" ? 26 : e.frequency === "monthly" ? 12 : e.frequency === "quarterly" ? 4 : 1;
    return s + (e.amount || 0) * mult;
  }, 0);
  const totalAssets = data.assets.reduce((s, a) => s + (a.estimatedValue || 0), 0);

  function getLoanForProperty(propertyId: string) {
    return data!.loans.find((l) => l.propertyId === propertyId);
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] pb-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl font-bold">
            <span className="text-[var(--accent)]">Prop</span>folio
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
            Shared View (Read-Only)
          </span>
        </div>
        <h1 className="text-2xl font-bold">Portfolio Overview</h1>
        <p className="text-sm text-[var(--muted)]">
          Shared with your broker / bank. Click any document link to download.
          {sharedAt && ` Shared on ${new Date(sharedAt).toLocaleDateString()}.`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Portfolio Value" value={formatCurrency(totalValue)} />
        <Card label="Total Equity" value={formatCurrency(totalEquity)} positive />
        <Card label="Total Debt" value={formatCurrency(totalDebt)} />
        <Card label="Offset Balance" value={formatCurrency(totalOffset)} positive />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Combined Gross" value={`${formatCurrency(combinedGross)}/yr`} />
        <Card label="Combined Net" value={`${formatCurrency(combinedNet)}/yr`} positive />
        <Card label="Rental Income" value={`${formatCurrency(annualRentalIncome)}/yr`} positive />
        <Card label="Total Assets" value={formatCurrency(totalAssets)} />
      </div>

      {/* Properties */}
      <Section title="Properties">
        <div className="space-y-4">
          {data.properties.map((p) => {
            const loan = getLoanForProperty(p.id);
            const equity = (p.currentValue || 0) - (loan?.balance || 0);
            return (
              <div key={p.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{p.address}</h4>
                    <p className="text-sm text-[var(--muted)]">{p.suburb}, {p.state} {p.postcode}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Owner: {p.owner}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    p.type === "PPOR" ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-[var(--positive)]/20 text-[var(--positive)]"
                  }`}>
                    {p.type}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <Stat label="Value" value={formatCurrency(p.currentValue || 0)} />
                  <Stat label="Loan" value={formatCurrency(loan?.balance || 0)} />
                  <Stat label="Equity" value={formatCurrency(equity)} positive />
                  <Stat label="Weekly Rent" value={formatCurrency(p.weeklyRent || 0)} />
                </div>
                {loan && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-3 pt-3 border-t border-[var(--card-border)]">
                    <Stat label="Lender" value={loan.lender || "—"} />
                    <Stat label="Interest Rate" value={`${loan.interestRate || 0}%`} />
                    <Stat label="Offset" value={formatCurrency(loan.offsetBalance || 0)} />
                    <Stat label="Repayment" value={`${formatCurrency(loan.repaymentAmount || 0)} ${loan.repaymentFrequency || ""}`} />
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3 pt-3 border-t border-[var(--card-border)] text-[var(--muted)]">
                  <div>Type: {p.propertyType}</div>
                  <div>Beds: {p.bedrooms ?? "—"}</div>
                  <div>Baths: {p.bathrooms ?? "—"}</div>
                  <div>Land: {p.landSize || "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Income */}
      <Section title="Income">
        <div className="space-y-3">
          {data.incomes.map((i) => (
            <div key={i.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{i.person}</h4>
                  <p className="text-sm text-[var(--muted)]">{i.employer} — {i.jobTitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Gross Fortnightly" value={formatCurrency(i.grossFortnightly || 0)} />
                <Stat label="Net Fortnightly" value={formatCurrency(i.netFortnightly || 0)} positive />
                <Stat label="Annual Gross" value={formatCurrency(i.annualGross || 0)} />
                <Stat label="Annual Net" value={formatCurrency(i.annualNet || 0)} positive />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Assets */}
      {data.assets.length > 0 && (
        <Section title="Assets">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--background)] text-[var(--muted)] text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Owner</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((a, idx) => (
                  <tr key={idx} className="border-t border-[var(--card-border)]">
                    <td className="px-4 py-2">{a.owner}</td>
                    <td className="px-4 py-2 text-[var(--muted)]">{a.category}</td>
                    <td className="px-4 py-2">{a.description}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(a.estimatedValue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Expenses Summary */}
      {data.expenses.length > 0 && (
        <Section title="Expenses Summary">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div className="text-sm font-semibold mb-2">
              Total annual expenses: {formatCurrency(totalExpensesAnnual)}/yr
            </div>
            <div className="text-xs text-[var(--muted)]">
              {data.expenses.length} expense items across {new Set(data.expenses.map(e => e.category)).size} categories
            </div>
          </div>
        </Section>
      )}

      {/* Documents */}
      {data.files.length > 0 && (
        <Section title="Supporting Documents">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div className="text-sm mb-3 text-[var(--muted)]">
              {data.files.length} documents uploaded. Contact the investor for access to specific documents.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {data.files.map((f, idx) => (
                <div key={idx} className="flex justify-between py-1">
                  <div>
                    <span className="text-[var(--muted)]">{f.category}: </span>
                    <span>{f.originalName}</span>
                  </div>
                  <span className="text-[var(--muted)] ml-2">{f.person}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-[var(--muted)] pt-8 pb-4">
        This is a read-only shared view of a Propfolio portfolio. Data cannot be modified from this view.
      </p>
    </div>
  );
}

function Card({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      <div className={`font-bold text-lg ${positive ? "text-[var(--positive)]" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`text-sm font-semibold ${positive ? "text-[var(--positive)]" : ""}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
