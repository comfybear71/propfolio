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

interface PlacesPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
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
  const [predictions, setPredictions] = useState<PlacesPrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiReturnedValue, setApiReturnedValue] = useState(false);
  const [streetViewError, setStreetViewError] = useState(false);
  const [reaUrl, setReaUrl] = useState("");
  const [reaLoading, setReaLoading] = useState(false);
  const [reaError, setReaError] = useState<string | null>(null);
  const [showReaPaste, setShowReaPaste] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  async function fetchFromREA() {
    if (!reaUrl.trim()) return;
    setReaLoading(true);
    setReaError(null);
    try {
      const res = await fetch("/api/rea-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reaUrl.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReaError(data.error || "Failed to fetch REA listing");
      } else {
        const p = data.property;
        // Merge — only fill blanks, don't overwrite what user already entered
        const partial: Partial<SetupProperty> = {};
        if (p.address && !property.address) partial.address = p.address;
        if (p.suburb && !property.suburb) partial.suburb = p.suburb;
        if (p.state && !property.state) partial.state = p.state;
        if (p.postcode && !property.postcode) partial.postcode = p.postcode;
        if (p.bedrooms && !property.bedrooms) partial.bedrooms = p.bedrooms;
        if (p.bathrooms && !property.bathrooms) partial.bathrooms = p.bathrooms;
        if (p.carSpaces && !property.carSpaces) partial.carSpaces = p.carSpaces;
        if (p.landSize && !property.landSize) partial.landSize = p.landSize;
        if (p.propertyType && !property.propertyType) partial.propertyType = p.propertyType;
        // Estimated value from REA's own range (if available)
        if (p.estimatedValueHigh && !property.estimatedValue) {
          partial.estimatedValue = Math.round((p.estimatedValueLow + p.estimatedValueHigh) / 2);
          partial.valueLow = p.estimatedValueLow;
          partial.valueHigh = p.estimatedValueHigh;
          setApiReturnedValue(true);
        } else if (p.price && !property.estimatedValue) {
          partial.estimatedValue = p.price;
          setApiReturnedValue(true);
        }
        // Prefer REA photos if available (they're better than Street View)
        if (p.photos.length > 0) {
          partial.photos = p.photos.slice(0, 5);
        }
        onUpdate(partial);
        setReaUrl("");
        setShowReaPaste(false);
      }
    } catch (err) {
      setReaError("Network error: " + String(err));
    }
    setReaLoading(false);
  }

  // Google Places autocomplete
  useEffect(() => {
    if (query.length < 3) { setPredictions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.ok && data.predictions) {
          setPredictions(data.predictions);
          setShowSuggestions(true);
        }
      } catch { /* ignore */ }
    }, 250);
  }, [query]);

  async function selectAddress(prediction: PlacesPrediction) {
    setShowSuggestions(false);
    setLoading(true);
    setStreetViewError(false);
    setQuery(prediction.description);

    // Save the displayed address immediately
    onUpdate({
      googlePlaceId: prediction.placeId,
      address: prediction.mainText || prediction.description,
    });

    // Fetch place details to get lat/lng + structured components
    try {
      const res = await fetch(`/api/places-details?placeId=${encodeURIComponent(prediction.placeId)}`);
      const data = await res.json();
      if (data.ok) {
        const fullStreet = [data.streetNumber, data.streetName].filter(Boolean).join(" ");
        const photoUrl = data.lat && data.lng
          ? `/api/streetview?lat=${data.lat}&lng=${data.lng}&size=800x500`
          : "";

        onUpdate({
          googlePlaceId: data.placeId,
          address: fullStreet || prediction.mainText,
          suburb: data.suburb || "",
          state: data.state || "",
          postcode: data.postcode || "",
          lat: data.lat,
          lng: data.lng,
          photos: photoUrl ? [photoUrl] : [],
        });

        // Verify Street View is actually available for this location
        if (data.lat && data.lng) {
          try {
            const svCheck = await fetch(`/api/streetview?lat=${data.lat}&lng=${data.lng}&metadata=1`);
            const svData = await svCheck.json();
            if (!svData.available) {
              setStreetViewError(true);
              onUpdate({ photos: [] });
            }
          } catch { /* assume available */ }
        }
      }
    } catch { /* place details failed — address still saved */ }
    setLoading(false);
  }

  function clearAddress() {
    setQuery("");
    setPredictions([]);
    setStreetViewError(false);
    onUpdate({
      googlePlaceId: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
      lat: null,
      lng: null,
      photos: [],
    });
  }

  function uploadPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdate({ photos: [reader.result, ...property.photos.filter(p => !p.startsWith("/api/streetview"))] });
      }
    };
    reader.readAsDataURL(file);
  }

  const hasDetails = property.estimatedValue > 0;

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

      {/* Address search — Google Places */}
      <div className="relative">
        <input
          type="text"
          value={property.googlePlaceId ? `${property.address}, ${property.suburb} ${property.state} ${property.postcode}` : query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            // If user starts typing again, clear the saved address
            if (property.googlePlaceId) {
              clearAddress();
              setQuery(val);
            }
          }}
          onBlur={() => {
            // If user typed without selecting, accept manual entry
            if (!property.googlePlaceId && !property.address && query.trim().length >= 5) {
              onUpdate({ address: query.trim() });
            }
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="Start typing your address..."
          className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:border-[var(--accent)] outline-none"
        />
        {showSuggestions && predictions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {predictions.map((p) => (
              <button
                key={p.placeId}
                onClick={() => selectAddress(p)}
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--accent)]/10 transition-colors border-b border-[var(--card-border)] last:border-0"
              >
                <div className="text-sm font-medium">{p.mainText}</div>
                <div className="text-xs text-[var(--muted)]">{p.secondaryText}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* REA URL paste — optional accordion */}
      {property.address && (
        <div>
          {!showReaPaste ? (
            <button
              onClick={() => setShowReaPaste(true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              + Got a realestate.com.au URL? Paste it for richer details
            </button>
          ) : (
            <div className="space-y-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--muted)]">
                  Paste realestate.com.au property URL
                </label>
                <button
                  onClick={() => { setShowReaPaste(false); setReaUrl(""); setReaError(null); }}
                  className="text-xs text-[var(--muted)] hover:text-white"
                >
                  cancel
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={reaUrl}
                  onChange={(e) => setReaUrl(e.target.value)}
                  placeholder="https://www.realestate.com.au/property-..."
                  className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded px-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
                />
                <button
                  onClick={fetchFromREA}
                  disabled={reaLoading || !reaUrl.trim()}
                  className="px-3 py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
                >
                  {reaLoading ? "..." : "Fetch"}
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Find your property on realestate.com.au and copy the URL. We&apos;ll fill in beds, baths, value, and photos.
              </p>
              {reaError && (
                <p className="text-xs text-[var(--negative)]">{reaError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-sm text-[var(--accent)] animate-pulse text-center py-2">
          Looking up address...
        </div>
      )}

      {/* Property photo (Street View or uploaded) + upload control */}
      {property.address && !loading && (
        <div className="space-y-2">
          {property.photos.length > 0 ? (
            <div className="relative">
              <img
                src={property.photos[0]}
                alt={property.address}
                className="w-full h-48 object-cover rounded-lg bg-[var(--background)]"
                onError={() => setStreetViewError(true)}
              />
              <label className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded cursor-pointer hover:bg-black/90 transition-colors">
                Upload photo
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
              <div className="text-sm text-[var(--muted)]">
                {streetViewError
                  ? "No Street View available for this address — upload a photo"
                  : "Upload a property photo (optional)"}
              </div>
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

      {/* Property details (Google Places gives us nothing about beds/baths/value — all manual) */}
      {hasDetails && !loading && (
        <div className="space-y-3">
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

      {/* Manual value entry — always shown when API didn't provide value */}
      {property.address && !apiReturnedValue && !loading && (
        <div>
          <label className="text-xs text-[var(--muted)]">Estimated property value</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
            <input
              type="number"
              value={property.estimatedValue || ""}
              onChange={(e) => onUpdate({ estimatedValue: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 550000"
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--accent)] pl-7"
            />
          </div>
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
