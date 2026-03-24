import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const searchId = searchParams.get("searchId");
  const recommendation = searchParams.get("recommendation"); // buy | maybe | skip | all
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 50;

  if (!searchId) {
    return NextResponse.json({ error: "searchId required" }, { status: 400 });
  }

  const where = {
    searchId,
    status: { not: "dismissed" },
    ...(recommendation && recommendation !== "all"
      ? { aiRecommendation: recommendation }
      : {}),
  };

  const [total, results] = await Promise.all([
    prisma.ebaySearchResult.count({ where }),
    prisma.ebaySearchResult.findMany({
      where,
      orderBy: [{ estimatedMargin: "desc" }, { scannedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageCount: Math.ceil(total / PAGE_SIZE),
    results: results.map((r) => ({
      id: r.id,
      ebayItemId: r.ebayItemId,
      title: r.title,
      currentPrice: Number(r.currentPrice),
      imageUrl: r.imageUrl,
      itemUrl: r.itemUrl,
      condition: r.condition,
      avgSoldPrice: r.avgSoldPrice != null ? Number(r.avgSoldPrice) : null,
      soldSampleSize: r.soldSampleSize,
      estimatedMargin: r.estimatedMargin != null ? Number(r.estimatedMargin) : null,
      aiAnalysis: r.aiAnalysis,
      aiConfidence: r.aiConfidence,
      aiRecommendation: r.aiRecommendation,
      status: r.status,
      scannedAt: r.scannedAt,
    })),
  });
}
