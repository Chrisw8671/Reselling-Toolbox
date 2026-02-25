import { prisma } from "@/lib/prisma";

export default async function MobileWishlistPage() {
  const watchedProducts = await prisma.productWatch.findMany({
    where: { active: true },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    take: 20,
    select: {
      id: true,
      priority: true,
      targetBuyPrice: true,
      notes: true,
      product: { select: { title: true, brand: true } },
    },
  });

  return (
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Wishlist</h1>
          <div className="muted" style={{ marginTop: 4 }}>Active product watchlist priorities.</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {watchedProducts.length === 0 ? (
          <div className="tableWrap" style={{ padding: 14 }}>
            <div className="muted">No active wishlist items yet.</div>
          </div>
        ) : (
          watchedProducts.map((watch) => (
            <div key={watch.id} className="tableWrap" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{watch.product.title}</div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                {watch.product.brand || "No brand"} • Priority {watch.priority}
              </div>
              <div style={{ marginTop: 6, fontSize: 14 }}>
                Target buy {watch.targetBuyPrice ? `£${Number(watch.targetBuyPrice).toFixed(2)}` : "not set"}
              </div>
              {watch.notes ? (
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{watch.notes}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
