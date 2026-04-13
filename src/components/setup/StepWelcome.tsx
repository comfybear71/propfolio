"use client";

import { type Person, createPerson } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  people: Person[];
  onUpdate: (people: Person[]) => void;
  onNext: () => void;
}

export default function StepWelcome({ people, onUpdate, onNext }: Props) {
  async function handleFileUpload(file: File) {
    // Add a placeholder person while OCR runs
    const newPerson = createPerson("Reading payslip...");
    newPerson.ocrLoading = true;
    newPerson.payslipFile = file;
    const updatedPeople = [...people, newPerson];
    onUpdate(updatedPeople);

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
        const name = d.employeeName || "Unknown";

        const finished: Person = {
          ...newPerson,
          name,
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

        onUpdate([...people, finished]);
      } else {
        // OCR failed — let user enter name manually
        onUpdate([
          ...people,
          { ...newPerson, name: "", ocrLoading: false, ocrDone: false },
        ]);
      }
    } catch {
      onUpdate([
        ...people,
        { ...newPerson, name: "", ocrLoading: false, ocrDone: false },
      ]);
    }
  }

  function removePerson(i: number) {
    onUpdate(people.filter((_, idx) => idx !== i));
  }

  function retryUpload(i: number, file: File) {
    const updated = [...people];
    updated[i] = { ...updated[i], ocrLoading: true, payslipFile: file };
    onUpdate(updated);

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

          updated[i] = {
            ...updated[i],
            name: d.employeeName || updated[i].name,
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
          onUpdate([...updated]);
        } else {
          updated[i] = { ...updated[i], ocrLoading: false };
          onUpdate([...updated]);
        }
      })
      .catch(() => {
        updated[i] = { ...updated[i], ocrLoading: false };
        onUpdate([...updated]);
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
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base">{person.name}</span>
                  <button
                    onClick={() => removePerson(i)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--negative)]"
                  >
                    Remove
                  </button>
                </div>
                <Row label="Employer" value={person.income.employer} />
                <Row label="Job Title" value={person.income.jobTitle} />
                <Row label="Annual Gross" value={formatCurrency(person.income.annualGross)} highlight />
                <Row label="Annual Net" value={formatCurrency(person.income.annualNet)} highlight />
                <Row label="Net Fortnightly" value={formatCurrency(person.income.netFortnightly)} />
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
