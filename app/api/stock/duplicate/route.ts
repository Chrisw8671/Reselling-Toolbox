import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function yymm() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

async function nextSku() {
  const prefix = yymm();
  const last = await prisma.stockUnit.findFirst({
    where: { sku: { startsWith: `${prefix}-` } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });
  const lastNum = last?.sku ? parseInt(last.sku.split("-")[1], 10) : 0;
  const nextNum = lastNum + 1;
  return `${prefix}-${String(nextNum).padStart(5, "0")}`;
}

export async function POST(req: Request) {
  const { sku } = await req.json();
  if (!sku) return NextResponse.json({ error: "Missing sku" }, { status: 400 });

  const source = await prisma.stockUnit.findUnique({ where: { sku } });
  if (!source) return NextResponse.json({ error: "SKU not found" }, { status: 404 });

  const newSku = await nextSku();

  const created = await prisma.stockUnit.create({
    data: {
      sku: newSku,
      productId: source.productId,
      purchaseId: source.purchaseId,
      titleOverride: source.titleOverride,
      condition: source.condition,
      purchaseCost: source.purchaseCost,
      extraCost: source.extraCost,
      status: "IN_STOCK", // reset for new unit
      purchasedAt: source.purchasedAt,
      notes: source.notes,
      locationId: source.locationId,
    },
    select: { sku: true },
  });

  return NextResponse.json({ sku: created.sku });
}
