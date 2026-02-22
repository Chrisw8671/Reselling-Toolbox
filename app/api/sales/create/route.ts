import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Line = { stockUnitId: string; salePrice: number };

export async function POST(req: Request) {
  const body = await req.json();

  const {
    platform,
    saleDate,
    orderRef,
    shippingCharged,
    platformFees,
    shippingCost,
    otherCosts,
    lines,
  } = body as {
    platform: string;
    saleDate?: string; // yyyy-mm-dd
    orderRef?: string;
    shippingCharged?: number;
    platformFees?: number;
    shippingCost?: number;
    otherCosts?: number;
    lines: Line[];
  };

  if (!platform?.trim()) return NextResponse.json({ error: "Platform is required" }, { status: 400 });
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Add at least 1 item to the sale" }, { status: 400 });
  }

  // basic validation
  for (const l of lines) {
    if (!l.stockUnitId) return NextResponse.json({ error: "Invalid line item" }, { status: 400 });
    if (!Number.isFinite(l.salePrice)) return NextResponse.json({ error: "Sale price must be a number" }, { status: 400 });
  }

  const sale = await prisma.$transaction(async (tx) => {
    // Ensure items exist and are not already sold
    const ids = lines.map((l) => l.stockUnitId);
    const found = await tx.stockUnit.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    if (found.length !== ids.length) {
      throw new Error("One or more items no longer exist");
    }
    if (found.some((x) => x.status === "SOLD")) {
      throw new Error("One or more items are already SOLD");
    }

    const createdSale = await tx.sale.create({
      data: {
        platform: platform.trim(),
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        orderRef: orderRef?.trim() || null,
        shippingCharged: shippingCharged ?? 0,
        platformFees: platformFees ?? 0,
        shippingCost: shippingCost ?? 0,
        otherCosts: otherCosts ?? 0,
      },
      select: { id: true },
    });

    await tx.saleLine.createMany({
      data: lines.map((l) => ({
        saleId: createdSale.id,
        stockUnitId: l.stockUnitId,
        salePrice: l.salePrice,
      })),
    });

    await tx.stockUnit.updateMany({
      where: { id: { in: ids } },
      data: { status: "SOLD" },
    });

    return createdSale;
  });

  return NextResponse.json({ saleId: sale.id });
}
