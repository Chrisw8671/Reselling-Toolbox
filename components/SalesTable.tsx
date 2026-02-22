"use client";

import { useMemo, useState } from "react";
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

function formatDate(iso: string) {
  // deterministic (no hydration warnings)
  return new Date(iso).toISOString().slice(0, 10);
}

export default function SalesTable({ rows }: { rows: SaleRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const allChecked = rows.length > 0 && selectedIds.length === rows.length;

  function toggleAll() {
    if (allChecked) return setSelected({});
    const next: Record<string, boolean> = {};
    for (const r of rows) next[r.id] = true;
    setSelected(next);
  }

  function toggleOne(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function archiveSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Archive ${selectedIds.length} sale(s)?`)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/sales/archive-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Archive failed");
        return;
      }

      setSelected({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function archiveOne(id: string) {
    if (!confirm("Archive this sale?")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/sales/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Archive failed");
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tableWrap">
      {/* Bulk actions row (matches InventoryTable) */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          {rows.length} sale(s) • Selected: {selectedIds.length}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn"
            type="button"
            disabled={busy || selectedIds.length === 0}
            onClick={archiveSelected}
            style={{ opacity: busy || selectedIds.length === 0 ? 0.6 : 1 }}
          >
            {busy ? "Archiving..." : `Archive selected (${selectedIds.length})`}
          </button>
        </div>
      </div>

      <div className="tableScroll">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th" style={{ width: 44 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>

              <th className="th" style={{ width: 130 }}>Date</th>
              <th className="th" style={{ width: 160 }}>Platform</th>
              <th className="th" style={{ width: 90 }}>Items</th>
              <th className="th" style={{ width: 120 }}>Revenue</th>
              <th className="th" style={{ width: 120 }}>Costs</th>
              <th className="th" style={{ width: 130 }}>Profit</th>
              <th className="th">Order Ref</th>
              <th className="th" style={{ width: 120, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="tr rowClick"
                onClick={() => router.push(`/sales/${encodeURIComponent(r.id)}`)}
              >
                <td className="td" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>

                <td className="td">{formatDate(r.saleDate)}</td>
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

                <td className="td" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <div className="actions">
                    <button
                      className="iconBtn"
                      title="Open"
                      type="button"
                      onClick={() => router.push(`/sales/${encodeURIComponent(r.id)}`)}
                    >
                      ✎
                    </button>

                    <button
                      className="iconBtn"
                      title="Archive"
                      type="button"
                      disabled={busy}
                      onClick={() => archiveOne(r.id)}
                      style={{ opacity: busy ? 0.6 : 1 }}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr className="tr">
                <td className="td muted" colSpan={9}>
                  No sales yet. Create your first sale.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}