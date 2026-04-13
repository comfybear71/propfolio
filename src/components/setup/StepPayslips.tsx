"use client";

import { type Person } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  people: Person[];
  onUpdate: (people: Person[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPayslips({ people, onUpdate, onNext, onBack }: Props) {
  async function handleFileUpload(personIdx: number, file: File) {
    const updated = [...people];
    updated[personIdx] = { ...updated[personIdx], payslipFile: file, ocrLoading: true };
    onUpdate(updated);

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

        updated[personIdx] = {
          ...updated[personIdx],
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
        };
      } else {
        updated[personIdx] = { ...updated[personIdx], ocrLoading: false };
      }
    } catch {
      updated[personIdx] = { ...updated[personIdx], ocrLoading: false };
    }
    onUpdate([...updated]);
  }

  const allDone = people.every((p) => p.ocrDone);
  const anyLoading = people.some((p) => p.ocrLoading);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Upload Payslips</h2>
        <p className="text-[var(--muted)]">
          One payslip per person — we&apos;ll read it automatically
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {people.map((person, i) => (
          <div
            key={person.id}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-3"
          >
            <div className="font-medium">{person.name}</div>

            {person.ocrLoading && (
              <div className="text-sm text-[var(--accent)] animate-pulse py-4 text-center">
                Reading payslip...
              </div>
            )}

            {!person.ocrDone && !person.ocrLoading && (
              <label className="block border-2 border-dashed border-[var(--card-border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors">
                <div className="text-sm text-[var(--muted)]">
                  Drop PDF or tap to upload
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(i, f);
                  }}
                />
              </label>
            )}

            {person.ocrDone && person.income && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[var(--positive)] text-xs font-medium px-2 py-0.5 rounded bg-[var(--positive)]/20">
                    Extracted
                  </span>
                  <button
                    onClick={() => {
                      const updated = [...people];
                      updated[i] = { ...updated[i], ocrDone: false, income: null, payslipFile: null };
                      onUpdate(updated);
                    }}
                    className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
                  >
                    Re-upload
                  </button>
                </div>
                <Row label="Employer" value={person.income.employer} />
                <Row label="Job Title" value={person.income.jobTitle} />
                <Row label="Annual Gross" value={formatCurrency(person.income.annualGross)} highlight />
                <Row label="Annual Net" value={formatCurrency(person.income.annualNet)} highlight />
                <Row label="Net Fortnightly" value={formatCurrency(person.income.netFortnightly)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between max-w-lg mx-auto pt-4">
        <button onClick={onBack} className="px-6 py-3 text-[var(--muted)] hover:text-white transition-colors">
          Back
        </button>
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
