"use client";

import { useState, useEffect, useCallback } from "react";
import {
  properties as defaultProperties,
  loans as defaultLoans,
  incomes as defaultIncomes,
  defaultExpenses,
  type Property,
  type Loan,
  type Income,
  type Expense,
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

  return { incomes: data, setIncomes: setData, saveIncome: save, loaded };
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
