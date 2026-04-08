"use client";

import { useState, useCallback } from "react";
import { formatCurrency, type DiscoverProperty } from "@/lib/data";
import { useDiscover, useWatchlist } from "@/lib/useData";

type Tab = "swipe" | "add" | "search" | "watchlist";

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const { discoverProperties, addProperty, loaded: dLoaded } = useDiscover();
  const { watchlist, addToWatchlist, updateStatus, removeFromWatchlist, loaded: wLoaded } = useWatchlist();

  if (!dLoaded || !wLoaded) return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "swipe", label: "Swipe" },
    { key: "add", label: "Add Property" },
    { key: "search", label: "Search API" },
    { key: "watchlist", label: `Watchlist (${watchlist.filter((w) => w.status === "liked").length})` },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Discover Properties</h2>
        <p className="text-[var(--muted)]">Swipe through properties, search the Domain API, or add your own finds</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--card)] rounded-lg p-1 border border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-[#3b82f6] text-white"
                : "text-[var(--muted)] hover:text-white hover:bg-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "swipe" && (
        <SwipeTab
          properties={discoverProperties}
          watchlist={watchlist}
          onLike={(p) => addToWatchlist(p, "liked")}
          onPass={(p) => addToWatchlist(p, "passed")}
        />
      )}
      {activeTab === "add" && <AddPropertyTab onAdd={addProperty} />}
      {activeTab === "search" && <SearchTab onImport={addProperty} />}
      {activeTab === "watchlist" && (
        <WatchlistTab
          watchlist={watchlist}
          onUpdateStatus={updateStatus}
          onRemove={removeFromWatchlist}
        />
      )}
    </div>
  );
}

/* ─── SWIPE TAB ────────────────────────────────────────────────── */

function SwipeTab({
  properties,
  watchlist,
  onLike,
  onPass,
}: {
  properties: DiscoverProperty[];
  watchlist: { propertyId: string }[];
  onLike: (p: DiscoverProperty) => void;
  onPass: (p: DiscoverProperty) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [showAffordability, setShowAffordability] = useState(false);

  // Filter out already-swiped properties
  const swipedIds = new Set(watchlist.map((w) => w.propertyId));
  const unswiped = properties.filter((p) => !swipedIds.has(p.id));

  const current = unswiped[currentIndex];

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (!current) return;
      if (direction === "right") onLike(current);
      else onPass(current);
      setCurrentIndex((i) => Math.min(i + 1, unswiped.length));
      setDragX(0);
      setShowAffordability(false);
    },
    [current, onLike, onPass, unswiped.length]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX);
  };
  const onPointerUp = () => {
    setIsDragging(false);
    if (Math.abs(dragX) > 100) {
      handleSwipe(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };

  if (unswiped.length === 0 || currentIndex >= unswiped.length) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🏠</p>
        <p className="text-lg font-medium mb-2">No more properties to swipe</p>
        <p className="text-[var(--muted)] text-sm">Add properties manually or search via the Domain API</p>
      </div>
    );
  }

  const grossYield = current.price > 0 ? (current.estimatedWeeklyRent * 52) / current.price * 100 : 0;
  const isLandBuild = current.propertyType === "Land+Build";

  // Affordability calculations
  const totalPrice = isLandBuild ? (current.landPrice || 0) + (current.buildCost || 0) : current.price;
  const deposit20 = totalPrice * 0.2;
  const loanAmount = totalPrice - deposit20;
  const buildBonus = current.state === "NT" ? 30000 : 0;
  const stampDuty = isLandBuild ? calcStampDutyNT(current.landPrice || 0) : calcStampDutyNT(totalPrice);
  const netDeposit = deposit20 + stampDuty - buildBonus;
  const monthlyRate = 0.065 / 12;
  const numPayments = 30 * 12;
  const monthlyRepayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const weeklyCashFlow = current.estimatedWeeklyRent - (monthlyRepayment * 12) / 52;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted)] text-center">
        {currentIndex + 1} of {unswiped.length} &bull; Drag or use buttons below
      </p>

      {/* Swipe card */}
      <div
        className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
          transition: isDragging ? "none" : "transform 0.3s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Swipe indicators */}
        {dragX > 50 && (
          <div className="absolute top-6 left-6 z-10 bg-green-500/90 text-white px-4 py-2 rounded-lg text-lg font-bold rotate-[-12deg]">
            LIKE
          </div>
        )}
        {dragX < -50 && (
          <div className="absolute top-6 right-6 z-10 bg-red-500/90 text-white px-4 py-2 rounded-lg text-lg font-bold rotate-[12deg]">
            PASS
          </div>
        )}

        {/* Property image */}
        {current.imageUrl ? (
          <div className="h-56 bg-[var(--border)] overflow-hidden">
            <img
              src={current.imageUrl}
              alt={current.address}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div className="h-56 bg-[var(--border)] flex items-center justify-center text-[var(--muted)] text-4xl">
            🏠
          </div>
        )}

        {/* Property details */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{current.address}</h3>
              <p className="text-sm text-[var(--muted)]">
                {current.suburb}, {current.state} {current.postcode}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#3b82f6]">
                {isLandBuild
                  ? formatCurrency((current.landPrice || 0) + (current.buildCost || 0))
                  : formatCurrency(current.price)}
              </p>
              {isLandBuild && (
                <p className="text-xs text-[var(--muted)]">
                  Land {formatCurrency(current.landPrice || 0)} + Build {formatCurrency(current.buildCost || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Specs row */}
          <div className="flex gap-4 text-sm">
            {current.bedrooms != null && <span>{current.bedrooms} bed</span>}
            {current.bathrooms != null && <span>{current.bathrooms} bath</span>}
            {current.carSpaces != null && <span>{current.carSpaces} car</span>}
            {current.landSize != null && <span>{current.landSize} m&sup2;</span>}
            {current.yearBuilt != null && <span>Built {current.yearBuilt}</span>}
            <span className="text-[var(--muted)]">{current.propertyType}</span>
          </div>

          {/* Yield */}
          <div className="flex items-center gap-4 text-sm">
            <span>
              Est. rent: <strong>${current.estimatedWeeklyRent}/wk</strong>
            </span>
            <span
              className={`font-bold ${grossYield >= 7 ? "text-[#22c55e]" : grossYield >= 5 ? "text-yellow-400" : "text-[#ef4444]"}`}
            >
              {grossYield.toFixed(1)}% yield
            </span>
          </div>

          {/* Affordability toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAffordability(!showAffordability); }}
            className="text-xs text-[#3b82f6] hover:underline"
          >
            {showAffordability ? "Hide" : "Show"} affordability check
          </button>

          {showAffordability && (
            <div className="bg-[#0a0a0a] rounded-lg p-3 text-xs space-y-1 border border-[var(--border)]">
              <Row label="20% Deposit" value={formatCurrency(deposit20)} />
              <Row label="Stamp Duty (land only)" value={formatCurrency(stampDuty)} />
              {buildBonus > 0 && <Row label="NT BuildBonus" value={`-${formatCurrency(buildBonus)}`} positive />}
              <Row label="Net Cash Needed" value={formatCurrency(netDeposit)} />
              <div className="border-t border-[var(--border)] my-1" />
              <Row label="Loan Amount" value={formatCurrency(loanAmount)} />
              <Row label="Monthly Repayment (6.5%, 30yr)" value={formatCurrency(monthlyRepayment)} />
              <Row
                label="Weekly Cash Flow"
                value={`${weeklyCashFlow >= 0 ? "+" : ""}${formatCurrency(weeklyCashFlow)}/wk`}
                positive={weeklyCashFlow >= 0}
                negative={weeklyCashFlow < 0}
              />
            </div>
          )}

          {/* Listing link */}
          {current.listingUrl && (
            <a
              href={current.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#3b82f6] hover:underline block"
              onClick={(e) => e.stopPropagation()}
            >
              View original listing &rarr;
            </a>
          )}

          {current.notes && (
            <p className="text-xs text-[var(--muted)] italic">{current.notes}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-8">
        <button
          onClick={() => handleSwipe("left")}
          className="w-16 h-16 rounded-full bg-[var(--card)] border-2 border-[#ef4444] text-[#ef4444] text-2xl font-bold hover:bg-[#ef4444] hover:text-white transition-colors flex items-center justify-center"
          title="Pass"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipe("right")}
          className="w-16 h-16 rounded-full bg-[var(--card)] border-2 border-[#22c55e] text-[#22c55e] text-2xl hover:bg-[#22c55e] hover:text-white transition-colors flex items-center justify-center"
          title="Like"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

/* ─── ADD PROPERTY TAB ─────────────────────────────────────────── */

function AddPropertyTab({ onAdd }: { onAdd: (p: DiscoverProperty) => void }) {
  const [form, setForm] = useState({
    address: "",
    suburb: "",
    state: "NT",
    postcode: "",
    price: 0,
    propertyType: "House" as DiscoverProperty["propertyType"],
    bedrooms: 4,
    bathrooms: 4,
    carSpaces: 2,
    landSize: 0,
    buildingSize: 0,
    yearBuilt: 0,
    estimatedWeeklyRent: 1050,
    imageUrl: "",
    listingUrl: "",
    notes: "",
    landPrice: 0,
    buildCost: 0,
  });
  const [saved, setSaved] = useState(false);

  const isLandBuild = form.propertyType === "Land+Build";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const property: DiscoverProperty = {
      id: `manual-${Date.now()}`,
      ...form,
      bedrooms: form.bedrooms || null,
      bathrooms: form.bathrooms || null,
      carSpaces: form.carSpaces || null,
      landSize: form.landSize || null,
      buildingSize: form.buildingSize || null,
      yearBuilt: form.yearBuilt || null,
      landPrice: isLandBuild ? form.landPrice : null,
      buildCost: isLandBuild ? form.buildCost : null,
      price: isLandBuild ? form.landPrice + form.buildCost : form.price,
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    onAdd(property);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setForm({
      address: "", suburb: "", state: "NT", postcode: "", price: 0,
      propertyType: "House", bedrooms: 4, bathrooms: 4, carSpaces: 2,
      landSize: 0, buildingSize: 0, yearBuilt: 0, estimatedWeeklyRent: 1050,
      imageUrl: "", listingUrl: "", notes: "", landPrice: 0, buildCost: 0,
    });
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-[var(--muted)] mb-1">{label}</label>
      {children}
    </div>
  );

  const inputClass = "w-full bg-[#0a0a0a] border border-[var(--border)] rounded px-3 py-2 text-sm text-white";

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <h3 className="font-bold text-lg">Add a Property</h3>
      <p className="text-xs text-[var(--muted)]">
        Found something on realestate.com.au or Domain? Add it here. Defaults are set for your 4-bed ensuite new build model.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Address">
          <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
        </Field>
        <Field label="Suburb">
          <input className={inputClass} value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} required />
        </Field>
        <Field label="State">
          <select className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
            {["NT", "QLD", "WA", "SA", "NSW", "VIC", "TAS", "ACT"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Postcode">
          <input className={inputClass} value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
        </Field>
      </div>

      <Field label="Property Type">
        <select
          className={inputClass}
          value={form.propertyType}
          onChange={(e) => setForm({ ...form, propertyType: e.target.value as DiscoverProperty["propertyType"] })}
        >
          <option value="House">House</option>
          <option value="Unit">Unit / Apartment</option>
          <option value="Land">Vacant Land</option>
          <option value="Land+Build">Land + Build Package</option>
          <option value="Townhouse">Townhouse</option>
        </select>
      </Field>

      {isLandBuild ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Land Price ($)">
            <input type="number" className={inputClass} value={form.landPrice || ""} onChange={(e) => setForm({ ...form, landPrice: +e.target.value })} />
          </Field>
          <Field label="Build Cost ($)">
            <input type="number" className={inputClass} value={form.buildCost || ""} onChange={(e) => setForm({ ...form, buildCost: +e.target.value })} />
          </Field>
        </div>
      ) : (
        <Field label="Price ($)">
          <input type="number" className={inputClass} value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })} required />
        </Field>
      )}

      <div className="grid grid-cols-4 gap-3">
        <Field label="Beds">
          <input type="number" className={inputClass} value={form.bedrooms || ""} onChange={(e) => setForm({ ...form, bedrooms: +e.target.value })} />
        </Field>
        <Field label="Baths">
          <input type="number" className={inputClass} value={form.bathrooms || ""} onChange={(e) => setForm({ ...form, bathrooms: +e.target.value })} />
        </Field>
        <Field label="Cars">
          <input type="number" className={inputClass} value={form.carSpaces || ""} onChange={(e) => setForm({ ...form, carSpaces: +e.target.value })} />
        </Field>
        <Field label="Land m&sup2;">
          <input type="number" className={inputClass} value={form.landSize || ""} onChange={(e) => setForm({ ...form, landSize: +e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Est. Weekly Rent ($)">
          <input type="number" className={inputClass} value={form.estimatedWeeklyRent || ""} onChange={(e) => setForm({ ...form, estimatedWeeklyRent: +e.target.value })} />
        </Field>
        <Field label="Year Built">
          <input type="number" className={inputClass} placeholder="e.g. 2026" value={form.yearBuilt || ""} onChange={(e) => setForm({ ...form, yearBuilt: +e.target.value })} />
        </Field>
      </div>

      <Field label="Image URL (paste from listing)">
        <input className={inputClass} placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
      </Field>
      <Field label="Listing URL">
        <input className={inputClass} placeholder="https://www.realestate.com.au/..." value={form.listingUrl} onChange={(e) => setForm({ ...form, listingUrl: e.target.value })} />
      </Field>
      <Field label="Notes / Suburb Research">
        <textarea
          className={inputClass + " h-20"}
          placeholder="e.g. High yield mining town, close to amenities..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>

      <button
        type="submit"
        className="w-full bg-[#3b82f6] text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
      >
        {saved ? "Added!" : "Add to Discover Stack"}
      </button>
    </form>
  );
}

/* ─── SEARCH API TAB ───────────────────────────────────────────── */

function SearchTab({ onImport }: { onImport: (p: DiscoverProperty) => void }) {
  const [filters, setFilters] = useState({
    state: "NT",
    suburb: "",
    postcode: "",
    minPrice: 0,
    maxPrice: 600000,
    propertyTypes: ["House"],
    minBedrooms: 3,
    minBathrooms: 0,
    pageSize: 20,
    pageNumber: 1,
  });
  const [results, setResults] = useState<DiscoverProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/domain-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Search failed");
        return;
      }
      setResults(data.results || []);
    } catch {
      setError("Failed to connect to search API");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (p: DiscoverProperty) => {
    onImport(p);
    setImported((prev) => new Set(prev).add(p.id));
  };

  const inputClass = "w-full bg-[#0a0a0a] border border-[var(--border)] rounded px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-lg">Search Domain API</h3>
        <p className="text-xs text-[var(--muted)]">
          Search listings from domain.com.au. Requires DOMAIN_API_KEY in your environment variables.
          {" "}Sign up at developer.domain.com.au for free.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">State</label>
            <select className={inputClass} value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>
              {["NT", "QLD", "WA", "SA", "NSW", "VIC", "TAS", "ACT"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Suburb</label>
            <input className={inputClass} placeholder="e.g. Gray" value={filters.suburb} onChange={(e) => setFilters({ ...filters, suburb: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Postcode</label>
            <input className={inputClass} placeholder="e.g. 0830" value={filters.postcode} onChange={(e) => setFilters({ ...filters, postcode: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Min Price</label>
            <input type="number" className={inputClass} value={filters.minPrice || ""} onChange={(e) => setFilters({ ...filters, minPrice: +e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Max Price</label>
            <input type="number" className={inputClass} value={filters.maxPrice || ""} onChange={(e) => setFilters({ ...filters, maxPrice: +e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Min Beds</label>
            <input type="number" className={inputClass} value={filters.minBedrooms || ""} onChange={(e) => setFilters({ ...filters, minBedrooms: +e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Property Type</label>
          <div className="flex gap-2 flex-wrap">
            {["House", "ApartmentUnitFlat", "Townhouse", "VacantLand"].map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => {
                  const has = filters.propertyTypes.includes(pt);
                  setFilters({
                    ...filters,
                    propertyTypes: has
                      ? filters.propertyTypes.filter((t) => t !== pt)
                      : [...filters.propertyTypes, pt],
                  });
                }}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filters.propertyTypes.includes(pt)
                    ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-white"
                }`}
              >
                {pt === "ApartmentUnitFlat" ? "Unit" : pt === "VacantLand" ? "Land" : pt}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#3b82f6] text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search Listings"}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-[var(--muted)]">{results.length} results</h4>
          {results.map((p) => (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.address} className="w-32 h-32 object-cover flex-shrink-0" />
              ) : (
                <div className="w-32 h-32 bg-[var(--border)] flex items-center justify-center text-2xl flex-shrink-0">🏠</div>
              )}
              <div className="p-3 flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.address}</p>
                <p className="text-xs text-[var(--muted)]">{p.suburb}, {p.state} {p.postcode}</p>
                <p className="text-sm font-bold text-[#3b82f6] mt-1">{formatCurrency(p.price)}</p>
                <div className="flex gap-3 text-xs text-[var(--muted)] mt-1">
                  {p.bedrooms != null && <span>{p.bedrooms} bed</span>}
                  {p.bathrooms != null && <span>{p.bathrooms} bath</span>}
                  {p.carSpaces != null && <span>{p.carSpaces} car</span>}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleImport(p)}
                    disabled={imported.has(p.id)}
                    className="text-xs bg-[#3b82f6] text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {imported.has(p.id) ? "Imported" : "Import"}
                  </button>
                  {p.listingUrl && (
                    <a
                      href={p.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#3b82f6] hover:underline py-1"
                    >
                      View &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── WATCHLIST TAB ────────────────────────────────────────────── */

function WatchlistTab({
  watchlist,
  onUpdateStatus,
  onRemove,
}: {
  watchlist: { id: string; propertyId: string; property: DiscoverProperty; status: string; notes: string; createdAt: string }[];
  onUpdateStatus: (id: string, status: "liked" | "passed") => void;
  onRemove: (id: string) => void;
}) {
  const [showPassed, setShowPassed] = useState(false);

  const liked = watchlist.filter((w) => w.status === "liked");
  const passed = watchlist.filter((w) => w.status === "passed");

  const renderCard = (item: typeof watchlist[0]) => {
    const p = item.property;
    const grossYield = p.price > 0 ? (p.estimatedWeeklyRent * 52) / p.price * 100 : 0;
    const isLandBuild = p.propertyType === "Land+Build";
    const totalPrice = isLandBuild ? (p.landPrice || 0) + (p.buildCost || 0) : p.price;
    const loanAmount = totalPrice * 0.8;
    const monthlyRate = 0.065 / 12;
    const numPayments = 30 * 12;
    const monthlyRepayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const weeklyCashFlow = p.estimatedWeeklyRent - (monthlyRepayment * 12) / 52;
    const buildBonus = p.state === "NT" ? 30000 : 0;
    const stampDuty = isLandBuild ? calcStampDutyNT(p.landPrice || 0) : calcStampDutyNT(totalPrice);

    return (
      <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.address} className="w-36 h-36 object-cover flex-shrink-0" />
          ) : (
            <div className="w-36 h-36 bg-[var(--border)] flex items-center justify-center text-3xl flex-shrink-0">🏠</div>
          )}
          <div className="p-3 flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm truncate">{p.address}</p>
                <p className="text-xs text-[var(--muted)]">{p.suburb}, {p.state} {p.postcode}</p>
              </div>
              <span className={`text-xs font-bold ${grossYield >= 7 ? "text-[#22c55e]" : grossYield >= 5 ? "text-yellow-400" : "text-[#ef4444]"}`}>
                {grossYield.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-bold text-[#3b82f6] mt-1">{formatCurrency(totalPrice)}</p>
            <div className="grid grid-cols-3 gap-1 text-xs mt-2 text-[var(--muted)]">
              <span>Rent: ${p.estimatedWeeklyRent}/wk</span>
              <span>Stamp: {formatCurrency(stampDuty)}</span>
              {buildBonus > 0 && <span className="text-[#22c55e]">Bonus: -{formatCurrency(buildBonus)}</span>}
            </div>
            <p className={`text-xs font-medium mt-1 ${weeklyCashFlow >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              Cash flow: {weeklyCashFlow >= 0 ? "+" : ""}{formatCurrency(weeklyCashFlow)}/wk
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-3 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            {item.status === "liked" ? (
              <button onClick={() => onUpdateStatus(item.id, "passed")} className="text-xs text-[var(--muted)] hover:text-[#ef4444]">
                Move to Passed
              </button>
            ) : (
              <button onClick={() => onUpdateStatus(item.id, "liked")} className="text-xs text-[var(--muted)] hover:text-[#22c55e]">
                Move to Liked
              </button>
            )}
            <button onClick={() => onRemove(item.id)} className="text-xs text-[var(--muted)] hover:text-[#ef4444]">
              Remove
            </button>
          </div>
          {p.listingUrl && (
            <a href={p.listingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3b82f6] hover:underline">
              View listing &rarr;
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Liked */}
      <div>
        <h3 className="font-bold text-lg mb-3">
          Liked Properties <span className="text-[var(--muted)] text-sm font-normal">({liked.length})</span>
        </h3>
        {liked.length === 0 ? (
          <p className="text-sm text-[var(--muted)] py-8 text-center">No liked properties yet. Start swiping!</p>
        ) : (
          <div className="space-y-3">{liked.map(renderCard)}</div>
        )}
      </div>

      {/* Passed */}
      <div>
        <button
          onClick={() => setShowPassed(!showPassed)}
          className="text-sm text-[var(--muted)] hover:text-white"
        >
          {showPassed ? "Hide" : "Show"} passed properties ({passed.length})
        </button>
        {showPassed && passed.length > 0 && (
          <div className="space-y-3 mt-3">{passed.map(renderCard)}</div>
        )}
      </div>
    </div>
  );
}

/* ─── HELPERS ──────────────────────────────────────────────────── */

function Row({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={positive ? "text-[#22c55e]" : negative ? "text-[#ef4444]" : ""}>{value}</span>
    </div>
  );
}

function calcStampDutyNT(value: number): number {
  // NT stamp duty brackets (on land value for new builds)
  if (value <= 525000) return value * 0.06571 * (1.05 - value * 0.00000095238);
  return value * 0.0495;
}
