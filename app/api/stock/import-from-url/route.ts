import { NextResponse } from "next/server";

const META_TAG_REGEX = /<meta\s+[^>]*>/gi;
const SCRIPT_LD_REGEX =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function extractTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? stripTags(titleMatch[1]) : "";
}

function parseMetaTags(html: string) {
  const meta: Record<string, string> = {};

  for (const tag of html.match(META_TAG_REGEX) ?? []) {
    const keyMatch =
      tag.match(/\sproperty=["']([^"']+)["']/i) ??
      tag.match(/\sname=["']([^"']+)["']/i);
    const contentMatch = tag.match(/\scontent=["']([\s\S]*?)["']/i);

    if (!keyMatch || !contentMatch) continue;

    const key = keyMatch[1].trim().toLowerCase();
    const value = decodeHtml(contentMatch[1]);
    if (!meta[key] && value) meta[key] = value;
  }

  return meta;
}

function safeParseJson(raw: string) {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(cleaned.replace(/\n/g, " "));
    } catch {
      return null;
    }
  }
}

function flattenJsonLdEntry(entry: any): any[] {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry.flatMap(flattenJsonLdEntry);
  if (Array.isArray(entry["@graph"])) return flattenJsonLdEntry(entry["@graph"]);
  return [entry];
}

function parseJsonLd(html: string) {
  const parsed: any[] = [];

  for (const match of html.matchAll(SCRIPT_LD_REGEX)) {
    const json = safeParseJson(decodeHtml(match[1] ?? ""));
    if (!json) continue;
    parsed.push(...flattenJsonLdEntry(json));
  }

  return parsed;
}

function normalizeCondition(value: string): string {
  const lower = value.toLowerCase();

  if (lower.includes("new") && lower.includes("tag")) return "NEW_WITH_TAGS";
  if (lower.includes("new") && lower.includes("defect")) return "NEW_WITH_DEFECTS";
  if (lower.includes("new")) return "NEW_WITHOUT_TAGS";
  if (lower.includes("like new") || lower.includes("excellent")) return "LIKE_NEW";
  if (lower.includes("very good")) return "VERY_GOOD";
  if (lower.includes("good")) return "GOOD";
  if (lower.includes("acceptable") || lower.includes("fair")) return "ACCEPTABLE";
  if (lower.includes("parts") || lower.includes("not working")) {
    return "FOR_PARTS_OR_NOT_WORKING";
  }

  return "";
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function sourceFromHostname(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host.includes("ebay.")) return "eBay";
  if (host.includes("vinted.")) return "Vinted";
  if (host.includes("depop.")) return "Depop";
  if (host.includes("facebook.")) return "Facebook Marketplace";
  if (host.includes("gumtree.")) return "Gumtree";
  if (host.includes("amazon.")) return "Amazon";
  if (host.includes("etsy.")) return "Etsy";
  if (host.includes("tiktok.")) return "TikTok Shop";
  if (host.includes("instagram.")) return "Instagram";
  return "";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const inputUrl = typeof body?.url === "string" ? body.url.trim() : "";

  if (!inputUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only HTTP(S) URLs are supported" }, { status: 400 });
  }

  const res = await fetch(parsedUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json(
      {
        error: "Could not fetch listing page. Try opening the link in your browser first.",
      },
      { status: 400 },
    );
  }

  const html = await res.text();
  const meta = parseMetaTags(html);
  const jsonLd = parseJsonLd(html);

  const productNode = jsonLd.find((entry) => {
    const type = toStringValue(entry?.["@type"]).toLowerCase();
    return type.includes("product");
  });

  const title =
    meta["og:title"] ||
    meta["twitter:title"] ||
    toStringValue(productNode?.name) ||
    extractTitle(html);

  const brand =
    toStringValue(productNode?.brand?.name) ||
    toStringValue(productNode?.brand) ||
    meta["product:brand"] ||
    "";

  const price =
    toStringValue(productNode?.offers?.price) ||
    toStringValue(productNode?.price) ||
    meta["product:price:amount"] ||
    "";

  const conditionRaw =
    toStringValue(productNode?.itemCondition) ||
    meta["product:condition"] ||
    meta["og:condition"] ||
    "";

  const condition = normalizeCondition(conditionRaw);

  const size =
    toStringValue(productNode?.size) ||
    toStringValue(productNode?.additionalProperty?.find?.((x: any) =>
      toStringValue(x?.name).toLowerCase().includes("size"),
    )?.value) ||
    "";

  const description =
    toStringValue(productNode?.description) || meta["og:description"] || "";

  return NextResponse.json({
    imported: {
      titleOverride: title,
      brand,
      purchaseCost: price,
      condition,
      size,
      notesSnippet: description,
      purchasedFrom: sourceFromHostname(parsedUrl.hostname),
    },
  });
}
