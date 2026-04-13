"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency, formatCurrencyExact, type Property, type Loan } from "@/lib/data";
import { useProperties, useLoans } from "@/lib/useData";

export default function PropertiesPage() {
  const { properties: propertyData, saveProperty, removeProperty, loaded: pLoaded } = useProperties();
  const { loans: loanData, saveLoan, removeLoan, loaded: lLoaded } = useLoans();
  const [editing, setEditing] = useState<string | null>(null);

  if (!pLoaded || !lLoaded) {
    return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;
  }

  function updateProperty(id: string, field: keyof Property, value: string | number) {
    const prop = propertyData.find((p) => p.id === id);
    if (prop) saveProperty({ ...prop, [field]: value });
  }

  function updateLoan(propertyId: string, field: keyof Loan, value: string | number) {
    const loan = loanData.find((l) => l.propertyId === propertyId);
    if (loan) saveLoan({ ...loan, [field]: value });
  }

  function getLoan(propertyId: string) {
    return loanData.find((l) => l.propertyId === propertyId);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Properties</h2>
        <p className="text-[var(--muted)]">Click any value to edit. Changes are temporary until Supabase is connected.</p>
      </div>

      {propertyData.map((property) => {
        const loan = getLoan(property.id);
        const equity = property.currentValue - (loan?.balance ?? 0);
        const growthPct = ((property.currentValue - property.purchasePrice) / property.purchasePrice * 100).toFixed(1);
        const isEditing = editing === property.id;

        return (
          <div key={property.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="relative h-56 w-full">
              <Image
                src={property.image}
                alt={property.address}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{property.address}</h3>
                <p className="text-[var(--muted)]">{property.suburb}, {property.state} {property.postcode}</p>
                <p className="text-sm text-[var(--muted)] mt-1">Owner: {property.owner}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  property.type === "PPOR"
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "bg-[var(--positive)]/20 text-[var(--positive)]"
                }`}>
                  {property.type}
                </span>
                <button
                  onClick={() => setEditing(isEditing ? null : property.id)}
                  className="text-xs px-3 py-1 rounded border border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  {isEditing ? "Done" : "Edit"}
                </button>
                {isEditing && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${property.address}? This will also remove the associated loan.`)) {
                        const loan = getLoan(property.id);
                        removeProperty(property.id);
                        if (loan) removeLoan(loan.id);
                        setEditing(null);
                      }
                    }}
                    className="text-xs px-3 py-1 rounded border border-[var(--negative)]/30 text-[var(--negative)] hover:bg-[var(--negative)]/10 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-[var(--muted)] mb-3 uppercase tracking-wide">Property Details</h4>
                <div className="space-y-2">
                  <EditableRow label="Property Type" value={property.propertyType} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "propertyType", v)} />
                  <EditableRow label="Bedrooms" value={property.bedrooms != null ? String(property.bedrooms) : ""} editing={isEditing}
                    placeholder="—"
                    onChange={(v) => updateProperty(property.id, "bedrooms", v === "" ? 0 : Number(v))} />
                  <EditableRow label="Bathrooms" value={property.bathrooms != null ? String(property.bathrooms) : ""} editing={isEditing}
                    placeholder="—"
                    onChange={(v) => updateProperty(property.id, "bathrooms", v === "" ? 0 : Number(v))} />
                  <EditableRow label="Car Spaces" value={property.carSpaces != null ? String(property.carSpaces) : ""} editing={isEditing}
                    placeholder="—"
                    onChange={(v) => updateProperty(property.id, "carSpaces", v === "" ? 0 : Number(v))} />
                  <EditableRow label="Land Size" value={property.landSize} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "landSize", v)} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-[var(--muted)] mb-3 uppercase tracking-wide">Valuation</h4>
                <div className="space-y-2">
                  <EditableNumberRow label="Purchase Price" value={property.purchasePrice} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "purchasePrice", v)} />
                  <EditableNumberRow label="Current Value" value={property.currentValue} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "currentValue", v)} />
                  <EditableNumberRow label="Value (Low)" value={property.valueLow} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "valueLow", v)} />
                  <EditableNumberRow label="Value (High)" value={property.valueHigh} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "valueHigh", v)} />
                  <Row label="Growth" value={`+${formatCurrency(property.currentValue - property.purchasePrice)} (+${growthPct}%)`} positive />
                  <Row label="Equity" value={formatCurrency(equity)} positive />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-[var(--muted)] mb-3 uppercase tracking-wide">Loan Details</h4>
                {loan ? (
                  <div className="space-y-2">
                    <Row label="Lender" value={loan.lender} />
                    <EditableNumberRow label="Loan Balance" value={loan.balance} editing={isEditing} exact
                      onChange={(v) => updateLoan(property.id, "balance", v)} />
                    <EditableNumberRow label="Loan Limit" value={loan.loanLimit} editing={isEditing} exact
                      onChange={(v) => updateLoan(property.id, "loanLimit", v)} />
                    <EditableNumberRow label="Available Redraw" value={loan.availableRedraw} editing={isEditing} exact
                      onChange={(v) => updateLoan(property.id, "availableRedraw", v)} />
                    <EditableRow label="Interest Rate" value={loan.interestRate.toString()} editing={isEditing} suffix="%"
                      onChange={(v) => updateLoan(property.id, "interestRate", parseFloat(v))} />
                    <Row label="Repayment Type" value={loan.repaymentType} />
                    <EditableNumberRow label="Repayment Amount" value={loan.repaymentAmount} editing={isEditing} exact
                      onChange={(v) => updateLoan(property.id, "repaymentAmount", v)} />
                    <Row label="Repayment Freq." value={loan.repaymentFrequency} />
                    <Row label="LVR" value={`${((loan.balance / property.currentValue) * 100).toFixed(1)}%`} />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No loan data</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-[var(--muted)] mb-3 uppercase tracking-wide">Rental Income</h4>
                <div className="space-y-2">
                  <EditableNumberRow label="Weekly Rent" value={property.weeklyRent} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "weeklyRent", v)} />
                  <Row label="Annual Rent" value={formatCurrency(property.weeklyRent * 52)} positive />
                  <Row label="Gross Yield" value={`${((property.weeklyRent * 52) / property.currentValue * 100).toFixed(2)}%`} />
                  <EditableRow label="Notes" value={property.rentNotes} editing={isEditing}
                    onChange={(v) => updateProperty(property.id, "rentNotes", v)} />
                </div>

                {loan && loan.offsetBalance > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-[var(--muted)] mb-3 mt-6 uppercase tracking-wide">Offset Account</h4>
                    <div className="space-y-2">
                      <EditableNumberRow label="Offset Balance" value={loan.offsetBalance} editing={isEditing} exact
                        onChange={(v) => updateLoan(property.id, "offsetBalance", v)} />
                      <Row label="Effective Loan" value={formatCurrencyExact(loan.balance - loan.offsetBalance)} />
                      <Row label="Interest Saved" value={`${formatCurrency(loan.offsetBalance * loan.interestRate / 100)}/yr`} positive />
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className={`text-sm font-medium ${positive ? "text-[var(--positive)]" : ""}`}>{value}</span>
    </div>
  );
}

function EditableRow({ label, value, editing, onChange, suffix, placeholder }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; suffix?: string; placeholder?: string;
}) {
  const display = value || placeholder || "—";
  if (!editing) return <Row label={label} value={suffix ? `${display}${suffix}` : display} />;
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm text-right w-32 focus:border-[var(--accent)] outline-none"
        />
        {suffix && <span className="text-sm text-[var(--muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function EditableNumberRow({ label, value, editing, onChange, exact }: {
  label: string; value: number; editing: boolean; onChange: (v: number) => void; exact?: boolean;
}) {
  if (!editing) return <Row label={label} value={exact ? formatCurrencyExact(value) : formatCurrency(value)} />;
  const displayValue = Math.round(value * 100) / 100;
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-[var(--muted)]">$</span>
        <input
          type="number"
          step="0.01"
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm text-right w-32 focus:border-[var(--accent)] outline-none"
        />
      </div>
    </div>
  );
}
