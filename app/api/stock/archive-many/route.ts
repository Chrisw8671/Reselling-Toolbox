import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const skus: string[] = Array.isArray(body?.skus) ? body.skus : [];

  if (skus.length === 0) {
    return NextResponse.json({ error: "No SKUs provided" }, { status: 400 });
  }

  const result = await prisma.stockUnit.updateMany({
    where: { sku: { in: skus } },
    data: { archived: true, archivedAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}