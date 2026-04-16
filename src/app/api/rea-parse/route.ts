import { NextRequest, NextResponse } from "next/server";

// POST /api/rea-parse  body: { url: "https://www.realestate.com.au/..." }
// Fetches a realestate.com.au listing page and extracts structured data

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

interface ParsedProperty {
  url: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  price: number;
  displayPrice: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  landSize: number | null;
  buildingSize: number | null;
  description: string;
  photos: string[];
  agent: string;
  agency: string;
  weeklyRent: number;
  saleHistory: { date: string; price: number }[];
  estimatedValueLow: number;
  estimatedValueHigh: number;
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  // Only accept realestate.com.au URLs
  if (!url.match(/^https?:\/\/(www\.)?realestate\.com\.au\//i)) {
    return NextResponse.json(
      { ok: false, error: "Only realestate.com.au URLs are supported" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "en-AU,en;q=0.9",
      },
      // Politely cache for 1 hour at the edge
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Could not fetch listing (${res.status})` },
        { status: res.status }
      );
    }

    const html = await res.text();
    const property = parseListing(html, url);

    return NextResponse.json({ ok: true, property });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Parse failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

function parseListing(html: string, url: string): ParsedProperty {
  const result: ParsedProperty = {
    url,
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    price: 0,
    displayPrice: "",
    propertyType: "",
    bedrooms: null,
    bathrooms: null,
    carSpaces: null,
    landSize: null,
    buildingSize: null,
    description: "",
    photos: [],
    agent: "",
    agency: "",
    weeklyRent: 0,
    saleHistory: [],
    estimatedValueLow: 0,
    estimatedValueHigh: 0,
  };

  // 1. Extract JSON-LD blocks (most reliable structured data)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of jsonLdMatches) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
    try {
      const parsed = JSON.parse(inner);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        applyJsonLd(item, result);
      }
    } catch {
      // Skip malformed JSON-LD
    }
  }

  // 2. Extract Next.js __NEXT_DATA__ if present (REA uses Next.js — has a goldmine of data)
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      applyNextData(nextData, result);
    } catch {
      // Skip parse errors
    }
  }

  // 3. Fallback regex extractions for common fields
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
  if (!result.displayPrice) {
    const m = html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i);
    if (m) result.displayPrice = m[1];
  }
  if (!result.address) {
    const m = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (m) result.address = m[1];
  }
  if (result.photos.length === 0) {
    const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (m) result.photos.push(m[1]);
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

    // Photos
    if (item.image) {
      const imgs = Array.isArray(item.image) ? item.image : [item.image];
      for (const img of imgs) {
        if (typeof img === "string" && !result.photos.includes(img)) {
          result.photos.push(img);
        }
      }
    }

    // Address
    if (item.address) {
      if (item.address.streetAddress && !result.address) result.address = item.address.streetAddress;
      if (item.address.addressLocality) result.suburb = item.address.addressLocality;
      if (item.address.addressRegion) result.state = item.address.addressRegion;
      if (item.address.postalCode) result.postcode = item.address.postalCode;
    }

    // Beds/baths
    if (item.numberOfBedrooms && !result.bedrooms) result.bedrooms = item.numberOfBedrooms;
    if (item.numberOfBathroomsTotal && !result.bathrooms) result.bathrooms = item.numberOfBathroomsTotal;
    if (item.floorSize?.value && !result.landSize) result.landSize = item.floorSize.value;

    // Price
    if (item.offers?.price && !result.price) result.price = item.offers.price;
    if (item.offers?.priceSpecification?.price && !result.price) {
      result.price = item.offers.priceSpecification.price;
    }
  }
}

interface NextDataShape {
  props?: {
    pageProps?: Record<string, unknown>;
  };
}

function applyNextData(nextData: NextDataShape, result: ParsedProperty) {
  // REA's Next.js __NEXT_DATA__ structure varies — try to find listing details
  const pageProps = nextData?.props?.pageProps;
  if (!pageProps) return;

  // Recursively search for known field shapes (best-effort, REA changes structure occasionally)
  function walk(obj: unknown, depth = 0): void {
    if (!obj || typeof obj !== "object" || depth > 6) return;
    const o = obj as Record<string, unknown>;

    // Listing/property shape detection
    if (typeof o.bedrooms === "number" && !result.bedrooms) result.bedrooms = o.bedrooms;
    if (typeof o.bathrooms === "number" && !result.bathrooms) result.bathrooms = o.bathrooms;
    if (typeof o.carSpaces === "number" && !result.carSpaces) result.carSpaces = o.carSpaces;
    if (typeof o.parkingSpaces === "number" && !result.carSpaces) result.carSpaces = o.parkingSpaces;
    if (typeof o.landSize === "number" && !result.landSize) result.landSize = o.landSize;
    if (typeof o.buildingSize === "number" && !result.buildingSize) result.buildingSize = o.buildingSize;
    if (typeof o.description === "string" && !result.description) result.description = o.description;

    // Address shape
    if (o.address && typeof o.address === "object") {
      const addr = o.address as Record<string, unknown>;
      if (typeof addr.suburb === "string" && !result.suburb) result.suburb = addr.suburb;
      if (typeof addr.state === "string" && !result.state) result.state = addr.state;
      if (typeof addr.postcode === "string" && !result.postcode) result.postcode = addr.postcode;
      if (addr.display && typeof addr.display === "object") {
        const d = addr.display as Record<string, unknown>;
        if (typeof d.fullAddress === "string" && !result.address) result.address = d.fullAddress;
        if (typeof d.shortAddress === "string" && !result.address) result.address = d.shortAddress;
      }
    }

    // Price shape
    if (o.price && typeof o.price === "object") {
      const p = o.price as Record<string, unknown>;
      if (typeof p.value === "number" && !result.price) result.price = p.value;
      if (typeof p.display === "string" && !result.displayPrice) result.displayPrice = p.display;
    }

    // Property type
    if (typeof o.propertyType === "string" && !result.propertyType) result.propertyType = o.propertyType;

    // Photos / media
    if (Array.isArray(o.images)) {
      for (const img of o.images as Array<Record<string, unknown>>) {
        let url = "";
        if (typeof img === "string") url = img;
        else if (img.server && img.uri) url = `${img.server}/800x600${img.uri}`;
        else if (typeof img.templatedUrl === "string") url = img.templatedUrl.replace("{size}", "800x600");
        else if (typeof img.url === "string") url = img.url;
        if (url && !result.photos.includes(url)) result.photos.push(url);
      }
    }
    if (Array.isArray(o.media)) {
      for (const m of o.media as Array<Record<string, unknown>>) {
        let url = "";
        if (typeof m === "string") url = m;
        else if (m.server && m.uri) url = `${m.server}/800x600${m.uri}`;
        else if (typeof m.templatedUrl === "string") url = m.templatedUrl.replace("{size}", "800x600");
        else if (typeof m.url === "string") url = m.url;
        if (url && !result.photos.includes(url)) result.photos.push(url);
      }
    }

    // Sale history
    if (Array.isArray(o.saleHistory) || Array.isArray(o.history)) {
      const arr = (o.saleHistory || o.history) as Array<Record<string, unknown>>;
      for (const h of arr) {
        const date = (h.date || h.soldDate) as string | undefined;
        const price = (h.price || h.soldPrice) as number | undefined;
        if (date && price) {
          result.saleHistory.push({ date, price });
        }
      }
    }

    // Estimated value range
    if (o.priceEstimate && typeof o.priceEstimate === "object") {
      const pe = o.priceEstimate as Record<string, unknown>;
      if (typeof pe.lowerPrice === "number") result.estimatedValueLow = pe.lowerPrice;
      if (typeof pe.upperPrice === "number") result.estimatedValueHigh = pe.upperPrice;
    }

    // Recurse
    for (const v of Object.values(o)) {
      if (v && typeof v === "object") walk(v, depth + 1);
    }
  }

  walk(pageProps);
}
