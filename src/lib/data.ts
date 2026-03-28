// All financial data for the portfolio
// This will eventually be replaced with Supabase queries

export interface Property {
  id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  owner: string;
  type: "PPOR" | "Investment";
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  landSize: string;
  purchasePrice: number;
  currentValue: number;
  valueLow: number;
  valueHigh: number;
  growthSincePurchase: number;
  weeklyRent: number;
  rentNotes: string;
  image: string;
}

export interface Loan {
  id: string;
  propertyId: string;
  owner: string;
  lender: string;
  balance: number;
  loanLimit: number;
  availableRedraw: number;
  interestRate: number;
  repaymentType: string;
  repaymentAmount: number;
  repaymentFrequency: string;
  offsetBalance: number;
  loanEndDate: string;
  nextRepaymentDate: string;
}

export interface Income {
  id: string;
  person: string;
  employer: string;
  jobTitle: string;
  classification: string;
  location: string;
  grossFortnightly: number;
  netFortnightly: number;
  taxFortnightly: number;
  superFortnightly: number;
  annualGross: number;
  annualNet: number;
  hourlyRate: number | null;
  payFrequency: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";
}

// ─── PROPERTIES ────────────────────────────────────────────────

export const properties: Property[] = [
  {
    id: "60-bagshaw",
    address: "60 Bagshaw Crescent",
    suburb: "Gray",
    state: "NT",
    postcode: "0830",
    owner: "Stuart French",
    type: "PPOR",
    propertyType: "House",
    bedrooms: null,
    bathrooms: null,
    carSpaces: null,
    landSize: "35,469 m²",
    purchasePrice: 195000,
    currentValue: 607000,
    valueLow: 530000,
    valueHigh: 680000,
    growthSincePurchase: 412000,
    weeklyRent: 1400,
    rentNotes: "Room rentals while owner-occupied",
    image: "/images/60_Bagshaw.jpeg",
  },
  {
    id: "72-bagshaw",
    address: "72 Bagshaw Crescent",
    suburb: "Gray",
    state: "NT",
    postcode: "0830",
    owner: "Sasitron Ransuk",
    type: "Investment",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 2,
    carSpaces: 4,
    landSize: "802 m²",
    purchasePrice: 505000,
    currentValue: 661000,
    valueLow: 620000,
    valueHigh: 710000,
    growthSincePurchase: 156000,
    weeklyRent: 1000,
    rentNotes: "Fully tenanted investment property",
    image: "/images/72_Bagshaw.jpeg",
  },
];

// ─── LOANS ─────────────────────────────────────────────────────

export const loans: Loan[] = [
  {
    id: "stuart-hvl",
    propertyId: "60-bagshaw",
    owner: "Stuart French",
    lender: "Home Value Loan",
    balance: 328078.87,
    loanLimit: 366371.17,
    availableRedraw: 37642.40,
    interestRate: 5.59,
    repaymentType: "Principal & Interest",
    repaymentAmount: 2599.60,
    repaymentFrequency: "monthly",
    offsetBalance: 0,
    loanEndDate: "2045-05-23",
    nextRepaymentDate: "2026-04-23",
  },
  {
    id: "sasitron-hl",
    propertyId: "72-bagshaw",
    owner: "Sasitron Ransuk",
    lender: "ING",
    balance: 377636.82,
    loanLimit: 377636.82,
    availableRedraw: 8271.78,
    interestRate: 6.04,
    repaymentType: "Principal & Interest",
    repaymentAmount: 1050.31,
    repaymentFrequency: "fortnightly",
    offsetBalance: 236004.33,
    loanEndDate: "",
    nextRepaymentDate: "2026-04-10",
  },
];

// ─── INCOME ────────────────────────────────────────────────────

export const incomes: Income[] = [
  {
    id: "stuart-income",
    person: "Stuart French",
    employer: "Svitzer Australia Pty Ltd",
    jobTitle: "88 Deckhand",
    classification: "Full Time",
    location: "83 Darwin Towage, NT",
    grossFortnightly: 6041.26,
    netFortnightly: 4371.26,
    taxFortnightly: 1620.00,
    superFortnightly: 930.58,
    annualGross: 157073,
    annualNet: 113653,
    hourlyRate: 428.84,
    payFrequency: "fortnightly",
  },
  {
    id: "sasitron-income",
    person: "Sasitron Ransuk",
    employer: "Compass Group Remote Hospitality Services",
    jobTitle: "Attendant - Utility",
    classification: "Level 2, Full Time",
    location: "Glencore - McArthur River",
    grossFortnightly: 3380.09,
    netFortnightly: 2650.09,
    taxFortnightly: 730.00,
    superFortnightly: 261.10,
    annualGross: 87882,
    annualNet: 68902,
    hourlyRate: 31.64,
    payFrequency: "fortnightly",
  },
];

// ─── DEFAULT EXPENSES (user can add/edit via forms) ────────────

export const defaultExpenses: Expense[] = [
  { id: "1", category: "Housing", description: "Council rates", amount: 0, frequency: "quarterly" },
  { id: "2", category: "Housing", description: "Home & contents insurance", amount: 0, frequency: "annually" },
  { id: "3", category: "Housing", description: "Water & sewerage", amount: 0, frequency: "quarterly" },
  { id: "4", category: "Housing", description: "Electricity", amount: 0, frequency: "monthly" },
  { id: "5", category: "Housing", description: "Gas", amount: 0, frequency: "monthly" },
  { id: "6", category: "Housing", description: "Internet", amount: 0, frequency: "monthly" },
  { id: "7", category: "Housing", description: "Phone plans", amount: 0, frequency: "monthly" },
  { id: "8", category: "Transport", description: "Fuel", amount: 0, frequency: "weekly" },
  { id: "9", category: "Transport", description: "Car insurance", amount: 0, frequency: "annually" },
  { id: "10", category: "Transport", description: "Car registration", amount: 0, frequency: "annually" },
  { id: "11", category: "Transport", description: "Car maintenance", amount: 0, frequency: "annually" },
  { id: "12", category: "Living", description: "Groceries", amount: 0, frequency: "weekly" },
  { id: "13", category: "Living", description: "Dining out", amount: 0, frequency: "weekly" },
  { id: "14", category: "Living", description: "Medical / health", amount: 0, frequency: "monthly" },
  { id: "15", category: "Living", description: "Health insurance", amount: 0, frequency: "monthly" },
  { id: "16", category: "Living", description: "Clothing", amount: 0, frequency: "monthly" },
  { id: "17", category: "Living", description: "Personal care", amount: 0, frequency: "monthly" },
  { id: "18", category: "Living", description: "Entertainment / subscriptions", amount: 0, frequency: "monthly" },
  { id: "19", category: "Investment", description: "72 Bagshaw - property manager fees", amount: 0, frequency: "monthly" },
  { id: "20", category: "Investment", description: "72 Bagshaw - landlord insurance", amount: 0, frequency: "annually" },
  { id: "21", category: "Investment", description: "72 Bagshaw - council rates", amount: 0, frequency: "quarterly" },
  { id: "22", category: "Investment", description: "72 Bagshaw - maintenance", amount: 0, frequency: "annually" },
];

// ─── HELPERS ───────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly": return amount * 52 / 12;
    case "fortnightly": return amount * 26 / 12;
    case "monthly": return amount;
    case "quarterly": return amount / 3;
    case "annually": return amount / 12;
    default: return amount;
  }
}

export function toAnnual(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly": return amount * 52;
    case "fortnightly": return amount * 26;
    case "monthly": return amount * 12;
    case "quarterly": return amount * 4;
    case "annually": return amount;
    default: return amount;
  }
}

export function getLoanForProperty(propertyId: string): Loan | undefined {
  return loans.find((l) => l.propertyId === propertyId);
}
