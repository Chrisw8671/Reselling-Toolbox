import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchActiveListings, getSoldPriceData } from "@/lib/ebay";
import { analyseItem } from "@/lib/claude-analysis";

export async function POST(req: Request) {
  const { searchId } = (await req.json()) as { searchId: string };

  if (!searchId) {
    return NextResponse.json({ error: "searchId required" }, { status: 400 });
  }

  const search = await prisma.ebaySearch.findUnique({ where: { id: searchId } });
  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }

  const minMargin = Number(search.minProfitMargin);
  const maxBuyPrice = search.maxBuyPrice ? Number(search.maxBuyPrice) : null;

  // 1. Fetch active listings from eBay
  let listings;
  try {
    listings = await searchActiveListings({
      keywords: search.keywords,
      category: search.category,
      condition: search.condition,
      maxPrice: maxBuyPrice,
      limit: 50,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "eBay API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let totalProcessed = 0;
  let profitable = 0;
  let analysed = 0;

  for (const listing of listings) {
    totalProcessed++;

    // 2. Get sold price data for this item
    const soldData = await getSoldPriceData({
      keywords: search.keywords,
      condition: search.condition,
    }).catch(() => null);

    if (!soldData || soldData.avgSoldPrice <= 0) {
      // Save without price comparison
      await prisma.ebaySearchResult.upsert({
        where: {
          // Use a compound approach by checking for existing record
          id: (
            await prisma.ebaySearchResult.findFirst({
              where: { searchId, ebayItemId: listing.ebayItemId },
              select: { id: true },
            })
          )?.id ?? "new-" + listing.ebayItemId,
        },
        update: {
          title: listing.title,
          currentPrice: listing.currentPrice,
          imageUrl: listing.imageUrl,
          itemUrl: listing.itemUrl,
          condition: listing.condition,
          avgSoldPrice: null,
          soldSampleSize: null,
          estimatedMargin: null,
          status: "pending",
          scannedAt: new Date(),
        },
        create: {
          searchId,
          ebayItemId: listing.ebayItemId,
          title: listing.title,
          currentPrice: listing.currentPrice,
          imageUrl: listing.imageUrl,
          itemUrl: listing.itemUrl,
          condition: listing.condition,
          status: "pending",
        },
      });
      continue;
    }

    // 3. Calculate estimated margin
    const estimatedMargin =
      ((soldData.avgSoldPrice - listing.currentPrice) / listing.currentPrice) * 100;

    // 4. Only run AI analysis if margin meets threshold
    let aiAnalysis: string | null = null;
    let aiConfidence: number | null = null;
    let aiRecommendation: string | null = null;
    let status = "pending";

    if (estimatedMargin >= minMargin) {
      profitable++;
      try {
        const result = await analyseItem({
          title: listing.title,
          currentPrice: listing.currentPrice,
          avgSoldPrice: soldData.avgSoldPrice,
          soldSampleSize: soldData.soldSampleSize,
          condition: listing.condition,
          imageUrl: listing.imageUrl,
        });
        aiAnalysis = result.reasoning;
        aiConfidence = result.confidence;
        aiRecommendation = result.recommendation;
        status = "analysed";
        analysed++;
      } catch {
        status = "pending";
      }
    }

    // 5. Upsert result in DB
    const existing = await prisma.ebaySearchResult.findFirst({
      where: { searchId, ebayItemId: listing.ebayItemId },
      select: { id: true },
    });

    if (existing) {
      await prisma.ebaySearchResult.update({
        where: { id: existing.id },
        data: {
          title: listing.title,
          currentPrice: listing.currentPrice,
          imageUrl: listing.imageUrl,
          itemUrl: listing.itemUrl,
          condition: listing.condition,
          avgSoldPrice: soldData.avgSoldPrice,
          soldSampleSize: soldData.soldSampleSize,
          estimatedMargin: Math.round(estimatedMargin * 100) / 100,
          aiAnalysis,
          aiConfidence,
          aiRecommendation,
          status,
          scannedAt: new Date(),
        },
      });
    } else {
      await prisma.ebaySearchResult.create({
        data: {
          searchId,
          ebayItemId: listing.ebayItemId,
          title: listing.title,
          currentPrice: listing.currentPrice,
          imageUrl: listing.imageUrl,
          itemUrl: listing.itemUrl,
          condition: listing.condition,
          avgSoldPrice: soldData.avgSoldPrice,
          soldSampleSize: soldData.soldSampleSize,
          estimatedMargin: Math.round(estimatedMargin * 100) / 100,
          aiAnalysis,
          aiConfidence,
          aiRecommendation,
          status,
        },
      });
    }
  }

  // Update lastRunAt on the search
  await prisma.ebaySearch.update({
    where: { id: searchId },
    data: { lastRunAt: new Date() },
  });

  return NextResponse.json({ total: totalProcessed, profitable, analysed });
}
