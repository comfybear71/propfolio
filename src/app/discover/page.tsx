"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatCurrency, type DiscoverProperty } from "@/lib/data";
import { useWatchlist } from "@/lib/useData";

type Tab = "search" | "swipe" | "watchlist";

export default function DiscoverPage() {
  const { watchlist, addToWatchlist, updateStatus, removeFromWatchlist, loaded: wLoaded } = useWatchlist();

  // All search results live in memory only — never saved to DB
  const [searchResults, setSearchResults] = useState<DiscoverProperty[]>([]);
  const [lastFilters, setLastFilters] = useState<Record<string, unknown> | null>(null);
  const [lastApiSource, setLastApiSource] = useState<"rapidapi" | "domain">("rapidapi");
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("search");

  const loadMoreResults = useCallback(async () => {
    if (!lastFilters || loadingMore) return;
    setLoadingMore(true);
    try {
      const endpoint = lastApiSource === "rapidapi" ? "/api/rapidapi-search" : "/api/domain-search";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lastFilters, pageNumber: nextPage, page: nextPage }),
      });
      const data = await res.json();
      if (data.ok && data.results?.length > 0) {
        setSearchResults((prev) => [...prev, ...data.results]);
        setNextPage((p) => p + 1);
      }
    } catch { /* silently fail */ }
    setLoadingMore(false);
  }, [lastFilters, lastApiSource, nextPage, loadingMore]);

  if (!wLoaded) return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "search", label: "Search" },
    { key: "swipe", label: `Swipe${searchResults.length > 0 ? ` (${searchResults.length})` : ""}` },
    { key: "watchlist", label: `Watchlist (${watchlist.filter((w) => w.status === "liked").length})` },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-1">Discover Properties</h2>
        <p className="text-[var(--muted)]">Search, swipe to like or pass — only liked properties save to your watchlist</p>
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

      {activeTab === "search" && (
        <SearchTab
          onResultsLoaded={(results, filters, apiSource) => {
            setSearchResults(results);
            setLastFilters(filters);
            setLastApiSource(apiSource);
            setNextPage(2);
            setActiveTab("swipe");
          }}
        />
      )}
      {activeTab === "swipe" && (
        <SwipeTab
          properties={searchResults}
          watchlist={watchlist}
          onLike={(p) => addToWatchlist(p, "liked")}
          onNeedMore={loadMoreResults}
          loadingMore={loadingMore}
        />
      )}
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
  onNeedMore,
  loadingMore,
}: {
  properties: DiscoverProperty[];
  watchlist: { propertyId: string }[];
  onLike: (p: DiscoverProperty) => void;
  onNeedMore?: () => void;
  loadingMore?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [showAffordability, setShowAffordability] = useState(false);
  // Animation state
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [entering, setEntering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Filter out already-liked properties (passed ones stay in the stack)
  const likedIds = new Set(watchlist.filter((w) => (w as { status?: string }).status === "liked").map((w) => w.propertyId));
  const unswiped = properties.filter((p) => !likedIds.has(p.id));

  const current = unswiped[currentIndex];
  const total = unswiped.length;

  // Auto-load more when 5 cards from the end
  useEffect(() => {
    if (total - currentIndex <= 5 && onNeedMore && !loadingMore) {
      onNeedMore();
    }
  }, [currentIndex, total, onNeedMore, loadingMore]);

  const advanceCard = useCallback(() => {
    setExitDirection(null);
    setEntering(true);
    setCurrentIndex((i) => i + 1);
    setShowAffordability(false);
    setDragX(0);
    // Remove entrance animation after it plays
    setTimeout(() => setEntering(false), 300);
  }, []);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (!current || exitDirection) return;
      if (direction === "right") onLike(current);
      // "left" = pass — no DB save, just skip
      setExitDirection(direction);
      // Wait for exit animation, then advance
      setTimeout(advanceCard, 400);
    },
    [current, onLike, exitDirection, advanceCard]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (exitDirection) return;
    setIsDragging(true);
    setStartX(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || exitDirection) return;
    setDragX(e.clientX - startX);
  };
  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragX) > 100) {
      handleSwipe(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-medium mb-2">No properties loaded</p>
        <p className="text-[var(--muted)] text-sm">Use the Search tab to find properties first</p>
      </div>
    );
  }

  if (currentIndex >= total) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🏠</p>
        <p className="text-lg font-medium mb-2">You&apos;ve seen all {total} properties</p>
        <p className="text-[var(--muted)] text-sm mb-4">Search again or check your watchlist</p>
        <button
          onClick={() => { setCurrentIndex(0); setShowAffordability(false); }}
          className="text-sm text-[#3b82f6] hover:underline"
        >
          Start over
        </button>
      </div>
    );
  }

  // Card exit transform
  const getCardStyle = (): React.CSSProperties => {
    if (exitDirection) {
      return {
        transform: `translateX(${exitDirection === "right" ? 1200 : -1200}px) rotate(${exitDirection === "right" ? 30 : -30}deg)`,
        opacity: 0,
        transition: "transform 0.4s ease-out, opacity 0.35s ease-out",
        pointerEvents: "none",
      };
    }
    if (entering) {
      return {
        animation: "cardEnter 0.3s ease-out",
      };
    }
    if (isDragging) {
      return {
        transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
        transition: "none",
      };
    }
    return {
      transform: "translateX(0) rotate(0deg)",
      transition: "transform 0.25s ease-out",
    };
  };

  const grossYield = current.price > 0 ? (current.estimatedWeeklyRent * 52) / current.price * 100 : 0;
  const isLandBuild = current.propertyType === "Land+Build";
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

  const progressPct = ((currentIndex + 1) / total) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar and counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            {currentIndex + 1} <span className="text-[var(--muted)]">of</span> {total}
          </span>
          {loadingMore && (
            <span className="text-xs text-[#3b82f6] animate-pulse">Loading more...</span>
          )}
          <span className="text-xs text-[var(--muted)]">
            Swipe right = Like &bull; Swipe left = Pass
          </span>
        </div>
        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* CSS for entrance animation */}
      <style jsx>{`
        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {/* Swipe card */}
      <div className="relative overflow-hidden rounded-xl" style={{ minHeight: "420px" }}>
        <div
          ref={cardRef}
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={getCardStyle()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Swipe indicators */}
          <div
            className="absolute top-6 left-6 z-10 bg-green-500/90 text-white px-5 py-2 rounded-lg text-xl font-bold rotate-[-12deg] transition-opacity duration-150"
            style={{ opacity: dragX > 50 ? Math.min((dragX - 50) / 100, 1) : 0 }}
          >
            LIKE ♥
          </div>
          <div
            className="absolute top-6 right-6 z-10 bg-red-500/90 text-white px-5 py-2 rounded-lg text-xl font-bold rotate-[12deg] transition-opacity duration-150"
            style={{ opacity: dragX < -50 ? Math.min((-dragX - 50) / 100, 1) : 0 }}
          >
            PASS ✕
          </div>

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
                    : current.price > 0
                      ? formatCurrency(current.price)
                      : (current as DiscoverProperty & { displayPrice?: string }).displayPrice || "Contact Agent"}
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
            {current.estimatedWeeklyRent > 0 && (
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
            )}

            {/* Affordability toggle */}
            {totalPrice > 0 && (
              <>
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
              </>
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
      </div>

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-6">
        <button
          onClick={() => handleSwipe("left")}
          disabled={!!exitDirection}
          className="w-16 h-16 rounded-full bg-[var(--card)] border-2 border-[#ef4444] text-[#ef4444] text-2xl font-bold hover:bg-[#ef4444] hover:text-white transition-all duration-200 flex items-center justify-center active:scale-90 disabled:opacity-50"
          title="Pass"
        >
          ✕
        </button>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{currentIndex + 1}</div>
          <div className="text-xs text-[var(--muted)]">of {total}</div>
        </div>
        <button
          onClick={() => handleSwipe("right")}
          disabled={!!exitDirection}
          className="w-16 h-16 rounded-full bg-[var(--card)] border-2 border-[#22c55e] text-[#22c55e] text-2xl hover:bg-[#22c55e] hover:text-white transition-all duration-200 flex items-center justify-center active:scale-90 disabled:opacity-50"
          title="Like — saves to watchlist"
        >
          ♥
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-[var(--muted)]">
        Tip: Drag the card or tap the buttons
      </p>
    </div>
  );
}

/* ─── SEARCH API TAB ───────────────────────────────────────────── */

function SearchTab({ onResultsLoaded }: { onResultsLoaded: (results: DiscoverProperty[], filters: Record<string, unknown>, apiSource: "rapidapi" | "domain") => void }) {
  const [apiSource, setApiSource] = useState<"rapidapi" | "domain">("rapidapi");
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

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = apiSource === "rapidapi" ? "/api/rapidapi-search" : "/api/domain-search";
      const res = await fetch(endpoint, {
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
      if (data.results?.length === 0) setError("No results found. Try a different suburb or broader filters.");
    } catch {
      setError("Failed to connect to search API");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#0a0a0a] border border-[var(--border)] rounded px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Search Properties</h3>
          <div className="flex gap-1 bg-[#0a0a0a] rounded-lg p-0.5 border border-[var(--border)]">
            <button
              onClick={() => setApiSource("rapidapi")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                apiSource === "rapidapi" ? "bg-[#3b82f6] text-white" : "text-[var(--muted)] hover:text-white"
              }`}
            >
              realestate.com.au
            </button>
            <button
              onClick={() => setApiSource("domain")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                apiSource === "domain" ? "bg-[#3b82f6] text-white" : "text-[var(--muted)] hover:text-white"
              }`}
            >
              Domain
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {apiSource === "rapidapi"
            ? "Search listings from realestate.com.au via RapidAPI. Enter a suburb name for best results."
            : "Search listings from domain.com.au. Requires Agents & Listings API access."}
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

      {/* Results preview */}
      {results.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => onResultsLoaded(results, filters, apiSource)}
            className="w-full bg-[#22c55e] text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
          >
            Start Swiping {results.length} Properties &rarr;
          </button>
          <h4 className="font-medium text-sm text-[var(--muted)]">{results.length} results preview</h4>
          {results.slice(0, 5).map((p) => (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.address}
                  className="w-24 h-24 object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={`w-24 h-24 bg-[var(--border)] flex items-center justify-center text-2xl flex-shrink-0 ${p.imageUrl ? "hidden" : ""}`}>
                🏠
              </div>
              <div className="p-2 flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.address || p.suburb}</p>
                <p className="text-xs text-[var(--muted)]">{p.suburb}, {p.state} {p.postcode}</p>
                <p className="text-sm font-bold text-[#3b82f6]">
                  {p.price > 0 ? formatCurrency(p.price) : (p as DiscoverProperty & { displayPrice?: string }).displayPrice || "Contact Agent"}
                </p>
                <div className="flex gap-3 text-xs text-[var(--muted)]">
                  {p.bedrooms != null && <span>{p.bedrooms} bed</span>}
                  {p.bathrooms != null && <span>{p.bathrooms} bath</span>}
                  {p.carSpaces != null && <span>{p.carSpaces} car</span>}
                </div>
              </div>
            </div>
          ))}
          {results.length > 5 && (
            <p className="text-xs text-center text-[var(--muted)]">+ {results.length - 5} more — start swiping to see all</p>
          )}
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
              {grossYield > 0 && (
                <span className={`text-xs font-bold ${grossYield >= 7 ? "text-[#22c55e]" : grossYield >= 5 ? "text-yellow-400" : "text-[#ef4444]"}`}>
                  {grossYield.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-[#3b82f6] mt-1">{formatCurrency(totalPrice)}</p>
            <div className="grid grid-cols-3 gap-1 text-xs mt-2 text-[var(--muted)]">
              {p.estimatedWeeklyRent > 0 && <span>Rent: ${p.estimatedWeeklyRent}/wk</span>}
              <span>Stamp: {formatCurrency(stampDuty)}</span>
              {buildBonus > 0 && <span className="text-[#22c55e]">Bonus: -{formatCurrency(buildBonus)}</span>}
            </div>
            {p.estimatedWeeklyRent > 0 && (
              <p className={`text-xs font-medium mt-1 ${weeklyCashFlow >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                Cash flow: {weeklyCashFlow >= 0 ? "+" : ""}{formatCurrency(weeklyCashFlow)}/wk
              </p>
            )}
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
      {passed.length > 0 && (
        <div>
          <button
            onClick={() => setShowPassed(!showPassed)}
            className="text-sm text-[var(--muted)] hover:text-white"
          >
            {showPassed ? "Hide" : "Show"} passed properties ({passed.length})
          </button>
          {showPassed && (
            <div className="space-y-3 mt-3">{passed.map(renderCard)}</div>
          )}
        </div>
      )}
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
  if (value <= 525000) return value * 0.06571 * (1.05 - value * 0.00000095238);
  return value * 0.0495;
}
