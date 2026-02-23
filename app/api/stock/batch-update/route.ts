import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, StockStatus } from "@prisma/client";

type Body = {
  skus?: string[];
  action?: "set_status" | "markdown" | "move_location" | "archive";
  status?: string;
  markdownPercent?: number;
  locationCode?: string;
  expectedUpdatedAt?: Record<string, string>;
};

export async function POST(req: Request) {
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const skus = Array.isArray(body.skus) ? body.skus.filter(Boolean) : [];

  if (skus.length === 0) {
    return NextResponse.json({ error: "No SKUs provided" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const expectedUpdatedAt = body.expectedUpdatedAt ?? {};

  const units = await prisma.stockUnit.findMany({
    where: { sku: { in: skus }, archived: false },
    select: { sku: true, purchaseCost: true, updatedAt: true },
  });

  const skuToUnit = new Map(units.map((u) => [u.sku, u]));
  const conflictSkus: string[] = [];
  const actionableSkus = skus.filter((sku) => {
    const unit = skuToUnit.get(sku);
    if (!unit) return false;

    const expected = expectedUpdatedAt[sku];
    if (!expected) return true;

    const expectedTime = new Date(expected).getTime();
    const currentTime = unit.updatedAt.getTime();

    if (!Number.isFinite(expectedTime) || expectedTime !== currentTime) {
      conflictSkus.push(sku);
      return false;
    }

    return true;
  });

  if (actionableSkus.length === 0) {
    return NextResponse.json(
      { ok: true, updated: 0, conflictSkus },
      { status: conflictSkus.length ? 409 : 200 },
    );
  }

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const now = new Date();
  let logDetails: Prisma.JsonObject = {};

  if (body.action === "set_status") {
    const status = body.status as StockStatus;
    if (!Object.values(StockStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    updates.push(
      prisma.stockUnit.updateMany({
        where: { sku: { in: actionableSkus } },
        data: { status },
      }),
    );
    logDetails = { status };
  }

  if (body.action === "markdown") {
    const markdownPercent = Number(body.markdownPercent);
    if (
      !Number.isFinite(markdownPercent) ||
      markdownPercent < 0 ||
      markdownPercent > 100
    ) {
      return NextResponse.json({ error: "Invalid markdownPercent" }, { status: 400 });
    }

    const multiplier = 1 - markdownPercent / 100;
    for (const sku of actionableSkus) {
      const unit = skuToUnit.get(sku);
      if (!unit) continue;

      const current = Number(unit.purchaseCost);
      const nextCost = Math.max(0, Number((current * multiplier).toFixed(2)));

      updates.push(
        prisma.stockUnit.update({
          where: { sku },
          data: { purchaseCost: nextCost },
        }),
      );
    }
    logDetails = { markdownPercent };
  }

  if (body.action === "move_location") {
    const locationCode = String(body.locationCode ?? "")
      .trim()
      .toUpperCase();
    if (!locationCode) {
      return NextResponse.json({ error: "Invalid locationCode" }, { status: 400 });
    }

    const loc = await prisma.location.upsert({
      where: { code: locationCode },
      update: {},
      create: { code: locationCode, type: "Box" },
      select: { id: true },
    });

    updates.push(
      prisma.stockUnit.updateMany({
        where: { sku: { in: actionableSkus } },
        data: { locationId: loc.id },
      }),
    );
    logDetails = { locationCode };
  }

  if (body.action === "archive") {
    updates.push(
      prisma.stockUnit.updateMany({
        where: { sku: { in: actionableSkus } },
        data: { archived: true, archivedAt: now },
      }),
    );
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  await prisma.$transaction([
    ...updates,
    prisma.inventoryActionLog.create({
      data: {
        action: body.action,
        skuCount: actionableSkus.length,
        skus: actionableSkus,
        conflictSkus,
        details: logDetails,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, updated: actionableSkus.length, conflictSkus });
}
