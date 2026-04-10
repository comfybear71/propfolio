"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  properties as defaultProperties,
  loans as defaultLoans,
  incomes as defaultIncomes,
  defaultExpenses,
  defaultAssets,
  type Property,
  type Loan,
  type Income,
  type Expense,
  type Asset,
  type DiscoverProperty,
  type WatchlistItem,
} from "./data";

export function useProperties() {
  const [data, setData] = useState<Property[]>(defaultProperties);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => { if (d.length > 0) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const save = useCallback(async (updated: Property) => {
    const { ...clean } = updated;
    setData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await fetch("/api/properties", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean),
    }).catch(() => {});
  }, []);

  return { properties: data, setProperties: setData, saveProperty: save, loaded };
}

export function useLoans() {
  const [data, setData] = useState<Loan[]>(defaultLoans);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/loans")
      .then((r) => r.json())
      .then((d) => { if (d.length > 0) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const save = useCallback(async (updated: Loan) => {
    const { ...clean } = updated;
    setData((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    await fetch("/api/loans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean),
    }).catch(() => {});
  }, []);

  return { loans: data, setLoans: setData, saveLoan: save, loaded };
}

export function useIncomes() {
  const [data, setData] = useState<Income[]>(defaultIncomes);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/incomes")
      .then((r) => r.json())
      .then((d) => { if (d.length > 0) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const save = useCallback(async (updated: Income) => {
    const { ...clean } = updated;
    setData((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    await fetch("/api/incomes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean),
    }).catch(() => {});
  }, []);

  const remove = useCallback(async (id: string) => {
    setData((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/incomes?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }, []);

  return { incomes: data, setIncomes: setData, saveIncome: save, removeIncome: remove, loaded };
}

export function useExpenses() {
  const [data, setData] = useState<Expense[]>(defaultExpenses);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((d) => { if (d.length > 0) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const saveAll = useCallback(async (expenses: Expense[]) => {
    setData(expenses);
    await fetch("/api/expenses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenses.map(({ id, category, description, amount, frequency }) =>
        ({ id, category, description, amount, frequency })
      )),
    }).catch(() => {});
  }, []);

  return { expenses: data, setExpenses: setData, saveAll, loaded };
}

export function useAssets() {
  const [data, setData] = useState<Asset[]>(defaultAssets);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => { if (d.length > 0) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const saveAll = useCallback(async (assets: Asset[]) => {
    setData(assets);
    await fetch("/api/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assets.map(({ id, owner, category, description, estimatedValue, notes, relevantForLending }) =>
        ({ id, owner, category, description, estimatedValue, notes, relevantForLending })
      )),
    }).catch(() => {});
  }, []);

  return { assets: data, setAssets: setData, saveAll, loaded };
}

export function useWatchlist() {
  const [data, setData] = useState<WatchlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const addToWatchlist = useCallback(async (property: DiscoverProperty, status: "liked" | "passed", notes?: string) => {
    const item: WatchlistItem = {
      id: `wl-${property.id}`,
      propertyId: property.id,
      property,
      status,
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => {
      const existing = prev.findIndex((w) => w.propertyId === property.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = item;
        return updated;
      }
      return [item, ...prev];
    });
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).catch(() => {});
  }, []);

  const updateStatus = useCallback(async (id: string, status: "liked" | "passed") => {
    setData((prev) => prev.map((w) => (w.id === id ? { ...w, status, updatedAt: new Date().toISOString() } : w)));
    await fetch("/api/watchlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }, []);

  const removeFromWatchlist = useCallback(async (id: string) => {
    setData((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }, []);

  return { watchlist: data, setWatchlist: setData, addToWatchlist, updateStatus, removeFromWatchlist, loaded };
}

export interface BorrowingSettings {
  stuartGross: number;
  sasitronGross: number;
  rentalIncome60: number;
  rentalIncome72: number;
  monthlyExpenses: number;
  existingDebt: number;
  landPrice: number;
  buildCost: number;
  depositPercent: number;
  newLoanRate: number;
  newLoanTerm: number;
  expectedRent: number;
  useEquity: boolean;
  claimBuildBonus: boolean;
}

export function useBorrowingSettings(defaults: BorrowingSettings) {
  const [data, setData] = useState<BorrowingSettings>(defaults);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/borrowing-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.stuartGross !== undefined) {
          setData((prev) => ({ ...prev, ...d }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const update = useCallback((partial: Partial<BorrowingSettings>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      // Debounced auto-save — waits 800ms after last change
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        fetch("/api/borrowing-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }).catch(() => {});
      }, 800);
      return next;
    });
  }, []);

  return { settings: data, update, loaded };
}

export interface StrategySettings {
  plan: { year: number; landCost: number; buildCost: number; expectedRent: number; interestRate: number; depositPercent: number }[];
  growthRate: number;
  rentGrowth: number;
}

export function useStrategySettings(defaults: StrategySettings) {
  const [data, setData] = useState<StrategySettings>(defaults);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/strategy-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.plan !== undefined) {
          setData((prev) => ({ ...prev, ...d }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = useCallback((next: StrategySettings) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch("/api/strategy-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    }, 800);
  }, []);

  const update = useCallback((partial: Partial<StrategySettings>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      save(next);
      return next;
    });
  }, [save]);

  return { strategy: data, update, loaded };
}
