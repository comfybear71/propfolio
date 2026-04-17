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
          Upload up to 3 property documents to auto-fill the address and value, or type them in manually.
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

      {/* OCR: upload up to 3 property docs to auto-fill address + value */}
      <PropertyDocsUpload property={property} onUpdate={onUpdate} />

      {/* Address fields */}
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

      {/* Estimated value */}
      <div>
        <label className="text-xs text-[var(--muted)] mb-1 block">Estimated value (AUD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
          <input
            type="number"
            value={property.estimatedValue || ""}
            onChange={(e) => onUpdate({ estimatedValue: parseFloat(e.target.value) || 0 })}
            placeholder="628000"
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg pl-7 pr-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>
        {property.estimatedValue > 0 && (
          <div className="text-xs text-[var(--positive)] mt-1">{formatCurrency(property.estimatedValue)}</div>
        )}
      </div>

      {/* Property photo (optional) — user can upload home photos here later */}
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

const MAX_DOCS = 3;

function PropertyDocsUpload({
  property, onUpdate,
}: {
  property: SetupProperty;
  onUpdate: (partial: Partial<SetupProperty>) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const remaining = MAX_DOCS - files.length;
    const toAdd = Array.from(newFiles).slice(0, remaining);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setFiles([...files, ...toAdd]);
    setPreviews([...previews, ...newPreviews]);
    setSuccess(false);
    setError(null);
  }

  function removeFile(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    setFiles(files.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
    setSuccess(false);
    setError(null);
  }

  async function extract() {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/ocr-property", { method: "POST", body: form });
      const data = await res.json();

      if (!data.ok || !data.data) {
        setError(data.error || "Could not read documents");
      } else {
        const d = data.data;
        const partial: Partial<SetupProperty> = {};
        if (d.address) partial.address = d.address;
        if (d.suburb) partial.suburb = d.suburb;
        if (d.state) partial.state = d.state;
        if (d.postcode) partial.postcode = String(d.postcode);
        if (d.estimatedValue && Number(d.estimatedValue) > 0) {
          partial.estimatedValue = Number(d.estimatedValue);
        }
        if (Object.keys(partial).length === 0) {
          setError("No details found in the uploaded documents");
        } else {
          onUpdate(partial);
          setSuccess(true);
        }
      }
    } catch (err) {
      setError("Upload failed: " + String(err));
    }
    setLoading(false);
  }

  const canAddMore = files.length < MAX_DOCS;

  return (
    <div className="space-y-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-3">
      <div>
        <label className="text-xs text-[var(--muted)] block">
          Auto-fill from property documents (optional)
        </label>
        <p className="text-xs text-[var(--muted)] mt-1">
          Upload up to {MAX_DOCS} images (rates notice, valuation, listing, rental statement, etc.).
          We&apos;ll read the address and estimated value automatically.
        </p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded overflow-hidden border border-[var(--card-border)]">
              <img src={src} alt={`Document ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black/70 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/90"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <label className="block border-2 border-dashed border-[var(--card-border)] rounded-lg p-4 text-center cursor-pointer hover:border-[var(--accent)] transition-colors">
          <span className="text-sm text-[var(--muted)]">
            {files.length === 0 ? "Tap to choose images" : `Add another (${files.length}/${MAX_DOCS})`}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {files.length > 0 && (
        <button
          type="button"
          onClick={extract}
          disabled={loading}
          className="w-full bg-[var(--accent)] text-white rounded-lg py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          {loading ? "Reading documents..." : `Extract details from ${files.length} image${files.length === 1 ? "" : "s"}`}
        </button>
      )}

      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
      {success && <p className="text-xs text-[var(--positive)]">Details extracted — review fields below</p>}
    </div>
  );
}
