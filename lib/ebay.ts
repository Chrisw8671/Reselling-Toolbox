/**
 * eBay API client
 *
 * Uses two eBay APIs:
 * - Browse API (OAuth 2.0 client credentials) — active listings search
 * - Finding API (App ID) — completed/sold listings for average price calculation
 */

const EBAY_API_BASE = "https://api.ebay.com";
const EBAY_FINDING_BASE = "https://svcs.ebay.com/services/search/FindingService/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EbayListing {
  ebayItemId: string;
  title: string;
  currentPrice: number;
  imageUrl: string | null;
  itemUrl: string;
  condition: string | null;
}

export interface SoldPriceData {
  avgSoldPrice: number;
  soldSampleSize: number;
}

// ─── OAuth token (Browse API) ─────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in environment variables");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${EBAY_API_BASE}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };

  return cachedToken.token;
}

// ─── Browse API — active listings ─────────────────────────────────────────────

export async function searchActiveListings(params: {
  keywords: string;
  category?: string | null;
  condition?: string | null;
  maxPrice?: number | null;
  limit?: number;
}): Promise<EbayListing[]> {
  const token = await getAccessToken();
  const { keywords, category, condition, maxPrice, limit = 50 } = params;

  const filters: string[] = [];
  if (condition) {
    // eBay Browse API condition filter values
    const conditionMap: Record<string, string> = {
      NEW: "NEW",
      USED_EXCELLENT: "USED_EXCELLENT",
      USED_VERY_GOOD: "USED_VERY_GOOD",
      USED_GOOD: "USED_GOOD",
      USED_ACCEPTABLE: "USED_ACCEPTABLE",
    };
    const mapped = conditionMap[condition];
    if (mapped) filters.push(`conditionIds:{${mapped}}`);
  }
  if (maxPrice) {
    filters.push(`price:[..${maxPrice}]`);
    filters.push("priceCurrency:GBP");
  }

  const qs = new URLSearchParams({
    q: keywords,
    limit: String(Math.min(limit, 200)),
    ...(category ? { category_ids: category } : {}),
    ...(filters.length ? { filter: filters.join(",") } : {}),
  });

  const res = await fetch(`${EBAY_API_BASE}/buy/browse/v1/item_summary/search?${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Browse API search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const items: EbayListing[] = [];

  for (const item of data.itemSummaries ?? []) {
    const price = parseFloat(item.price?.value ?? "0");
    if (!price) continue;

    items.push({
      ebayItemId: item.itemId as string,
      title: item.title as string,
      currentPrice: price,
      imageUrl: item.image?.imageUrl ?? null,
      itemUrl: item.itemWebUrl as string,
      condition: item.condition ?? null,
    });
  }

  return items;
}

// ─── Finding API — sold listings ──────────────────────────────────────────────

export async function getSoldPriceData(params: {
  keywords: string;
  condition?: string | null;
}): Promise<SoldPriceData | null> {
  const appId = process.env.EBAY_CLIENT_ID;
  if (!appId) throw new Error("EBAY_CLIENT_ID must be set");

  const { keywords, condition } = params;

  const qs = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.0.0",
    "SECURITY-APPNAME": appId,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    keywords,
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    "itemFilter(1).name": "Currency",
    "itemFilter(1).value": "GBP",
    "paginationInput.entriesPerPage": "50",
    "sortOrder": "EndTimeSoonest",
  });

  // Add condition filter if provided
  if (condition) {
    const conditionIdMap: Record<string, string> = {
      NEW: "1000",
      USED_EXCELLENT: "3000",
      USED_VERY_GOOD: "4000",
      USED_GOOD: "5000",
      USED_ACCEPTABLE: "6000",
    };
    const condId = conditionIdMap[condition];
    if (condId) {
      qs.set("itemFilter(2).name", "Condition");
      qs.set("itemFilter(2).value", condId);
    }
  }

  const res = await fetch(`${EBAY_FINDING_BASE}?${qs}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) return null;

  const data = await res.json();

  const response = data?.findCompletedItemsResponse?.[0];
  if (response?.ack?.[0] !== "Success") return null;

  const soldItems = response?.searchResult?.[0]?.item ?? [];
  if (soldItems.length === 0) return null;

  const prices: number[] = [];
  for (const item of soldItems) {
    const price = parseFloat(item?.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0");
    if (price > 0) prices.push(price);
  }

  if (prices.length === 0) return null;

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  return {
    avgSoldPrice: Math.round(avg * 100) / 100,
    soldSampleSize: prices.length,
  };
}
