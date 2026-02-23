import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";

function parseOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  const {
    sku,
    titleOverride,
    condition,
    status,
    purchaseCost,
    extraCost,
    purchasedAt,
    locationCode,
    notes,
  } = body;

  const normalizedSku = parseOptionalString(sku);
  if (!normalizedSku) {
    return NextResponse.json({ error: "Missing SKU" }, { status: 400 });
  }

  const parsedPurchaseDate = parseOptionalDate(purchasedAt);
  if (!parsedPurchaseDate) {
    return NextResponse.json({ error: "Invalid purchasedAt date" }, { status: 400 });
  }

  let locationId: string | null = null;
  const normalizedLocationCode = parseOptionalString(locationCode)?.toUpperCase() ?? null;

  if (normalizedLocationCode) {
    const loc = await prisma.location.upsert({
      where: { code: normalizedLocationCode },
      update: {},
      create: { code: normalizedLocationCode, type: "Box" },
      select: { id: true },
    });
    locationId = loc.id;
  }

  await prisma.stockUnit.create({
    data: {
      sku: normalizedSku,
      titleOverride: parseOptionalString(titleOverride),
      condition: parseOptionalString(condition),
      status: parseStockStatus(status),
      purchaseCost: parseOptionalNumber(purchaseCost),
      extraCost: parseOptionalNumber(extraCost),
      purchasedAt: parsedPurchaseDate,
      locationId,
      notes: parseOptionalString(notes),
    },
  });

  return NextResponse.json({ sku: normalizedSku });
}
