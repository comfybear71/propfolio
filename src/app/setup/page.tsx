"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type SetupState,
  type Person,
  type SetupProperty,
  createProperty,
  TOTAL_STEPS,
} from "@/components/setup/types";
import StepWelcome from "@/components/setup/StepWelcome";
import StepProperties from "@/components/setup/StepProperties";
import StepFinances from "@/components/setup/StepFinances";
import StepResults from "@/components/setup/StepResults";

export default function SetupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SetupState>({
    step: 1,
    people: [],
    properties: [createProperty()],
    bankBalance: 0,
  });

  function setStep(step: number) {
    setState((s) => ({ ...s, step }));
  }

  function setPeople(people: Person[]) {
    setState((s) => ({ ...s, people }));
  }

  function updatePersonById(id: string, update: Partial<Person>) {
    setState((s) => ({
      ...s,
      people: s.people.map((p) => (p.id === id ? { ...p, ...update } : p)),
    }));
  }

  function addPerson(person: Person) {
    setState((s) => ({ ...s, people: [...s.people, person] }));
  }

  function setProperties(properties: SetupProperty[]) {
    setState((s) => ({ ...s, properties }));
  }

  function updateProperty(i: number, partial: Partial<SetupProperty>) {
    setState((s) => {
      const updated = [...s.properties];
      updated[i] = { ...updated[i], ...partial };
      return { ...s, properties: updated };
    });
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // Save incomes
      for (const person of state.people) {
        if (!person.income) continue;
        await fetch("/api/incomes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `income-${person.name.toLowerCase().replace(/[^a-z]/g, "")}`,
            person: person.name,
            employer: person.income.employer,
            jobTitle: person.income.jobTitle,
            annualGross: person.income.annualGross,
            annualNet: person.income.annualNet,
            grossFortnightly: person.income.grossFortnightly,
            netFortnightly: person.income.netFortnightly,
            taxFortnightly: person.income.taxWithheld,
            superFortnightly: person.income.superannuation,
            hourlyRate: person.income.hourlyRate,
            payFrequency: person.income.payFrequency,
            classification: "Full Time",
            location: "",
          }),
        });
      }

      // Save properties
      for (const prop of state.properties) {
        if (!prop.address) continue;
        const propId = prop.id || `prop-${prop.address.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}-${Date.now()}`;
        await fetch("/api/properties", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: propId,
            address: prop.address,
            suburb: prop.suburb,
            state: prop.state,
            postcode: prop.postcode,
            owner: prop.owner,
            type: prop.type,
            propertyType: prop.propertyType,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            carSpaces: prop.carSpaces,
            landSize: prop.landSize ? `${prop.landSize} m²` : "",
            purchasePrice: 0,
            currentValue: prop.estimatedValue,
            valueLow: prop.valueLow,
            valueHigh: prop.valueHigh,
            growthSincePurchase: 0,
            weeklyRent: prop.weeklyRent,
            rentNotes: "",
            image: prop.photos[0] || "",
          }),
        });

        // Save loan for this property
        if (prop.loanBalance > 0) {
          await fetch("/api/loans", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: `loan-${propId}`,
              propertyId: propId,
              owner: prop.owner,
              lender: "",
              balance: prop.loanBalance,
              loanLimit: prop.loanBalance,
              availableRedraw: 0,
              interestRate: prop.interestRate,
              repaymentType: "Principal & Interest",
              repaymentAmount: 0,
              repaymentFrequency: "monthly",
              offsetBalance: prop.offsetBalance,
              loanEndDate: "",
              nextRepaymentDate: "",
            }),
          });
        }
      }

      // Save bank balance as an asset
      if (state.bankBalance > 0) {
        await fetch("/api/assets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{
            id: "savings-main",
            owner: state.people[0]?.name || "Joint",
            category: "Savings",
            description: "Bank savings",
            estimatedValue: state.bankBalance,
            notes: "Entered during setup",
            relevantForLending: true,
          }]),
        });
      }

      // Mark setup as complete
      await fetch("/api/borrowing-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupComplete: true }),
      });

      router.push("/");
    } catch (err) {
      console.error("Setup save failed:", err);
    }
    setSaving(false);
  }

  // Progress bar
  const progress = (state.step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen">
      {/* Progress bar */}
      <div className="w-full h-1 bg-[var(--card-border)] mb-8">
        <div
          className="h-1 bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Step indicator + Clear All */}
        <div className="flex items-center justify-between mb-6">
          <div />
          <span className="text-xs text-[var(--muted)]">Step {state.step} of {TOTAL_STEPS}</span>
          <button
            onClick={async () => {
              if (confirm("Clear ALL data and start completely fresh? This removes all properties, incomes, loans, and settings.")) {
                await fetch("/api/clear-all", { method: "DELETE" });
                setState({ step: 1, people: [], properties: [createProperty()], bankBalance: 0 });
              }
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--negative)] transition-colors"
          >
            Clear All Data
          </button>
        </div>

        {state.step === 1 && (
          <StepWelcome
            people={state.people}
            onUpdate={setPeople}
            onAddPerson={addPerson}
            onUpdatePerson={updatePersonById}
            onNext={() => setStep(2)}
          />
        )}

        {state.step === 2 && (
          <StepProperties
            properties={state.properties}
            people={state.people}
            onUpdate={setProperties}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {state.step === 3 && (
          <StepFinances
            properties={state.properties}
            bankBalance={state.bankBalance}
            onUpdateProperty={updateProperty}
            onUpdateBank={(v) => setState((s) => ({ ...s, bankBalance: v }))}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {state.step === 4 && (
          <StepResults
            people={state.people}
            properties={state.properties}
            bankBalance={state.bankBalance}
            onBack={() => setStep(3)}
            onFinish={handleFinish}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
