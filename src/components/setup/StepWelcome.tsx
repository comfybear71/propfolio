"use client";

import { useState } from "react";
import { type Person, createPerson } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  people: Person[];
  onUpdate: (people: Person[]) => void;
  onAddPerson: (person: Person) => void;
  onUpdatePerson: (id: string, update: Partial<Person>) => void;
  onNext: () => void;
}

export default function StepWelcome({ people, onUpdate, onAddPerson, onUpdatePerson, onNext }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  async function handleFileUpload(file: File) {
    // Add a placeholder person — uses addPerson (functional updater, no stale closure)
    const newPerson = createPerson("Reading payslip...");
    newPerson.ocrLoading = true;
    newPerson.payslipFile = file;
    onAddPerson(newPerson);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ocr-payslip", { method: "POST", body: form });
      const data = await res.json();

      if (data.ok && data.data) {
        const d = data.data;
        const grossPay = d.grossPay || 0;
        const netPay = d.netPay || 0;
        const freq = d.payFrequency === "monthly" ? 12 : d.payFrequency === "weekly" ? 52 : 26;

        // Update by ID — safe even if other uploads are in-flight
        onUpdatePerson(newPerson.id, {
          name: d.employeeName || "Unknown",
          ocrLoading: false,
          ocrDone: true,
          income: {
            employer: d.employer || "",
            jobTitle: d.jobTitle || "",
            annualGross: d.annualSalary || d.annualGross || grossPay * freq,
            annualNet: d.annualNet || netPay * freq,
            netFortnightly: d.fortnightlyNet || (d.payFrequency === "fortnightly" ? netPay : (netPay * freq) / 26),
            grossFortnightly: d.payFrequency === "fortnightly" ? grossPay : (grossPay * freq) / 26,
            payFrequency: d.payFrequency || "fortnightly",
            superannuation: d.superannuation || 0,
            taxWithheld: d.taxWithheld || 0,
            hourlyRate: d.hourlyRate || 0,
          },
        });
      } else {
        onUpdatePerson(newPerson.id, { name: "", ocrLoading: false, ocrDone: false });
      }
    } catch {
      onUpdatePerson(newPerson.id, { name: "", ocrLoading: false, ocrDone: false });
    }
  }

  function removePerson(i: number) {
    onUpdate(people.filter((_, idx) => idx !== i));
  }

  function updatePersonName(i: number, name: string) {
    const updated = [...people];
    updated[i] = { ...updated[i], name };
    onUpdate(updated);
  }

  function updatePersonIncome(i: number, field: keyof NonNullable<Person["income"]>, value: string | number) {
    const updated = [...people];
    const currentIncome = updated[i].income;
    if (!currentIncome) return;
    const nextIncome = { ...currentIncome, [field]: value };
    // Auto-recalculate annual/fortnightly figures when core values change
    if (field === "annualGross" && typeof value === "number") {
      nextIncome.grossFortnightly = Math.round((value / 26) * 100) / 100;
    } else if (field === "annualNet" && typeof value === "number") {
      nextIncome.netFortnightly = Math.round((value / 26) * 100) / 100;
    } else if (field === "grossFortnightly" && typeof value === "number") {
      nextIncome.annualGross = Math.round(value * 26);
    } else if (field === "netFortnightly" && typeof value === "number") {
      nextIncome.annualNet = Math.round(value * 26);
    }
    updated[i] = { ...updated[i], income: nextIncome };
    onUpdate(updated);
  }

  function retryUpload(i: number, file: File) {
    const personId = people[i].id;
    onUpdatePerson(personId, { ocrLoading: true, payslipFile: file });

    const form = new FormData();
    form.append("file", file);
    fetch("/api/ocr-payslip", { method: "POST", body: form })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          const d = data.data;
          const grossPay = d.grossPay || 0;
          const netPay = d.netPay || 0;
          const freq = d.payFrequency === "monthly" ? 12 : d.payFrequency === "weekly" ? 52 : 26;

          onUpdatePerson(personId, {
            name: d.employeeName || people[i].name,
            ocrLoading: false,
            ocrDone: true,
            income: {
              employer: d.employer || "",
              jobTitle: d.jobTitle || "",
              annualGross: d.annualSalary || d.annualGross || grossPay * freq,
              annualNet: d.annualNet || netPay * freq,
              netFortnightly: d.fortnightlyNet || (d.payFrequency === "fortnightly" ? netPay : (netPay * freq) / 26),
              grossFortnightly: d.payFrequency === "fortnightly" ? grossPay : (grossPay * freq) / 26,
              payFrequency: d.payFrequency || "fortnightly",
              superannuation: d.superannuation || 0,
              taxWithheld: d.taxWithheld || 0,
              hourlyRate: d.hourlyRate || 0,
            },
          });
        } else {
          onUpdatePerson(personId, { ocrLoading: false });
        }
      })
      .catch(() => {
        onUpdatePerson(personId, { ocrLoading: false });
      });
  }

  const anyLoading = people.some((p) => p.ocrLoading);
  const allDone = people.length > 0 && people.every((p) => p.ocrDone);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Welcome to Propfolio</h1>
        <p className="text-[var(--muted)] text-lg">
          Upload a payslip for each person investing
        </p>
        <p className="text-[var(--muted)] text-sm">
          We&apos;ll read the name, employer, and income automatically
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        {/* Show each person's results */}
        {people.map((person, i) => (
          <div
            key={person.id}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-3"
          >
            {person.ocrLoading && (
              <div className="text-sm text-[var(--accent)] animate-pulse py-4 text-center">
                Reading payslip...
              </div>
            )}

            {person.ocrDone && person.income && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between mb-2">
                  {editingId === person.id ? (
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => updatePersonName(i, e.target.value)}
                      className="font-semibold text-base bg-[var(--background)] border border-[var(--accent)] rounded px-2 py-1 flex-1 mr-2 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold text-base">{person.name}</span>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingId(editingId === person.id ? null : person.id)}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      {editingId === person.id ? "Done" : "Edit"}
                    </button>
                    <button
                      onClick={() => removePerson(i)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--negative)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {editingId === person.id ? (
                  <>
                    <EditRow
                      label="Employer"
                      value={person.income.employer}
                      onChange={(v) => updatePersonIncome(i, "employer", v)}
                    />
                    <EditRow
                      label="Job Title"
                      value={person.income.jobTitle}
                      onChange={(v) => updatePersonIncome(i, "jobTitle", v)}
                    />
                    <EditNumRow
                      label="Annual Gross"
                      value={person.income.annualGross}
                      onChange={(v) => updatePersonIncome(i, "annualGross", v)}
                      prefix="$"
                    />
                    <EditNumRow
                      label="Annual Net"
                      value={person.income.annualNet}
                      onChange={(v) => updatePersonIncome(i, "annualNet", v)}
                      prefix="$"
                    />
                    <EditNumRow
                      label="Net Fortnightly"
                      value={person.income.netFortnightly}
                      onChange={(v) => updatePersonIncome(i, "netFortnightly", v)}
                      prefix="$"
                    />
                    <p className="text-xs text-[var(--muted)] pt-1">
                      Tip: changing annual updates fortnightly automatically (and vice versa)
                    </p>
                  </>
                ) : (
                  <>
                    <Row label="Employer" value={person.income.employer} />
                    <Row label="Job Title" value={person.income.jobTitle} />
                    <Row label="Annual Gross" value={formatCurrency(person.income.annualGross)} highlight />
                    <Row label="Annual Net" value={formatCurrency(person.income.annualNet)} highlight />
                    <Row label="Net Fortnightly" value={formatCurrency(person.income.netFortnightly)} />
                  </>
                )}
              </div>
            )}

            {!person.ocrDone && !person.ocrLoading && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--negative)]">
                  Couldn&apos;t read this payslip. Try again:
                </p>
                <label className="block border-2 border-dashed border-[var(--card-border)] rounded-lg p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors">
                  <span className="text-sm text-[var(--muted)]">Upload payslip PDF</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) retryUpload(i, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => removePerson(i)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--negative)]"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Upload area for adding another person */}
        {!anyLoading && (
          <label className="block border-2 border-dashed border-[var(--card-border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent)] transition-colors">
            <div className="text-lg font-medium mb-1">
              {people.length === 0 ? "Upload your payslip" : "+ Add another person's payslip"}
            </div>
            <div className="text-sm text-[var(--muted)]">
              PDF, JPG, or PNG
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={onNext}
          disabled={!allDone || anyLoading}
          className="px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={highlight ? "font-semibold text-[var(--positive)]" : ""}>{value}</span>
    </div>
  );
}

function EditRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-right flex-1 max-w-[200px] focus:border-[var(--accent)] outline-none"
      />
    </div>
  );
}

function EditNumRow({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[var(--muted)]">{prefix}</span>}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-right w-32 focus:border-[var(--accent)] outline-none"
        />
      </div>
    </div>
  );
}
