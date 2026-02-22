"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatStatus } from "@/lib/status";

type Item = {
  sku: string;
  titleOverride: string | null;
  status: string;
  purchaseCost: number;
  createdAt: string; // ISO string
  location: { code: string } | null;
};

export default function InventoryTable({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const selectedSkus = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const allChecked = items.length > 0 && selectedSkus.length === items.length;

  function toggleAll() {
    if (allChecked) return setSelected({});
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.sku] = true;
    setSelected(next);
  }

  function toggleOne(sku: string) {
    setSelected((prev) => ({ ...prev, [sku]: !prev[sku] }));
  }

  async function archiveSelected() {
    if (selectedSkus.length === 0) return;
    if (!confirm(`Archive ${selectedSkus.length} item(s)?`)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/stock/archive-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: selectedSkus }),
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

  function formatDate(iso: string) {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
  }

  return (
    <div className="tableWrap">
      {/* Bulk actions row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          {items.length} item(s) • Selected: {selectedSkus.length}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn"
            type="button"
            disabled={busy || selectedSkus.length === 0}
            onClick={archiveSelected}
            style={{ opacity: busy || selectedSkus.length === 0 ? 0.6 : 1 }}
          >
            {busy ? "Archiving..." : `Archive selected (${selectedSkus.length})`}
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
              <th className="th" style={{ width: 170 }}>SKU</th>
              <th className="th">Title</th>
              <th className="th" style={{ width: 150 }}>Status</th>
              <th className="th" style={{ width: 110 }}>Loc</th>
              <th className="th" style={{ width: 120 }}>Cost</th>
              <th className="th" style={{ width: 170 }}>Created</th>
              <th className="th" style={{ width: 160, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => (
              <tr
                className="tr rowClick"
                key={it.sku}
                onClick={() => router.push(`/inventory/${encodeURIComponent(it.sku)}`)}
              >
                <td className="td" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selected[it.sku]}
                    onChange={() => toggleOne(it.sku)}
                  />
                </td>

                <td className="td">{it.sku}</td>

                <td className="td titleCell">
                  {it.titleOverride ?? <span className="muted">—</span>}
                </td>

                <td className="td">
                  <span className={`badge ${it.status}`}>{formatStatus(it.status)}</span>
                </td>

                <td className="td">{it.location?.code ?? <span className="muted">—</span>}</td>

                <td className="td">£{it.purchaseCost.toFixed(2)}</td>

                <td className="td">{formatDate(it.createdAt)}</td>

                <td className="td" style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <div className="actions">
                    <button
                      className="iconBtn"
                      title="Edit"
                      type="button"
                      onClick={() => router.push(`/inventory/${encodeURIComponent(it.sku)}`)}
                    >
                      ✎
                    </button>

                    <button
                      className="iconBtn"
                      title="Duplicate"
                      type="button"
                      onClick={async () => {
                        const res = await fetch("/api/stock/duplicate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sku: it.sku }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          alert(data.error ?? "Failed to duplicate");
                          return;
                        }
                        router.refresh();
                        router.push(`/inventory/${encodeURIComponent(data.sku)}`);
                      }}
                    >
                      ⧉
                    </button>

                    <button
                      className="iconBtn"
                      title="Archive"
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Archive ${it.sku}?`)) return;

                        const res = await fetch("/api/stock/archive", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sku: it.sku }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          alert(data.error ?? "Failed to archive");
                          return;
                        }
                        router.refresh();
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr className="tr">
                <td className="td muted" colSpan={8}>
                  No matching items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}