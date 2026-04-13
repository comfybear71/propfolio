"use client";

import { useState } from "react";
import { type Person, createPerson } from "./types";

interface Props {
  people: Person[];
  onNext: (people: Person[]) => void;
}

export default function StepWelcome({ people, onNext }: Props) {
  const [names, setNames] = useState<string[]>(
    people.length > 0 ? people.map((p) => p.name) : [""]
  );

  function addPerson() {
    setNames([...names, ""]);
  }

  function removePerson(i: number) {
    if (names.length <= 1) return;
    setNames(names.filter((_, idx) => idx !== i));
  }

  function updateName(i: number, val: string) {
    const updated = [...names];
    updated[i] = val;
    setNames(updated);
  }

  function handleNext() {
    const validNames = names.filter((n) => n.trim());
    if (validNames.length === 0) return;
    const updatedPeople = validNames.map((name) => {
      const existing = people.find((p) => p.name === name.trim());
      return existing || createPerson(name.trim());
    });
    onNext(updatedPeople);
  }

  const canProceed = names.some((n) => n.trim());

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Welcome to Propfolio</h1>
        <p className="text-[var(--muted)] text-lg">
          Let&apos;s set up your property portfolio in under 5 minutes
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <label className="block text-sm font-medium">
          Who&apos;s investing? Add each person below.
        </label>

        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
              placeholder={`Person ${i + 1} full name`}
              className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:border-[var(--accent)] outline-none"
              autoFocus={i === 0}
            />
            {names.length > 1 && (
              <button
                onClick={() => removePerson(i)}
                className="text-[var(--muted)] hover:text-[var(--negative)] text-lg px-2"
              >
                &times;
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addPerson}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          + Add another person
        </button>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
