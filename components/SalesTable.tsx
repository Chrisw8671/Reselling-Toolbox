"use client";

import { useRouter } from "next/navigation";

type SaleRow = {
  id: string;
  saleDate: string; // ISO
  platform: string;
  itemCount: number;
  revenue: number;
  costs: number;
  profit: number;
  orderRef: string;
};

export default function SalesTable({ rows }: { rows: SaleRow[] }) {
  const router = useRouter();

  return (
    <div className="tableWrap">
        <div className="tableScroll"></div>
      <table className="table">
        <thead className="thead">
          <tr>
            <th className="th" style={{ width: 170 }}>Date</th>
            <th className="th" style={{ width: 140 }}>Platform</th>
            <th className="th" style={{ width: 100 }}>Items</th>
            <th className="th" style={{ width: 140 }}>Revenue</th>
            <th className="th" style={{ width: 140 }}>Costs</th>
            <th className="th" style={{ width: 140 }}>Profit</th>
            <th className="th">Order Ref</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="tr rowClick"
              onClick={() => router.push(`/sales/${encodeURIComponent(r.id)}`)}
            >
              <td className="td">{new Date(r.saleDate).toLocaleDateString()}</td>
              <td className="td">{r.platform}</td>
              <td className="td">{r.itemCount}</td>
              <td className="td">£{r.revenue.toFixed(2)}</td>
              <td className="td">£{r.costs.toFixed(2)}</td>
              <td className="td">
                <span className={`badge ${r.profit >= 0 ? "profitPos" : "profitNeg"}`}>
                  £{r.profit.toFixed(2)}
                </span>
              </td>
              <td className="td">{r.orderRef || <span className="muted">—</span>}</td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr className="tr">
              <td className="td muted" colSpan={7}>
                No sales yet. Create your first sale.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
