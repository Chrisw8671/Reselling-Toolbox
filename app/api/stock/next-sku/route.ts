import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function yymm() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export async function GET() {
  const prefix = yymm();

  const last = await prisma.stockUnit.findFirst({
    where: { sku: { startsWith: `${prefix}-` } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  const lastNum = last?.sku ? parseInt(last.sku.split("-")[1], 10) : 0;
  const nextNum = lastNum + 1;

  return NextResponse.json({
    sku: `${prefix}-${String(nextNum).padStart(5, "0")}`,
  });
}