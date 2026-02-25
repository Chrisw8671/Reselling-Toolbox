import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";

function parseOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumberOrZero(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseStockStatus(value: unknown) {
  const normalized = parseOptionalString(value);
  if (!normalized) return undefined;

  return Object.values(StockStatus).includes(normalized as StockStatus)
    ? (normalized as StockStatus)
    : undefined;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;

  const normalizedSku = parseOptionalString(body.sku);
  if (!normalizedSku) {
    return NextResponse.json({ error: "Missing SKU" }, { status: 400 });
  }

  // allow purchasedAt to be omitted; schema defaults to now()
  const parsedPurchaseDate = parseOptionalDate(body.purchasedAt);

  // location
  let locationId: string | null = null;
  const normalizedLocationCode = parseOptionalString(body.locationCode)?.toUpperCase() ?? null;

  if (normalizedLocationCode) {
    const loc = await prisma.location.upsert({
      where: { code: normalizedLocationCode },
      update: {},
      create: { code: normalizedLocationCode, type: "Box" },
      select: { id: true },
    });
    locationId = loc.id;
  }

  // Write all fields you want stored on StockUnit
  await prisma.stockUnit.create({
    data: {
      sku: normalizedSku,
      titleOverride: parseOptionalString(body.titleOverride),
      condition: parseOptionalString(body.condition),

      // if missing/invalid, Prisma default IN_STOCK applies
      status: parseStockStatus(body.status),

      // required decimals: always write a number (default 0)
      purchaseCost: parseNumberOrZero(body.purchaseCost),
      extraCost: parseNumberOrZero(body.extraCost),

      // optional date: only set when valid
      ...(parsedPurchaseDate ? { purchasedAt: parsedPurchaseDate } : {}),

      // new purchase fields
      purchasedFrom: parseOptionalString(body.purchasedFrom),
      purchaseRef: parseOptionalString(body.purchaseRef),
      purchaseUrl: parseOptionalString(body.purchaseUrl),
      brand: parseOptionalString(body.brand),
      size: parseOptionalString(body.size),

      // pricing fields (optional)
      targetMarginPct: parseOptionalNumber(body.targetMarginPct),
      recommendedPrice: parseOptionalNumber(body.recommendedPrice),
      lastPricingEvalAt: parseOptionalDate(body.lastPricingEvalAt),

      locationId,
      notes: parseOptionalString(body.notes),
    },
  });

  return NextResponse.json({ sku: normalizedSku });
}