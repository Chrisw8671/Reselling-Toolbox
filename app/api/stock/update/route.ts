import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

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
  } = body as {
    sku: string;
    titleOverride?: string | null;
    condition?: string | null;
    notes?: string | null;
    status?: string | null;
    purchaseCost?: number | null;
    extraCost?: number | null;
    purchasedAt?: string | null;
    locationCode?: string | null;
    archived?: boolean | null;
  };

  if (!sku) return NextResponse.json({ error: "Missing sku" }, { status: 400 });

  // If provided, upsert location by code
  let locationId: string | null | undefined = undefined;
  if (locationCode !== undefined) {
    const code = (locationCode ?? "").trim();
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
    where: { sku },
    data: {
      titleOverride: titleOverride === undefined ? undefined : titleOverride,
      condition: condition === undefined ? undefined : condition,
      notes: notes === undefined ? undefined : notes,
      status: status === undefined ? undefined : (status as any),
      purchaseCost: purchaseCost === undefined || purchaseCost === null ? undefined : purchaseCost,
      extraCost: extraCost === undefined || extraCost === null ? undefined : extraCost,
      purchasedAt: purchasedAt === undefined || !purchasedAt ? undefined : new Date(purchasedAt),
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