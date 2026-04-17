"use client";

import { useRef, useCallback } from "react";
import { formatCurrency, type Asset } from "@/lib/data";
import { useAssets, useIncomes } from "@/lib/useData";

const categories = ["Superannuation", "Vehicle", "Portable Home", "Overseas Property", "Savings", "Shares", "Other"] as const;

export default function AssetsPage() {
  const { assets, setAssets, saveAll, loaded } = useAssets();
  const { incomes } = useIncomes();
  const owners = [...new Set([...incomes.map((i) => i.person), ...assets.map((a) => a.owner)].filter(Boolean))];
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const debouncedSave = useCallback((updated: Asset[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAll(updated), 1000);
  }, [saveAll]);

  if (!loaded) {
    return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;
  }

  function updateAsset(id: string, field: keyof Asset, value: string | number | boolean) {
    const updated = assets.map((a) => (a.id === id ? { ...a, [field]: value } : a));
    setAssets(updated);
    debouncedSave(updated);
  }

  function addAsset() {
    const newId = Date.now().toString();
    const updated = [...assets, {
      id: newId,
      owner: owners[0] || "Owner",
      category: "Other" as const,
      description: "",
      estimatedValue: 0,
      notes: "",
      relevantForLending: true,
    }];
    setAssets(updated);
    debouncedSave(updated);
  }

  function removeAsset(id: string) {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated);
    saveAll(updated);
  }

  // Totals
  const totalAssets = assets.reduce((s, a) => s + a.estimatedValue, 0);
  const totalLendingRelevant = assets.filter((a) => a.relevantForLending).reduce((s, a) => s + a.estimatedValue, 0);
  // Group asset totals by owner dynamically
  const assetsByOwner: Record<string, number> = {};
  for (const a of assets) {
    assetsByOwner[a.owner] = (assetsByOwner[a.owner] || 0) + a.estimatedValue;
  }

  // Group by category
  const grouped: Record<string, Asset[]> = {};
  for (const a of assets) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Assets</h2>
        <p className="text-[var(--muted)]">Track all your assets — super, vehicles, property, savings. Banks look at the full picture.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Assets" value={formatCurrency(totalAssets)} positive />
        <Card label="Lending Relevant" value={formatCurrency(totalLendingRelevant)} positive subtext="can show banks" />
        {Object.entries(assetsByOwner).slice(0, 2).map(([owner, total]) => (
          <Card key={owner} label={`${owner.split(" ")[0]}'s Assets`} value={formatCurrency(total)} />
        ))}
      </div>

      {/* Assets by Category */}
      {Object.entries(grouped).map(([cat, items]) => {
        const catTotal = items.reduce((s, a) => s + a.estimatedValue, 0);
        return (
          <div key={cat} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
              <h3 className="font-semibold">{cat}</h3>
              <span className="text-sm text-[var(--positive)] font-medium">{formatCurrency(catTotal)}</span>
            </div>
            <div className="divide-y divide-[var(--card-border)]">
              {items.map((asset) => (
                <div key={asset.id} className="px-5 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={asset.description}
                          onChange={(e) => updateAsset(asset.id, "description", e.target.value)}
                          placeholder="Description..."
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm w-full focus:border-[var(--accent)] outline-none font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <select
                          value={asset.owner}
                          onChange={(e) => updateAsset(asset.id, "owner", e.target.value)}
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-0.5 text-xs focus:border-[var(--accent)] outline-none"
                        >
                          {owners.map((o) => (
                            <option key={o} value={o}>{o.split(" ")[0]}</option>
                          ))}
                          <option value="Joint">Joint</option>
                        </select>
                        <select
                          value={asset.category}
                          onChange={(e) => updateAsset(asset.id, "category", e.target.value)}
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-0.5 text-xs focus:border-[var(--accent)] outline-none"
                        >
                          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={asset.relevantForLending}
                            onChange={(e) => updateAsset(asset.id, "relevantForLending", e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-[var(--muted)]">Show bank</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={asset.notes}
                        onChange={(e) => updateAsset(asset.id, "notes", e.target.value)}
                        placeholder="Notes..."
                        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-xs w-36 focus:border-[var(--accent)] outline-none"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-[var(--muted)]">$</span>
                        <input
                          type="number"
                          value={Math.round(asset.estimatedValue * 100) / 100 || ""}
                          onChange={(e) => updateAsset(asset.id, "estimatedValue", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded px-2 py-1 text-sm text-right w-28 focus:border-[var(--accent)] outline-none"
                        />
                      </div>
                      <button onClick={() => removeAsset(asset.id)}
                        className="text-[var(--muted)] hover:text-[var(--negative)] transition-colors text-sm">x</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Asset */}
      <div className="flex justify-center">
        <button onClick={addAsset}
          className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors text-sm">
          + Add Asset
        </button>
      </div>

      {/* Net Worth Summary */}
      <div className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-5">
        <h3 className="font-semibold mb-3">Net Worth Summary</h3>
        <p className="text-xs text-[var(--muted)] mb-3">Your total position including properties, assets, and debts</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Assets</div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Australian Properties</span><span>will load from dashboard</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Super, Vehicles, Other</span><span>{formatCurrency(totalAssets)}</span></div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">What banks see</div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Lending-relevant assets</span><span className="text-[var(--positive)]">{formatCurrency(totalLendingRelevant)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Super (not accessible)</span><span>{formatCurrency(totalAssets - totalLendingRelevant)}</span></div>
            <p className="text-xs text-[var(--muted)] mt-2">
              Banks can see super as proof of financial stability but can&apos;t count it as available funds.
              Overseas properties are generally not counted by Australian lenders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, positive, subtext }: { label: string; value: string; positive?: boolean; subtext?: string }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="text-[var(--muted)] text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${positive ? "text-[var(--positive)]" : ""}`}>
        {value}
        {subtext && <span className="text-sm text-[var(--muted)] font-normal ml-1">{subtext}</span>}
      </div>
    </div>
  );
}
