import { NextRequest, NextResponse } from "next/server";

// POST /api/rea-parse  body: { url: "https://www.realestate.com.au/..." }
// Fetches a realestate.com.au listing OR property profile page and extracts structured data.
// Supports both URL types:
//   - Active listing: /property-house-nt-gray-145728536
//   - Property profile: /property/60-bagshaw-cres-gray-nt-0830/

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

interface SaleHistoryItem {
  date: string;
  price: number;
  type?: string;
}

interface SchoolItem {
  name: string;
  type: string;
  sector: string;
  distanceKm: number;
}

interface ParsedProperty {
  url: string;
  urlType: "listing" | "profile" | "unknown";
  // Address
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  // Listing-only
  price: number;
  displayPrice: string;
  description: string;
  agent: string;
  agency: string;
  // Property attributes
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  landSize: number | null;
  buildingSize: number | null;
  yearBuilt: number | null;
  // Media
  photos: string[];
  // Sale history
  saleHistory: SaleHistoryItem[];
  // realEstimate (PropTrack)
  estimatedValue: number;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  estimateConfidence: string;
  estimateUpdated: string;
  growthMonth: number;
  growthSinceLastSold: number;
  // Rental (PropTrack)
  weeklyRent: number;
  weeklyRentLow: number;
  weeklyRentHigh: number;
  rentalConfidence: string;
  rentalYield: number;
  suburbAvgYield: number;
  // Suburb stats
  suburbMedianHouse: number;
  suburbMedianUnit: number;
  suburb12mGrowth: number;
  // Schools
  schools: SchoolItem[];
  // Demographics
  population: number;
  medianAge: number;
  medianHouseholdIncome: number;
  ownerOccupiedPct: number;
  renterPct: number;
  familyPct: number;
}

function emptyResult(url: string): ParsedProperty {
  return {
    url,
    urlType: "unknown",
    address: "", suburb: "", state: "", postcode: "",
    price: 0, displayPrice: "", description: "", agent: "", agency: "",
    propertyType: "", bedrooms: null, bathrooms: null, carSpaces: null,
    landSize: null, buildingSize: null, yearBuilt: null,
    photos: [],
    saleHistory: [],
    estimatedValue: 0, estimatedValueLow: 0, estimatedValueHigh: 0,
    estimateConfidence: "", estimateUpdated: "",
    growthMonth: 0, growthSinceLastSold: 0,
    weeklyRent: 0, weeklyRentLow: 0, weeklyRentHigh: 0,
    rentalConfidence: "", rentalYield: 0, suburbAvgYield: 0,
    suburbMedianHouse: 0, suburbMedianUnit: 0, suburb12mGrowth: 0,
    schools: [],
    population: 0, medianAge: 0, medianHouseholdIncome: 0,
    ownerOccupiedPct: 0, renterPct: 0, familyPct: 0,
  };
}

function detectUrlType(url: string): "listing" | "profile" | "unknown" {
  if (url.match(/\/property\/[a-z0-9-]+\/?/i)) return "profile";
  if (url.match(/\/property-[a-z]+(?:-[a-z0-9]+)+/i)) return "listing";
  if (url.match(/\/sold\//i)) return "listing";
  return "unknown";
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  if (!url.match(/^https?:\/\/(www\.)?realestate\.com\.au\//i)) {
    return NextResponse.json(
      { ok: false, error: "Only realestate.com.au URLs are supported" },
      { status: 400 }
    );
  }

  try {
    const scrapingBeeKey = process.env.SCRAPINGBEE_KEY;

    // Route through ScrapingBee if configured — bypasses REA's 429 block
    // on cloud IPs by using residential proxy IPs
    let fetchUrl: string;
    let fetchOptions: RequestInit;

    if (scrapingBeeKey) {
      // ScrapingBee proxy — handles anti-bot detection
      const params = new URLSearchParams({
        api_key: scrapingBeeKey,
        url,
        render_js: "false", // REA serves data server-side in __NEXT_DATA__
        premium_proxy: "true", // residential IPs
        country_code: "au",
      });
      fetchUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;
      fetchOptions = {
        next: { revalidate: 3600 },
      };
    } else {
      // Direct fetch (will likely fail with 429 from Vercel IPs)
      fetchUrl = url;
      fetchOptions = {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
          "Accept-Language": "en-AU,en;q=0.9",
        },
        next: { revalidate: 3600 },
      };
    }

    const res = await fetch(fetchUrl, fetchOptions);

    if (!res.ok) {
      const reason = res.status === 429
        ? "REA is blocking server requests. Try manual entry below."
        : `Could not fetch page (${res.status})`;
      return NextResponse.json(
        { ok: false, error: reason, status: res.status },
        { status: res.status }
      );
    }

    const html = await res.text();
    const property = parsePage(html, url);

    return NextResponse.json({ ok: true, property, via: scrapingBeeKey ? "scrapingbee" : "direct" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Parse failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

function parsePage(html: string, url: string): ParsedProperty {
  const result = emptyResult(url);
  result.urlType = detectUrlType(url);

  // 1. JSON-LD structured data
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of jsonLdMatches) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
    try {
      const parsed = JSON.parse(inner);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) applyJsonLd(item, result);
    } catch { /* skip malformed */ }
  }

  // 2. Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      walkAny(nextData, result);
    } catch { /* skip parse errors */ }
  }

  // 3. Inline JSON blobs (REA sometimes embeds data in window.__INITIAL_STATE__ or similar)
  const initialStateMatches = html.match(/window\.(?:__INITIAL_STATE__|__APOLLO_STATE__|__PRELOADED_STATE__)\s*=\s*(\{[\s\S]*?\})\s*[;<]/g) || [];
  for (const match of initialStateMatches) {
    const jsonMatch = match.match(/=\s*(\{[\s\S]*?\})\s*[;<]/);
    if (!jsonMatch) continue;
    try {
      const data = JSON.parse(jsonMatch[1]);
      walkAny(data, result);
    } catch { /* skip */ }
  }

  // 4. Regex fallbacks for common visible text patterns (last resort)
  applyRegexFallbacks(html, result);

  // 5. Calculate derived fields
  if (result.estimatedValue === 0 && result.estimatedValueLow > 0 && result.estimatedValueHigh > 0) {
    result.estimatedValue = Math.round((result.estimatedValueLow + result.estimatedValueHigh) / 2);
  }
  if (result.rentalYield === 0 && result.weeklyRent > 0 && result.estimatedValue > 0) {
    result.rentalYield = Math.round(((result.weeklyRent * 52) / result.estimatedValue) * 1000) / 10;
  }

  return result;
}

interface JsonLdLikeProduct {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
  };
  numberOfBedrooms?: number;
  numberOfBathroomsTotal?: number;
  numberOfRooms?: number;
  floorSize?: { value?: number; unitText?: string };
  geo?: { latitude?: number; longitude?: number };
  offers?: {
    price?: number;
    priceCurrency?: string;
    priceSpecification?: { price?: number };
  };
}

function applyJsonLd(item: JsonLdLikeProduct, result: ParsedProperty) {
  const type = Array.isArray(item["@type"]) ? item["@type"][0] : item["@type"];
  if (!type) return;

  if (/Residence|House|Apartment|SingleFamily|RealEstateListing|Product|Place/i.test(type)) {
    if (item.name && !result.address) result.address = item.name;
    if (item.description && !result.description) result.description = item.description;

    if (item.image) {
      const imgs = Array.isArray(item.image) ? item.image : [item.image];
      for (const img of imgs) {
        if (typeof img === "string" && !result.photos.includes(img)) {
          result.photos.push(img);
        }
      }
    }

    if (item.address) {
      if (item.address.streetAddress && !result.address) result.address = item.address.streetAddress;
      if (item.address.addressLocality) result.suburb = item.address.addressLocality;
      if (item.address.addressRegion) result.state = item.address.addressRegion;
      if (item.address.postalCode) result.postcode = item.address.postalCode;
    }

    if (item.numberOfBedrooms && !result.bedrooms) result.bedrooms = item.numberOfBedrooms;
    if (item.numberOfBathroomsTotal && !result.bathrooms) result.bathrooms = item.numberOfBathroomsTotal;
    if (item.floorSize?.value && !result.landSize) result.landSize = item.floorSize.value;

    if (item.offers?.price && !result.price) result.price = item.offers.price;
    if (item.offers?.priceSpecification?.price && !result.price) {
      result.price = item.offers.priceSpecification.price;
    }
  }
}

// Recursive walker — finds known field shapes anywhere in the JSON tree
function walkAny(obj: unknown, result: ParsedProperty, depth = 0): void {
  if (!obj || depth > 10) return;

  if (Array.isArray(obj)) {
    for (const item of obj) walkAny(item, result, depth + 1);
    return;
  }

  if (typeof obj !== "object") return;
  const o = obj as Record<string, unknown>;

  // Property attributes
  if (typeof o.bedrooms === "number" && !result.bedrooms) result.bedrooms = o.bedrooms;
  if (typeof o.bathrooms === "number" && !result.bathrooms) result.bathrooms = o.bathrooms;
  if (typeof o.carSpaces === "number" && !result.carSpaces) result.carSpaces = o.carSpaces;
  if (typeof o.parkingSpaces === "number" && !result.carSpaces) result.carSpaces = o.parkingSpaces;
  if (typeof o.parking === "number" && !result.carSpaces) result.carSpaces = o.parking;
  if (typeof o.landSize === "number" && !result.landSize) result.landSize = o.landSize;
  if (typeof o.landArea === "number" && !result.landSize) result.landSize = o.landArea;
  if (typeof o.landAreaSqm === "number" && !result.landSize) result.landSize = o.landAreaSqm;
  if (typeof o.buildingSize === "number" && !result.buildingSize) result.buildingSize = o.buildingSize;
  if (typeof o.buildingArea === "number" && !result.buildingSize) result.buildingSize = o.buildingArea;
  if (typeof o.floorArea === "number" && !result.buildingSize) result.buildingSize = o.floorArea;
  if (typeof o.yearBuilt === "number" && !result.yearBuilt) result.yearBuilt = o.yearBuilt;
  if (typeof o.description === "string" && !result.description && o.description.length > 30) {
    result.description = o.description;
  }
  if (typeof o.propertyType === "string" && !result.propertyType) result.propertyType = o.propertyType;

  // Address
  if (o.address && typeof o.address === "object") {
    const addr = o.address as Record<string, unknown>;
    if (typeof addr.suburb === "string" && !result.suburb) result.suburb = addr.suburb;
    if (typeof addr.state === "string" && !result.state) result.state = addr.state;
    if (typeof addr.postcode === "string" && !result.postcode) result.postcode = addr.postcode;
    if (typeof addr.streetAddress === "string" && !result.address) result.address = addr.streetAddress;
    if (typeof addr.fullAddress === "string" && !result.address) result.address = addr.fullAddress;
    if (typeof addr.shortAddress === "string" && !result.address) result.address = addr.shortAddress;
    if (addr.display && typeof addr.display === "object") {
      const d = addr.display as Record<string, unknown>;
      if (typeof d.fullAddress === "string" && !result.address) result.address = d.fullAddress;
      if (typeof d.shortAddress === "string" && !result.address) result.address = d.shortAddress;
    }
  }

  // Listing price
  if (o.price && typeof o.price === "object") {
    const p = o.price as Record<string, unknown>;
    if (typeof p.value === "number" && !result.price) result.price = p.value;
    if (typeof p.display === "string" && !result.displayPrice) result.displayPrice = p.display;
  }

  // realEstimate / property estimate (PropTrack)
  // Look for keys: priceEstimate, propertyEstimate, valueEstimate, realEstimate, estimate
  const estimateKey = ["priceEstimate", "propertyEstimate", "valueEstimate", "realEstimate", "estimate", "valuation"]
    .find(k => o[k] && typeof o[k] === "object");
  if (estimateKey) {
    const pe = o[estimateKey] as Record<string, unknown>;
    if (typeof pe.lowerPrice === "number" && !result.estimatedValueLow) result.estimatedValueLow = pe.lowerPrice;
    if (typeof pe.lowPrice === "number" && !result.estimatedValueLow) result.estimatedValueLow = pe.lowPrice;
    if (typeof pe.lowRange === "number" && !result.estimatedValueLow) result.estimatedValueLow = pe.lowRange;
    if (typeof pe.upperPrice === "number" && !result.estimatedValueHigh) result.estimatedValueHigh = pe.upperPrice;
    if (typeof pe.highPrice === "number" && !result.estimatedValueHigh) result.estimatedValueHigh = pe.highPrice;
    if (typeof pe.highRange === "number" && !result.estimatedValueHigh) result.estimatedValueHigh = pe.highRange;
    if (typeof pe.midPrice === "number" && !result.estimatedValue) result.estimatedValue = pe.midPrice;
    if (typeof pe.estimate === "number" && !result.estimatedValue) result.estimatedValue = pe.estimate;
    if (typeof pe.value === "number" && !result.estimatedValue) result.estimatedValue = pe.value;
    if (typeof pe.confidence === "string" && !result.estimateConfidence) result.estimateConfidence = pe.confidence;
    if (typeof pe.confidenceLevel === "string" && !result.estimateConfidence) result.estimateConfidence = pe.confidenceLevel;
    if (typeof pe.lastUpdated === "string" && !result.estimateUpdated) result.estimateUpdated = pe.lastUpdated;
    if (typeof pe.updatedDate === "string" && !result.estimateUpdated) result.estimateUpdated = pe.updatedDate;
  }

  // Rental estimate (PropTrack)
  const rentKey = ["rentEstimate", "rentalEstimate", "rentalAvm", "rentValuation"]
    .find(k => o[k] && typeof o[k] === "object");
  if (rentKey) {
    const re = o[rentKey] as Record<string, unknown>;
    if (typeof re.lowerPrice === "number" && !result.weeklyRentLow) result.weeklyRentLow = re.lowerPrice;
    if (typeof re.upperPrice === "number" && !result.weeklyRentHigh) result.weeklyRentHigh = re.upperPrice;
    if (typeof re.midPrice === "number" && !result.weeklyRent) result.weeklyRent = re.midPrice;
    if (typeof re.value === "number" && !result.weeklyRent) result.weeklyRent = re.value;
    if (typeof re.estimate === "number" && !result.weeklyRent) result.weeklyRent = re.estimate;
    if (typeof re.confidence === "string" && !result.rentalConfidence) result.rentalConfidence = re.confidence;
  }

  // Yield
  if (typeof o.rentalYield === "number" && !result.rentalYield) result.rentalYield = o.rentalYield;
  if (typeof o.estimatedRentalYield === "number" && !result.rentalYield) result.rentalYield = o.estimatedRentalYield;
  if (typeof o.yieldEstimate === "number" && !result.rentalYield) result.rentalYield = o.yieldEstimate;
  if (typeof o.suburbAverageYield === "number" && !result.suburbAvgYield) result.suburbAvgYield = o.suburbAverageYield;
  if (typeof o.suburbAvgYield === "number" && !result.suburbAvgYield) result.suburbAvgYield = o.suburbAvgYield;

  // Growth
  if (typeof o.growthSinceLastMonth === "number" && !result.growthMonth) result.growthMonth = o.growthSinceLastMonth;
  if (typeof o.monthlyGrowth === "number" && !result.growthMonth) result.growthMonth = o.monthlyGrowth;
  if (typeof o.growthSinceLastSold === "number" && !result.growthSinceLastSold) {
    result.growthSinceLastSold = o.growthSinceLastSold;
  }

  // Suburb medians + growth
  if (o.suburbInsights || o.suburbStats || o.localMarket) {
    const ss = (o.suburbInsights || o.suburbStats || o.localMarket) as Record<string, unknown>;
    if (typeof ss.medianHousePrice === "number" && !result.suburbMedianHouse) result.suburbMedianHouse = ss.medianHousePrice;
    if (typeof ss.medianUnitPrice === "number" && !result.suburbMedianUnit) result.suburbMedianUnit = ss.medianUnitPrice;
    if (typeof ss.medianPrice === "number" && !result.suburbMedianHouse) result.suburbMedianHouse = ss.medianPrice;
    if (typeof ss.annualGrowth === "number" && !result.suburb12mGrowth) result.suburb12mGrowth = ss.annualGrowth;
    if (typeof ss.twelveMonthGrowth === "number" && !result.suburb12mGrowth) result.suburb12mGrowth = ss.twelveMonthGrowth;
  }

  // Photos / media
  if (Array.isArray(o.images)) {
    for (const img of o.images as Array<unknown>) {
      const url = extractPhotoUrl(img);
      if (url && !result.photos.includes(url)) result.photos.push(url);
    }
  }
  if (Array.isArray(o.media)) {
    for (const m of o.media as Array<unknown>) {
      const url = extractPhotoUrl(m);
      if (url && !result.photos.includes(url)) result.photos.push(url);
    }
  }
  if (Array.isArray(o.photos)) {
    for (const p of o.photos as Array<unknown>) {
      const url = extractPhotoUrl(p);
      if (url && !result.photos.includes(url)) result.photos.push(url);
    }
  }

  // Sale history (multiple naming patterns)
  const historyKey = ["saleHistory", "history", "salesHistory", "transactionHistory", "propertyHistory"]
    .find(k => Array.isArray(o[k]));
  if (historyKey) {
    const arr = o[historyKey] as Array<Record<string, unknown>>;
    for (const h of arr) {
      const date = (h.date || h.soldDate || h.saleDate || h.transactionDate) as string | undefined;
      const price = (h.price || h.soldPrice || h.salePrice || h.value) as number | undefined;
      const type = (h.type || h.eventType || h.action) as string | undefined;
      if (date && price && !result.saleHistory.find(s => s.date === date)) {
        result.saleHistory.push({ date, price, type });
      }
    }
  }

  // Schools
  if (Array.isArray(o.schools)) {
    for (const s of o.schools as Array<Record<string, unknown>>) {
      const name = s.name as string | undefined;
      if (!name || result.schools.find(sc => sc.name === name)) continue;
      result.schools.push({
        name,
        type: (s.educationLevel || s.type || s.level || "") as string,
        sector: (s.sector || s.governance || "") as string,
        distanceKm: typeof s.distance === "number" ? s.distance : 0,
      });
    }
  }

  // Demographics
  if (typeof o.population === "number" && !result.population) result.population = o.population;
  if (typeof o.medianAge === "number" && !result.medianAge) result.medianAge = o.medianAge;
  if (typeof o.medianHouseholdIncome === "number" && !result.medianHouseholdIncome) {
    result.medianHouseholdIncome = o.medianHouseholdIncome;
  }
  if (typeof o.medianWeeklyIncome === "number" && !result.medianHouseholdIncome) {
    result.medianHouseholdIncome = o.medianWeeklyIncome;
  }
  if (typeof o.ownerOccupiedPercentage === "number" && !result.ownerOccupiedPct) {
    result.ownerOccupiedPct = o.ownerOccupiedPercentage;
  }
  if (typeof o.renterPercentage === "number" && !result.renterPct) result.renterPct = o.renterPercentage;
  if (typeof o.familyPercentage === "number" && !result.familyPct) result.familyPct = o.familyPercentage;

  // Recurse into all object/array values
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") walkAny(v, result, depth + 1);
  }
}

function extractPhotoUrl(item: unknown): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  const m = item as Record<string, unknown>;
  if (typeof m.fullUrl === "string") return m.fullUrl;
  if (typeof m.url === "string") return m.url;
  if (typeof m.src === "string") return m.src;
  if (typeof m.templatedUrl === "string") return m.templatedUrl.replace("{size}", "800x600");
  if (typeof m.server === "string" && typeof m.uri === "string") {
    return `${m.server}/800x600${m.uri}`;
  }
  return "";
}

function applyRegexFallbacks(html: string, result: ParsedProperty) {
  // OpenGraph
  if (!result.address) {
    const m = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (m) result.address = m[1];
  }
  if (result.photos.length === 0) {
    const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (m) result.photos.push(m[1]);
  }
  if (!result.displayPrice) {
    const m = html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i);
    if (m) result.displayPrice = m[1];
  }

  // Visible text patterns (e.g. "Land size: 35,469 m²")
  if (!result.landSize) {
    const m = html.match(/Land\s*size[:\s]*<[^>]*>?\s*([\d,]+)\s*m/i);
    if (m) result.landSize = parseInt(m[1].replace(/,/g, ""), 10);
  }
  if (!result.bedrooms) {
    const m = html.match(/(\d+)\s*bed(?:room)?s?/i);
    if (m) result.bedrooms = parseInt(m[1], 10);
  }
  if (!result.bathrooms) {
    const m = html.match(/(\d+)\s*bath(?:room)?s?/i);
    if (m) result.bathrooms = parseInt(m[1], 10);
  }
  if (!result.carSpaces) {
    const m = html.match(/(\d+)\s*(?:car\s*space|garage|park)/i);
    if (m) result.carSpaces = parseInt(m[1], 10);
  }
}
