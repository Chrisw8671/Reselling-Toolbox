import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { sku } = await req.json();

  if (!sku) return NextResponse.json({ error: "Missing sku" }, { status: 400 });

  await prisma.stockUnit.update({
    where: { sku },
    data: { archived: true, archivedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
