// Shared types for the setup wizard

export interface Person {
  id: string;
  name: string;
  payslipFile: File | null;
  ocrDone: boolean;
  ocrLoading: boolean;
  income: {
    employer: string;
    jobTitle: string;
    annualGross: number;
    annualNet: number;
    netFortnightly: number;
    grossFortnightly: number;
    payFrequency: string;
    superannuation: number;
    taxWithheld: number;
    hourlyRate: number;
  } | null;
}

export interface SetupProperty {
  id: string;
  domainPropertyId: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  landSize: number | null;
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  photos: string[];
  type: "PPOR" | "Investment";
  owner: string;
  loanBalance: number;
  interestRate: number;
  offsetBalance: number;
  weeklyRent: number;
}

export interface SetupState {
  step: number;
  people: Person[];
  properties: SetupProperty[];
  bankBalance: number;
}

export const TOTAL_STEPS = 4;

export function createPerson(name: string): Person {
  return {
    id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    payslipFile: null,
    ocrDone: false,
    ocrLoading: false,
    income: null,
  };
}

export function createProperty(): SetupProperty {
  return {
    id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    domainPropertyId: "",
    address: "",
    suburb: "",
    state: "NT",
    postcode: "",
    propertyType: "House",
    bedrooms: null,
    bathrooms: null,
    carSpaces: null,
    landSize: null,
    estimatedValue: 0,
    valueLow: 0,
    valueHigh: 0,
    photos: [],
    type: "PPOR",
    owner: "",
    loanBalance: 0,
    interestRate: 0,
    offsetBalance: 0,
    weeklyRent: 0,
  };
}
