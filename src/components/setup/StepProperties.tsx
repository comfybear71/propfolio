"use client";

import { useState, useEffect, useRef } from "react";
import { type SetupProperty, type Person, createProperty } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  properties: SetupProperty[];
  people: Person[];
  onUpdate: (properties: SetupProperty[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Suggestion {
  id: string;
  address: string;
  addressComponents: {
    streetNumber?: string;
    streetName?: string;
    streetType?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
  };
}

export default function StepProperties({ properties, people, onUpdate, onNext, onBack }: Props) {
  function addProperty() {
    onUpdate([...properties, createProperty()]);
  }

  function removeProperty(i: number) {
    onUpdate(properties.filter((_, idx) => idx !== i));
  }

  function updateProperty(i: number, partial: Partial<SetupProperty>) {
    const updated = [...properties];
    updated[i] = { ...updated[i], ...partial };
    onUpdate(updated);
  }

  const canProceed = properties.length > 0 && properties.every((p) => p.address.trim());

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your Properties</h2>
        <p className="text-[var(--muted)]">
          Type your address — we&apos;ll look up the details
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {properties.map((prop, i) => (
          <PropertyCard
            key={prop.id}
            property={prop}
            people={people}
            index={i}
            onUpdate={(partial) => updateProperty(i, partial)}
            onRemove={() => removeProperty(i)}
            canRemove={properties.length > 1}
          />
        ))}

        <button
          onClick={addProperty}
          className="w-full border-2 border-dashed border-[var(--card-border)] rounded-xl p-4 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          + Add another property
        </button>
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

function PropertyCard({
  property, people, index, onUpdate, onRemove, canRemove,
}: {
  property: SetupProperty;
  people: Person[];
  index: number;
  onUpdate: (partial: Partial<SetupProperty>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (query.length < 3) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/domain-suggest?terms=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.ok && data.suggestions) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        }
      } catch { /* ignore */ }
    }, 300);
  }, [query]);

  async function selectAddress(suggestion: Suggestion) {
    setShowSuggestions(false);
    setLoading(true);
    const ac = suggestion.addressComponents;
    const displayAddr = suggestion.address || [ac.streetNumber, ac.streetName, ac.streetType].filter(Boolean).join(" ");
    setQuery(displayAddr);

    onUpdate({
      domainPropertyId: suggestion.id,
      address: displayAddr,
      suburb: ac.suburb || "",
      state: ac.state || "",
      postcode: ac.postcode || "",
    });

    // Fetch full property details
    try {
      const res = await fetch(`/api/domain-property?id=${suggestion.id}`);
      const data = await res.json();
      if (data.ok && data.property) {
        const p = data.property;
        const pe = data.priceEstimate;
        onUpdate({
          domainPropertyId: suggestion.id,
          address: displayAddr,
          suburb: p.suburb || ac.suburb || "",
          state: p.state || ac.state || "",
          postcode: p.postcode || ac.postcode || "",
          propertyType: p.propertyType || "House",
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          carSpaces: p.carSpaces,
          landSize: p.landArea,
          estimatedValue: pe?.midPrice || 0,
          valueLow: pe?.lowerPrice || 0,
          valueHigh: pe?.upperPrice || 0,
          photos: p.photos || [],
        });
      }
    } catch { /* property lookup failed — address still saved */ }
    setLoading(false);
  }

  const hasDetails = property.bedrooms !== null || property.estimatedValue > 0;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted)]">Property {index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="text-[var(--muted)] hover:text-[var(--negative)] text-sm">
            Remove
          </button>
        )}
      </div>

      {/* Address search */}
      <div className="relative">
        <input
          type="text"
          value={property.address || query}
          onChange={(e) => { setQuery(e.target.value); if (property.address) onUpdate({ address: "" }); }}
          placeholder="Start typing your address..."
          className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:border-[var(--accent)] outline-none"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectAddress(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--accent)]/10 transition-colors border-b border-[var(--card-border)] last:border-0"
              >
                {s.address || [s.addressComponents.streetNumber, s.addressComponents.streetName, s.addressComponents.streetType, s.addressComponents.suburb, s.addressComponents.state].filter(Boolean).join(" ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-sm text-[var(--accent)] animate-pulse text-center py-2">
          Looking up property details...
        </div>
      )}

      {/* Property details from API */}
      {hasDetails && !loading && (
        <div className="space-y-3">
          {property.photos.length > 0 && (
            <img
              src={property.photos[0]}
              alt={property.address}
              className="w-full h-40 object-cover rounded-lg"
            />
          )}
          <div className="grid grid-cols-4 gap-2 text-xs text-center">
            {property.bedrooms !== null && <Chip label={`${property.bedrooms} bed`} />}
            {property.bathrooms !== null && <Chip label={`${property.bathrooms} bath`} />}
            {property.carSpaces !== null && <Chip label={`${property.carSpaces} car`} />}
            {property.landSize !== null && <Chip label={`${property.landSize}m²`} />}
          </div>
          {property.estimatedValue > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--positive)]">
                {formatCurrency(property.estimatedValue)}
              </div>
              {property.valueLow > 0 && (
                <div className="text-xs text-[var(--muted)]">
                  Range: {formatCurrency(property.valueLow)} – {formatCurrency(property.valueHigh)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual fields */}
      {property.address && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--muted)]">Type</label>
            <select
              value={property.type}
              onChange={(e) => onUpdate({ type: e.target.value as "PPOR" | "Investment" })}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-2 text-sm outline-none"
            >
              <option value="PPOR">PPOR</option>
              <option value="Investment">Investment</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Owner</label>
            <select
              value={property.owner}
              onChange={(e) => onUpdate({ owner: e.target.value })}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-2 text-sm outline-none"
            >
              <option value="">Select...</option>
              {people.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
              <option value="Joint">Joint</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="bg-[var(--card-border)] rounded px-2 py-1">{label}</span>
  );
}
