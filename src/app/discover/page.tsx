"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatCurrency, type DiscoverProperty } from "@/lib/data";
import { useWatchlist } from "@/lib/useData";

type Tab = "search" | "swipe" | "watchlist";
type DiscoverMode = "home" | "investment";

export default function DiscoverPage() {
  const { watchlist, addToWatchlist, updateStatus, removeFromWatchlist, loaded: wLoaded } = useWatchlist();

  // All search results live in memory only — never saved to DB
  const [searchResults, setSearchResults] = useState<DiscoverProperty[]>([]);
  const [lastFilters, setLastFilters] = useState<Record<string, unknown> | null>(null);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [mode, setMode] = useState<DiscoverMode>("investment");

  // Enrich a batch of properties with median rent for yield calculation (Investment mode only)
  const enrichWithRent = useCallback(async (properties: DiscoverProperty[]): Promise<DiscoverProperty[]> => {
    if (mode !== "investment") return properties;
    // Group by suburb + bedrooms to minimise API calls
    const groups = new Map<string, DiscoverProperty[]>();
    for (const p of properties) {
      if (!p.suburb || p.estimatedWeeklyRent > 0) continue;
      const key = `${p.suburb}|${p.state}|${p.postcode}|${p.bedrooms ?? "any"}|${p.propertyType || "house"}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    // Fetch median rent for each group in parallel
    const results = await Promise.all(
      Array.from(groups.entries()).map(async ([key, group]) => {
        const [suburb, state, postcode, bedrooms, propertyType] = key.split("|");
        try {
          const params = new URLSearchParams({ suburb, state, postcode });
          if (bedrooms !== "any") params.set("bedrooms", bedrooms);
          params.set("propertyType", propertyType.toLowerCase());
          const res = await fetch(`/api/rental-median?${params.toString()}`);
          const data = await res.json();
          if (data.ok && data.median > 0) {
            group.forEach((p) => { p.estimatedWeeklyRent = data.median; });
          }
        } catch { /* silent fail — yield just won't show */ }
        return group;
      })
    );

    // Reconstruct original order
    const rentMap = new Map<string, number>();
    for (const group of results) {
      for (const p of group) {
        rentMap.set(p.id, p.estimatedWeeklyRent);
      }
    }
    return properties.map((p) => ({
      ...p,
      estimatedWeeklyRent: rentMap.get(p.id) ?? p.estimatedWeeklyRent,
    }));
  }, [mode]);

  const loadMoreResults = useCallback(async () => {
    if (!lastFilters || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch("/api/rapidapi-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lastFilters, pageNumber: nextPage, page: nextPage }),
      });
      const data = await res.json();
      if (data.ok && data.results?.length > 0) {
        const enriched = await enrichWithRent(data.results);
        setSearchResults((prev) => [...prev, ...enriched]);
        setNextPage((p) => p + 1);
      }
    } catch { /* silently fail */ }
    setLoadingMore(false);
  }, [lastFilters, nextPage, loadingMore, enrichWithRent]);

  // Re-enrich when mode changes to Investment (for existing cards)
  useEffect(() => {
    if (mode === "investment" && searchResults.length > 0) {
      enrichWithRent(searchResults).then(setSearchResults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!wLoaded) return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;

  const likedCount = watchlist.filter((w) => w.status === "liked").length;
  const tabs: { key: Tab; label: string }[] = [
    { key: "search", label: "Search" },
    { key: "swipe", label: `Swipe${searchResults.length > 0 ? `(${searchResults.length})` : ""}` },
    { key: "watchlist", label: `Watching(${likedCount})` },
  ];

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold tracking-wide"><span className="text-[#3b82f6]">PROPFOLIO</span> <span className="text-[var(--muted)] font-normal">— DISCOVERY</span></h1>

      {/* Mode toggle — Investment or Home */}
      <div className="flex gap-0.5 bg-[var(--card)] rounded-lg p-0.5 border border-[var(--border)]">
        <button
          onClick={() => setMode("investment")}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
            mode === "investment"
              ? "bg-[#22c55e] text-white"
              : "text-[var(--muted)] hover:text-white"
          }`}
        >
          Investment — Show Yield
        </button>
        <button
          onClick={() => setMode("home")}
          className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
            mode === "home"
              ? "bg-[#3b82f6] text-white"
              : "text-[var(--muted)] hover:text-white"
          }`}
        >
          Home — For Living In
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 bg-[var(--card)] rounded-lg p-0.5 border border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-1.5 px-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? "bg-[#3b82f6] text-white"
                : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "search" && (
        <SearchTab
          onResultsLoaded={async (results, filters) => {
            setLastFilters(filters);
            setNextPage(2);
            setActiveTab("swipe");
            const enriched = await enrichWithRent(results);
            setSearchResults(enriched);
          }}
        />
      )}
      {activeTab === "swipe" && (
        <SwipeTab
          properties={searchResults}
          mode={mode}
          onLike={(p) => addToWatchlist(p, "liked")}
          onNeedMore={loadMoreResults}
          loadingMore={loadingMore}
        />
      )}
      {activeTab === "watchlist" && (
        <WatchlistTab
          watchlist={watchlist}
          mode={mode}
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
  mode,
  onLike,
  onNeedMore,
  loadingMore,
}: {
  properties: DiscoverProperty[];
  mode: DiscoverMode;
  onLike: (p: DiscoverProperty) => void;
  onNeedMore?: () => void;
  loadingMore?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [showAffordability, setShowAffordability] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [entering, setEntering] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // Track pending like so we defer DB save until after animation
  const pendingLike = useRef<DiscoverProperty | null>(null);

  const total = properties.length;
  const current = properties[currentIndex];

  // Auto-load more when 5 cards from the end
  useEffect(() => {
    if (total - currentIndex <= 5 && onNeedMore && !loadingMore) {
      onNeedMore();
    }
  }, [currentIndex, total, onNeedMore, loadingMore]);

  // Preload next 3 images so swiping feels instant
  useEffect(() => {
    for (let i = 1; i <= 3; i++) {
      const next = properties[currentIndex + i];
      if (next?.imageUrl) {
        const img = new Image();
        img.src = next.imageUrl;
      }
    }
  }, [currentIndex, properties]);

  const advanceCard = useCallback(() => {
    // Save to DB AFTER animation completes
    if (pendingLike.current) {
      onLike(pendingLike.current);
      pendingLike.current = null;
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1200);
    }
    setExitDirection(null);
    setEntering(true);
    setCurrentIndex((i) => i + 1);
    setShowAffordability(false);
    setDragX(0);
    setTimeout(() => setEntering(false), 300);
  }, [onLike]);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (!current || exitDirection) return;
      if (direction === "right") {
        pendingLike.current = current;
      }
      setExitDirection(direction);
      setTimeout(advanceCard, 400);
    },
    [current, exitDirection, advanceCard]
  );

  // Touch: detect horizontal vs vertical, only block scroll on horizontal
  const onTouchStart = (e: React.TouchEvent) => {
    if (exitDirection) return;
    setIsDragging(true);
    setIsHorizontal(false);
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || exitDirection) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // On first significant move, decide: horizontal swipe or vertical scroll
    if (!isHorizontal && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (!isHorizontal) {
      if (Math.abs(dx) > Math.abs(dy)) {
        setIsHorizontal(true);
      } else {
        // Vertical scroll — let browser handle it
        setIsDragging(false);
        return;
      }
    }
    e.preventDefault();
    setDragX(dx);
  };
  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsHorizontal(false);
    if (Math.abs(dragX) > 80) {
      handleSwipe(dragX > 0 ? "right" : "left");
    } else {
      setDragX(0);
    }
  };
  // Desktop mouse
  const onMouseDown = (e: React.MouseEvent) => {
    if (exitDirection) return;
    setIsDragging(true);
    setStartX(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || exitDirection) return;
    setDragX(e.clientX - startX);
  };
  const onMouseUp = () => {
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
      <div className="text-center py-16 text-[var(--muted)]">
        <p className="text-sm">Search for properties first</p>
      </div>
    );
  }

  if (currentIndex >= total) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--muted)] mb-3">End of results</p>
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

  // Format price display — handle "All Offers Presented" / "Contact Agent" type strings
  const displayPrice = isLandBuild
    ? formatCurrency((current.landPrice || 0) + (current.buildCost || 0))
    : current.price > 0
      ? formatCurrency(current.price)
      : null;
  const displayPriceText = (current as DiscoverProperty & { displayPrice?: string }).displayPrice || "";

  return (
    <div className="space-y-3">
      {/* Progress bar and counter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-white whitespace-nowrap">
            {currentIndex + 1} <span className="text-[var(--muted)] font-normal">of</span> {total}
          </span>
          {loadingMore && (
            <span className="text-xs text-[#3b82f6] animate-pulse">Loading more...</span>
          )}
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
      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={cardRef}
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={getCardStyle()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Swipe direction tint */}
          {dragX > 50 && (
            <div className="absolute inset-0 bg-green-500/20 z-10 pointer-events-none rounded-xl" />
          )}
          {dragX < -50 && (
            <div className="absolute inset-0 bg-red-500/20 z-10 pointer-events-none rounded-xl" />
          )}

          {/* Property image — shorter on mobile */}
          {current.imageUrl ? (
            <div className="h-44 sm:h-56 bg-[var(--border)] overflow-hidden">
              <img
                src={current.imageUrl}
                alt={current.address}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ) : (
            <div className="h-44 sm:h-56 bg-[var(--border)] flex items-center justify-center text-[var(--muted)] text-4xl">
              🏠
            </div>
          )}

          {/* Property details */}
          <div className="p-4 space-y-2">
            {/* Price row — always on top, full width */}
            <div className="flex items-baseline justify-between gap-2">
              {displayPrice ? (
                <p className="text-xl font-bold text-[#3b82f6]">{displayPrice}</p>
              ) : (
                <p className="text-sm font-bold text-[#3b82f6] truncate">{displayPriceText || "Contact Agent"}</p>
              )}
              {mode === "investment" && grossYield > 0 && (
                <span
                  className={`text-sm font-bold whitespace-nowrap ${grossYield >= 7 ? "text-[#22c55e]" : grossYield >= 5 ? "text-yellow-400" : "text-[#ef4444]"}`}
                >
                  {grossYield.toFixed(1)}% yield
                </span>
              )}
              {mode === "investment" && grossYield === 0 && (
                <span className="text-xs text-[var(--muted)]">Rent data TBC</span>
              )}
            </div>
            {mode === "investment" && current.estimatedWeeklyRent > 0 && (
              <p className="text-xs text-[var(--muted)]">
                Est. rent {formatCurrency(current.estimatedWeeklyRent)}/wk (suburb avg) · {formatCurrency(current.estimatedWeeklyRent * 52)}/yr
              </p>
            )}
            {isLandBuild && (
              <p className="text-xs text-[var(--muted)]">
                Land {formatCurrency(current.landPrice || 0)} + Build {formatCurrency(current.buildCost || 0)}
              </p>
            )}

            {/* Address */}
            <div>
              <h3 className="text-base font-bold truncate">{current.address || current.suburb}</h3>
              <p className="text-sm text-[var(--muted)]">
                {current.suburb}, {current.state} {current.postcode}
              </p>
            </div>

            {/* Specs row */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {current.bedrooms != null && <span>{current.bedrooms} bed</span>}
              {current.bathrooms != null && <span>{current.bathrooms} bath</span>}
              {current.carSpaces != null && <span>{current.carSpaces} car</span>}
              {current.landSize != null && <span>{current.landSize} m²</span>}
              <span className="text-[var(--muted)]">{current.propertyType}</span>
            </div>

            {/* Rent estimate */}
            {current.estimatedWeeklyRent > 0 && (
              <p className="text-sm">
                Est. rent: <strong>${current.estimatedWeeklyRent}/wk</strong>
              </p>
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
                    <Row label="Repayment (6.5%, 30yr)" value={formatCurrency(monthlyRepayment) + "/mo"} />
                    <Row
                      label="Cash Flow"
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
                View listing &rarr;
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Saved toast */}
      {savedToast && (
        <div className="text-center text-sm font-medium text-[#22c55e] animate-pulse">
          Saved to watchlist
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-6 py-1">
        <button
          onClick={() => handleSwipe("left")}
          disabled={!!exitDirection}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--card)] border-2 border-[#ef4444] text-[#ef4444] text-lg sm:text-xl font-bold transition-all duration-200 flex items-center justify-center active:scale-90 disabled:opacity-50"
        >
          ✕
        </button>
        <div className="text-center min-w-[2.5rem]">
          <div className="text-lg font-bold text-white">{currentIndex + 1}</div>
          <div className="text-[10px] text-[var(--muted)]">of {total}</div>
        </div>
        <button
          onClick={() => handleSwipe("right")}
          disabled={!!exitDirection}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--card)] border-2 border-[#22c55e] text-[#22c55e] text-lg sm:text-xl transition-all duration-200 flex items-center justify-center active:scale-90 disabled:opacity-50"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

/* ─── SEARCH API TAB ───────────────────────────────────────────── */

function SearchTab({ onResultsLoaded }: { onResultsLoaded: (results: DiscoverProperty[], filters: Record<string, unknown>, apiSource: "rapidapi" | "domain") => void | Promise<void> }) {
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
      const res = await fetch("/api/rapidapi-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Search failed"); return; }
      setResults(data.results || []);
      if (data.results?.length === 0) setError("No results found");
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full bg-[#0a0a0a] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)]";

  return (
    <div className="space-y-3">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-1">State</label>
            <select className={inp} value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>
              {["NT", "QLD", "WA", "SA", "NSW", "VIC", "TAS", "ACT"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-1">Suburb</label>
            <input className={inp} placeholder="Gray" value={filters.suburb} onChange={(e) => setFilters({ ...filters, suburb: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-1">Postcode</label>
            <input className={inp} placeholder="0830" value={filters.postcode} onChange={(e) => setFilters({ ...filters, postcode: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-1">Min $</label>
            <input type="number" className={inp} value={filters.minPrice || ""} onChange={(e) => setFilters({ ...filters, minPrice: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-1">Max $</label>
            <input type="number" className={inp} value={filters.maxPrice || ""} onChange={(e) => setFilters({ ...filters, maxPrice: +e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-1">Beds</label>
            <input type="number" className={inp} value={filters.minBedrooms || ""} onChange={(e) => setFilters({ ...filters, minBedrooms: +e.target.value })} />
          </div>
        </div>

        <div className="flex gap-1">
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
              className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                filters.propertyTypes.includes(pt)
                  ? "bg-[#22c55e] text-white"
                  : "bg-[#1a1a1a] text-[var(--muted)]"
              }`}
            >
              {pt === "ApartmentUnitFlat" ? "Unit" : pt === "VacantLand" ? "Land" : pt}
            </button>
          ))}
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#3b82f6] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>

        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>

      {results.length > 0 && (
        <button
          onClick={() => onResultsLoaded(results, filters, "rapidapi")}
          className="w-full bg-[#22c55e] text-white py-2 rounded-lg text-sm font-bold"
        >
          Swipe {results.length} Properties
        </button>
      )}
    </div>
  );
}

/* ─── WATCHLIST TAB ────────────────────────────────────────────── */

interface DeepDetail {
  description: string;
  photos: string[];
  estimatedValueLow: number;
  estimatedValueHigh: number;
  saleHistory: { date: string; price: number }[];
  loading: boolean;
  error: string | null;
}

function WatchlistTab({
  watchlist,
  mode,
  onUpdateStatus,
  onRemove,
}: {
  watchlist: { id: string; propertyId: string; property: DiscoverProperty; status: string; notes: string; createdAt: string }[];
  mode: DiscoverMode;
  onUpdateStatus: (id: string, status: "liked" | "passed") => void;
  onRemove: (id: string) => void;
}) {
  const [showPassed, setShowPassed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DeepDetail>>({});

  async function loadDetails(itemId: string, listingUrl: string) {
    if (!listingUrl) return;
    setDetails((prev) => ({ ...prev, [itemId]: { ...emptyDetail(), loading: true } }));
    try {
      const res = await fetch("/api/rea-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: listingUrl }),
      });
      const data = await res.json();
      if (data.ok && data.property) {
        const p = data.property;
        setDetails((prev) => ({
          ...prev,
          [itemId]: {
            description: p.description || "",
            photos: p.photos || [],
            estimatedValueLow: p.estimatedValueLow || 0,
            estimatedValueHigh: p.estimatedValueHigh || 0,
            saleHistory: p.saleHistory || [],
            loading: false,
            error: null,
          },
        }));
      } else {
        setDetails((prev) => ({
          ...prev,
          [itemId]: { ...emptyDetail(), loading: false, error: data.error || "Could not load details" },
        }));
      }
    } catch (err) {
      setDetails((prev) => ({
        ...prev,
        [itemId]: { ...emptyDetail(), loading: false, error: String(err) },
      }));
    }
  }

  function toggleExpand(itemId: string, listingUrl: string) {
    if (expanded === itemId) {
      setExpanded(null);
    } else {
      setExpanded(itemId);
      // Lazy fetch — only on first expand
      if (!details[itemId] && listingUrl) {
        loadDetails(itemId, listingUrl);
      }
    }
  }

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
    const annualRent = p.estimatedWeeklyRent * 52;
    const annualExpenses = annualRent * 0.25; // ~25% of rent for management, rates, insurance, maintenance
    const netYield = totalPrice > 0 ? ((annualRent - annualExpenses) / totalPrice) * 100 : 0;
    const buildBonus = p.state === "NT" ? 30000 : 0;
    const stampDuty = isLandBuild ? calcStampDutyNT(p.landPrice || 0) : calcStampDutyNT(totalPrice);

    const isExpanded = expanded === item.id;
    const detail = details[item.id];

    return (
      <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Tappable card — opens listing */}
        <a
          href={p.listingUrl || "#"}
          target={p.listingUrl ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex"
        >
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.address} className="w-28 h-28 sm:w-36 sm:h-36 object-cover flex-shrink-0" />
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 bg-[var(--border)] flex items-center justify-center text-2xl flex-shrink-0">🏠</div>
          )}
          <div className="p-2.5 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.address || p.suburb}</p>
                <p className="text-[11px] text-[var(--muted)]">{p.suburb}, {p.state} {p.postcode}</p>
              </div>
              {mode === "investment" && grossYield > 0 && (
                <span className={`text-xs font-bold whitespace-nowrap ${grossYield >= 7 ? "text-[#22c55e]" : grossYield >= 5 ? "text-yellow-400" : "text-[#ef4444]"}`}>
                  {grossYield.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-[#3b82f6] mt-1">
              {totalPrice > 0 ? formatCurrency(totalPrice) : (p as DiscoverProperty & { displayPrice?: string }).displayPrice || "Contact Agent"}
            </p>
            <div className="flex gap-2 text-[11px] mt-1 text-[var(--muted)]">
              {p.bedrooms != null && <span>{p.bedrooms} bed</span>}
              {p.bathrooms != null && <span>{p.bathrooms} bath</span>}
              {p.carSpaces != null && <span>{p.carSpaces} car</span>}
            </div>
            {p.listingUrl && (
              <p className="text-[10px] text-[#3b82f6] mt-1">Tap to view listing</p>
            )}
          </div>
        </a>

        {/* Expanded deep details — fetched on demand */}
        {isExpanded && (
          <div className="border-t border-[var(--border)] p-3 space-y-3 bg-[var(--background)]">
            {detail?.loading && (
              <div className="text-xs text-[var(--accent)] animate-pulse text-center py-3">
                Fetching detailed data from realestate.com.au...
              </div>
            )}
            {detail?.error && (
              <div className="text-xs text-[var(--negative)] bg-[var(--negative)]/10 p-2 rounded">
                {detail.error}
              </div>
            )}
            {detail && !detail.loading && !detail.error && (
              <>
                {/* Photos gallery */}
                {detail.photos.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {detail.photos.slice(0, 6).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-16 w-24 object-cover rounded flex-shrink-0"
                      />
                    ))}
                  </div>
                )}

                {/* Investment financials */}
                {mode === "investment" && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Gross Yield" value={`${grossYield.toFixed(1)}%`} />
                    <Stat label="Net Yield (est.)" value={`${netYield.toFixed(1)}%`} />
                    <Stat label="Weekly Repayment" value={formatCurrency((monthlyRepayment * 12) / 52)} />
                    <Stat
                      label="Weekly Cash Flow"
                      value={`${weeklyCashFlow >= 0 ? "+" : ""}${formatCurrency(weeklyCashFlow)}`}
                      positive={weeklyCashFlow >= 0}
                    />
                    {detail.estimatedValueLow > 0 && (
                      <>
                        <Stat label="REA Est. Low" value={formatCurrency(detail.estimatedValueLow)} />
                        <Stat label="REA Est. High" value={formatCurrency(detail.estimatedValueHigh)} />
                      </>
                    )}
                  </div>
                )}

                {/* Sale history */}
                {detail.saleHistory.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Sale History</p>
                    <div className="space-y-0.5">
                      {detail.saleHistory.slice(0, 4).map((h, i) => (
                        <div key={i} className="flex justify-between text-xs text-[var(--muted)]">
                          <span>{h.date}</span>
                          <span>{formatCurrency(h.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {detail.description && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Description</p>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                      {detail.description.slice(0, 400)}
                      {detail.description.length > 400 && "..."}
                    </p>
                  </div>
                )}

                {/* Build context for NT */}
                {p.state === "NT" && (
                  <div className="text-xs text-[var(--muted)] bg-[var(--card)] p-2 rounded space-y-0.5">
                    <p>Stamp duty estimate: {formatCurrency(stampDuty)}</p>
                    {buildBonus > 0 && <p className="text-[#22c55e]">NT BuildBonus: -{formatCurrency(buildBonus)}</p>}
                  </div>
                )}
              </>
            )}
            {!detail && !p.listingUrl && (
              <p className="text-xs text-[var(--muted)] text-center py-3">
                No listing URL — can&apos;t fetch deep data for this property
              </p>
            )}
          </div>
        )}

        <div className="border-t border-[var(--border)] px-3 py-1.5 flex items-center justify-between">
          <div className="flex gap-3">
            {item.status === "liked" ? (
              <button onClick={() => onUpdateStatus(item.id, "passed")} className="text-[11px] text-[var(--muted)] active:text-[#ef4444]">
                Pass
              </button>
            ) : (
              <button onClick={() => onUpdateStatus(item.id, "liked")} className="text-[11px] text-[var(--muted)] active:text-[#22c55e]">
                Like
              </button>
            )}
            <button onClick={() => onRemove(item.id)} className="text-[11px] text-[var(--muted)] active:text-[#ef4444]">
              Remove
            </button>
          </div>
          <button
            onClick={() => toggleExpand(item.id, p.listingUrl || "")}
            className="text-[11px] text-[#3b82f6] font-medium"
          >
            {isExpanded ? "Hide details" : "Show details"}
          </button>
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

function emptyDetail(): DeepDetail {
  return {
    description: "",
    photos: [],
    estimatedValueLow: 0,
    estimatedValueHigh: 0,
    saleHistory: [],
    loading: false,
    error: null,
  };
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-[var(--card)] rounded p-2">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`text-xs font-semibold ${positive === true ? "text-[#22c55e]" : positive === false ? "text-[#ef4444]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function calcStampDutyNT(value: number): number {
  if (value <= 525000) return value * 0.06571 * (1.05 - value * 0.00000095238);
  return value * 0.0495;
}
