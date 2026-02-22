import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sku = (searchParams.get("sku") ?? "").trim();

  if (!sku) return NextResponse.json({ error: "Missing sku" }, { status: 400 });

  const item = await prisma.stockUnit.findUnique({
    where: { sku },
    select: {
      id: true,
      sku: true,
      titleOverride: true,
      status: true,
      purchaseCost: true,
      archived: true,
      location: { select: { code: true } },
    },
  });

  if (!item) return NextResponse.json({ error: "SKU not found" }, { status: 404 });
  if (item.status === "SOLD") return NextResponse.json({ error: "Item already SOLD" }, { status: 409 });
  if (item.archived) return NextResponse.json({ error: "Item is archived" }, { status: 409 });

  return NextResponse.json({ item });
}
