import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
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

  if (!sku) return NextResponse.json({ error: "Missing SKU" }, { status: 400 });

  let locationId: string | null = null;

  if (locationCode && locationCode.trim()) {
    const loc = await prisma.location.upsert({
      where: { code: locationCode.toUpperCase() },
      update: {},
      create: { code: locationCode.toUpperCase(), type: "Box" },
      select: { id: true },
    });
    locationId = loc.id;
  }

  await prisma.stockUnit.create({
    data: {
      sku,
      titleOverride,
      condition,
      status,
      purchaseCost,
      extraCost,
      purchasedAt: new Date(purchasedAt),
      locationId,
      notes,
    },
  });

  return NextResponse.json({ sku });
}