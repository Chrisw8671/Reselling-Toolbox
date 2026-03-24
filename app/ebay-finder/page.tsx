import { prisma } from "@/lib/prisma";
import EbayFinderResults from "@/components/EbayFinderResults";
import Link from "next/link";

type Props = {
  searchParams?: Promise<{ searchId?: string }>;
};

export default async function EbayFinderPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const initialSearchId = sp.searchId ?? null;

  const searches = await prisma.ebaySearch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { results: true } },
      results: {
        where: { status: "analysed", aiRecommendation: { in: ["buy", "maybe"] } },
        select: { id: true },
      },
    },
  });

  const searchData = searches.map((s) => ({
    id: s.id,
    name: s.name,
    keywords: s.keywords,
    category: s.category,
    condition: s.condition,
    maxBuyPrice: s.maxBuyPrice ? Number(s.maxBuyPrice) : null,
    minProfitMargin: Number(s.minProfitMargin),
    active: s.active,
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    totalResults: s._count.results,
    profitableCount: s.results.length,
  }));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>eBay Profit Finder</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>
            Scan eBay listings and find items worth buying to resell for profit.
          </p>
        </div>
        <Link href="/ebay-finder/new" className="btn">
          + New Search
        </Link>
      </div>

      <EbayFinderResults searches={searchData} initialSearchId={initialSearchId} />
    </main>
  );
}
