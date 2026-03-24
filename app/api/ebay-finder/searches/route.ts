import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const searches = await prisma.ebaySearch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { results: true },
      },
      results: {
        where: { status: "analysed", aiRecommendation: { in: ["buy", "maybe"] } },
        select: { id: true },
      },
    },
  });

  return NextResponse.json(
    searches.map((s) => ({
      id: s.id,
      name: s.name,
      keywords: s.keywords,
      category: s.category,
      condition: s.condition,
      maxBuyPrice: s.maxBuyPrice ? Number(s.maxBuyPrice) : null,
      minProfitMargin: Number(s.minProfitMargin),
      active: s.active,
      lastRunAt: s.lastRunAt,
      createdAt: s.createdAt,
      totalResults: s._count.results,
      profitableCount: s.results.length,
    })),
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, keywords, category, condition, maxBuyPrice, minProfitMargin } = body as {
    name: string;
    keywords: string;
    category?: string;
    condition?: string;
    maxBuyPrice?: number;
    minProfitMargin?: number;
  };

  if (!name?.trim() || !keywords?.trim()) {
    return NextResponse.json({ error: "name and keywords are required" }, { status: 400 });
  }

  const search = await prisma.ebaySearch.create({
    data: {
      name: name.trim(),
      keywords: keywords.trim(),
      category: category?.trim() || null,
      condition: condition?.trim() || null,
      maxBuyPrice: maxBuyPrice != null ? maxBuyPrice : null,
      minProfitMargin: minProfitMargin ?? 20,
    },
  });

  return NextResponse.json({ id: search.id });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.ebaySearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
