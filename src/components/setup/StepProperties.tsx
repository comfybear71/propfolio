"use client";

import { useState } from "react";
import { type SetupProperty, type Person, createProperty } from "./types";
import { formatCurrency } from "@/lib/data";

interface Props {
  properties: SetupProperty[];
  people: Person[];
  onUpdate: (properties: SetupProperty[]) => void;
  onNext: () => void;
  onBack: () => void;
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
          Type your address, then paste your realestate.com.au URL for details
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
  const [reaUrl, setReaUrl] = useState("");
  const [reaLoading, setReaLoading] = useState(false);
  const [reaError, setReaError] = useState<string | null>(null);
  const [reaSuccess, setReaSuccess] = useState(false);

  async function fetchFromREA() {
    if (!reaUrl.trim()) return;
    setReaLoading(true);
    setReaError(null);
    setReaSuccess(false);
    try {
      const res = await fetch("/api/rea-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reaUrl.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReaError(data.error || "Failed to fetch REA page");
      } else {
        const p = data.property;
        const partial: Partial<SetupProperty> = {};
        if (p.address && !property.address) partial.address = p.address;
        if (p.suburb) partial.suburb = p.suburb;
        if (p.state) partial.state = p.state;
        if (p.postcode) partial.postcode = p.postcode;
        if (p.bedrooms) partial.bedrooms = p.bedrooms;
        if (p.bathrooms) partial.bathrooms = p.bathrooms;
        if (p.carSpaces) partial.carSpaces = p.carSpaces;
        if (p.landSize) partial.landSize = p.landSize;
        if (p.propertyType) partial.propertyType = p.propertyType;

        if (p.estimatedValue) {
          partial.estimatedValue = p.estimatedValue;
          partial.valueLow = p.estimatedValueLow || 0;
          partial.valueHigh = p.estimatedValueHigh || 0;
        } else if (p.price) {
          partial.estimatedValue = p.price;
        }
        if (p.weeklyRent && property.type === "Investment") {
          partial.weeklyRent = p.weeklyRent;
        }
        if (p.photos.length > 0) {
          partial.photos = p.photos.slice(0, 5);
        }

        onUpdate(partial);
        setReaSuccess(true);
      }
    } catch (err) {
      setReaError("Network error: " + String(err));
    }
    setReaLoading(false);
  }

  function uploadPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdate({ photos: [reader.result, ...property.photos] });
      }
    };
    reader.readAsDataURL(file);
  }

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

      {/* Simple address input */}
      <div>
        <label className="text-xs text-[var(--muted)] mb-1 block">Street address</label>
        <input
          type="text"
          value={property.address}
          onChange={(e) => onUpdate({ address: e.target.value })}
          placeholder="e.g. 60 Bagshaw Crescent"
          className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">Suburb</label>
          <input
            type="text"
            value={property.suburb}
            onChange={(e) => onUpdate({ suburb: e.target.value })}
            placeholder="Gray"
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">State</label>
          <input
            type="text"
            value={property.state}
            onChange={(e) => onUpdate({ state: e.target.value })}
            placeholder="NT"
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">Postcode</label>
          <input
            type="text"
            value={property.postcode}
            onChange={(e) => onUpdate({ postcode: e.target.value })}
            placeholder="0830"
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>
      </div>

      {/* REA URL paste (auto-fetch via ScrapingBee) */}
      {property.address && (
        <div className="space-y-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-3">
          <label className="text-xs text-[var(--muted)]">
            Got a realestate.com.au URL? (auto-fills value, photos, details)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={reaUrl}
              onChange={(e) => setReaUrl(e.target.value)}
              placeholder="https://www.realestate.com.au/property/..."
              className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded px-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
            />
            <button
              onClick={fetchFromREA}
              disabled={reaLoading || !reaUrl.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
            >
              {reaLoading ? "..." : "Fetch"}
            </button>
          </div>
          {reaError && (
            <p className="text-xs text-[var(--negative)]">{reaError}</p>
          )}
          {reaSuccess && (
            <p className="text-xs text-[var(--positive)]">Data loaded from REA</p>
          )}
        </div>
      )}

      {/* Photo */}
      {property.address && (
        <div>
          {property.photos.length > 0 ? (
            <div className="relative">
              <img
                src={property.photos[0]}
                alt={property.address}
                className="w-full h-48 object-cover rounded-lg bg-[var(--background)]"
              />
              <label className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded cursor-pointer hover:bg-black/90 transition-colors">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-[var(--card-border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors">
              <div className="text-sm text-[var(--muted)]">Upload a property photo (optional)</div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}

      {/* Manual paste fields — always available fallback */}
      {property.address && (
        <details className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg">
          <summary className="px-3 py-2 text-xs text-[var(--muted)] cursor-pointer hover:text-white">
            Or paste values manually from REA (if auto-fetch didn&apos;t work)
          </summary>
          <div className="px-3 pb-3 pt-1 space-y-2">
            <p className="text-xs text-[var(--muted)]">
              Open realestate.com.au, find your property, copy these values.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ManualField
                label="Estimated value"
                value={property.estimatedValue}
                onChange={(v) => onUpdate({ estimatedValue: v })}
                prefix="$"
                placeholder="628000"
              />
              <ManualField
                label="Weekly rent"
                value={property.weeklyRent}
                onChange={(v) => onUpdate({ weeklyRent: v })}
                prefix="$"
                suffix="/wk"
                placeholder="665"
              />
              <ManualField
                label="Low range"
                value={property.valueLow}
                onChange={(v) => onUpdate({ valueLow: v })}
                prefix="$"
                placeholder="560000"
              />
              <ManualField
                label="High range"
                value={property.valueHigh}
                onChange={(v) => onUpdate({ valueHigh: v })}
                prefix="$"
                placeholder="700000"
              />
              <ManualIntField
                label="Bedrooms"
                value={property.bedrooms}
                onChange={(v) => onUpdate({ bedrooms: v })}
                placeholder="4"
              />
              <ManualIntField
                label="Bathrooms"
                value={property.bathrooms}
                onChange={(v) => onUpdate({ bathrooms: v })}
                placeholder="2"
              />
              <ManualIntField
                label="Land size (m²)"
                value={property.landSize}
                onChange={(v) => onUpdate({ landSize: v })}
                placeholder="800"
              />
              <ManualIntField
                label="Car spaces"
                value={property.carSpaces}
                onChange={(v) => onUpdate({ carSpaces: v })}
                placeholder="2"
              />
            </div>
          </div>
        </details>
      )}

      {/* Property details preview */}
      {property.estimatedValue > 0 && (
        <div className="text-center text-sm">
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

      {(property.bedrooms || property.bathrooms || property.carSpaces || property.landSize) && (
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          {property.bedrooms !== null && <Chip label={`${property.bedrooms} bed`} />}
          {property.bathrooms !== null && <Chip label={`${property.bathrooms} bath`} />}
          {property.carSpaces !== null && <Chip label={`${property.carSpaces} car`} />}
          {property.landSize !== null && <Chip label={`${property.landSize}m²`} />}
        </div>
      )}

      {/* Type + Owner */}
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
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="bg-[var(--card-border)] rounded px-2 py-1">{label}</span>;
}

function ManualField({
  label, value, onChange, prefix, suffix, placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">{prefix}</span>
        )}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className={`w-full bg-[var(--card)] border border-[var(--card-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)] ${prefix ? "pl-5" : ""} ${suffix ? "pr-8" : ""}`}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[10px]">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ManualIntField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
          onChange(Number.isNaN(v as number) ? null : v);
        }}
        placeholder={placeholder}
        className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
