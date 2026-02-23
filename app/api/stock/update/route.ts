import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockStatus } from "@prisma/client";

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
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
    notes,
    status,
    purchaseCost,
    extraCost,
    purchasedAt, // "YYYY-MM-DD"
    locationCode, // "BOX-01"
    archived, // boolean
  } = body;

  const normalizedSku = parseOptionalString(sku);
  if (!normalizedSku) {
    return NextResponse.json({ error: "Missing sku" }, { status: 400 });
  }

  const parsedPurchaseDate = parseOptionalDate(purchasedAt);
  if (parsedPurchaseDate === null) {
    return NextResponse.json({ error: "Invalid purchasedAt date" }, { status: 400 });
  }

  // If provided, upsert location by code
  let locationId: string | null | undefined = undefined;
  if (locationCode !== undefined) {
    const code = parseOptionalString(locationCode);
    if (!code) {
      locationId = null; // clear location if empty string
    } else {
      const loc = await prisma.location.upsert({
        where: { code: code.toUpperCase() },
        update: {},
        create: { code: code.toUpperCase(), type: "Box" },
        select: { id: true },
      });
      locationId = loc.id;
    }
  }

  await prisma.stockUnit.update({
    where: { sku: normalizedSku },
    data: {
      titleOverride: parseOptionalString(titleOverride),
      condition: parseOptionalString(condition),
      notes: parseOptionalString(notes),
      status: parseStockStatus(status),
      purchaseCost: parseOptionalNumber(purchaseCost),
      extraCost: parseOptionalNumber(extraCost),
      purchasedAt: parsedPurchaseDate,
      locationId,
      archived: archived === undefined || archived === null ? undefined : archived,
      archivedAt:
        archived === undefined || archived === null
          ? undefined
          : archived
            ? new Date()
            : null,
    },
  });

  return NextResponse.json({ ok: true });
}
