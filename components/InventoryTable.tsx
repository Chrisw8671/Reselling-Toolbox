"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatStatus } from "@/lib/status";
import { moneyGBP, isoDateTime } from "@/lib/format";

type Item = {
  sku: string;
  titleOverride: string | null;
  status: string;
  purchaseCost: number;
  createdAt: string;
  updatedAt: string;
  location: { code: string } | null;

  purchasedFrom?: string | null;
  purchaseRef?: string | null;
  brand?: string | null;
  size?: string | null;
  breakEvenPrice: number;
  targetMarginPct: number;
  recommendedPrice: number;
  markdownPct: number;
  pricingAlert: boolean;
};

const STOCK_STATUSES = ["IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

export default function InventoryTable({
  items,
  quickAction,
}: {
  items: Item[];
  quickAction?: "MARKDOWN_15" | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [markdownPercent, setMarkdownPercent] = useState("15");
  const [locationCode, setLocationCode] = useState("");

  const selectedSkus = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  const selectedUpdatedAt = useMemo(
    () =>
      selectedSkus.reduce<Record<string, string>>((acc, sku) => {
        const row = items.find((it) => it.sku === sku);
        if (row?.updatedAt) acc[sku] = row.updatedAt;
        return acc;
      }, {}),
    [items, selectedSkus],
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

  async function runBulkAction(payload: Record<string, unknown>, successMessage: string) {
    if (selectedSkus.length === 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/stock/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skus: selectedSkus,
          expectedUpdatedAt: selectedUpdatedAt,
          ...payload,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Bulk update failed");
        return;
      }

      const conflicts = Array.isArray(data?.conflictSkus) ? data.conflictSkus.length : 0;
      const conflictMessage = conflicts
        ? `\n${conflicts} item(s) skipped due to concurrent updates.`
        : "";

      alert(`${successMessage}${conflictMessage}`);
      setSelected({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!confirm(`Archive ${selectedSkus.length} item(s)?`)) return;
    await runBulkAction(
      { action: "archive" },
      `Archived ${selectedSkus.length} item(s).`,
    );
  }

  return (
    <div className="tableWrap">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="muted" style={{ fontSize: 13 }}>
          {items.length} item(s) • Selected: {selectedSkus.length}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ minWidth: 180 }}>
            Set status
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Choose…</option>
              {STOCK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn"
            type="button"
            disabled={busy || selectedSkus.length === 0 || !statusValue}
            onClick={() =>
              runBulkAction(
                { action: "set_status", status: statusValue },
                `Updated status for ${selectedSkus.length} item(s).`,
              )
            }
          >
            Apply status
          </button>

          <label style={{ minWidth: 140 }}>
            Markdown %
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={markdownPercent}
              onChange={(e) => setMarkdownPercent(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <button
            className="btn"
            type="button"
            disabled={busy || selectedSkus.length === 0}
            onClick={() =>
              runBulkAction(
                { action: "markdown", markdownPercent: Number(markdownPercent) },
                `Applied ${markdownPercent}% markdown to ${selectedSkus.length} item(s).`,
              )
            }
          >
            Apply markdown
          </button>

          <label style={{ minWidth: 140 }}>
            Move location
            <input
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              placeholder="BOX-01"
              style={{ width: "100%" }}
            />
          </label>
          <button
            className="btn"
            type="button"
            disabled={busy || selectedSkus.length === 0 || !locationCode.trim()}
            onClick={() =>
              runBulkAction(
                { action: "move_location", locationCode },
                `Moved ${selectedSkus.length} item(s) to ${locationCode.toUpperCase()}.`,
              )
            }
          >
            Move
          </button>

          <button
            className="btn"
            type="button"
            disabled={busy || selectedSkus.length === 0}
            onClick={archiveSelected}
            style={{ opacity: busy || selectedSkus.length === 0 ? 0.6 : 1 }}
          >
            {busy ? "Working..." : `Archive selected (${selectedSkus.length})`}
          </button>

          {quickAction === "MARKDOWN_15" && (
            <button
              className="btn"
              type="button"
              disabled={busy || selectedSkus.length === 0}
              onClick={() =>
                runBulkAction(
                  { action: "markdown", markdownPercent: 15 },
                  `Applied 15% markdown to ${selectedSkus.length} aged item(s).`,
                )
              }
              title="Quick action for aged inventory"
            >
              Mark down 15%
            </button>
          )}
        </div>
      </div>

      <div className="tableScroll">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th" style={{ width: 44 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>

              <th className="th" style={{ width: 170 }}>
                SKU
              </th>
              <th className="th">Title</th>

              <th className="th" style={{ width: 160 }}>
                Purchased From
              </th>
              <th className="th" style={{ width: 170 }}>
                Purchase Ref
              </th>
              <th className="th" style={{ width: 140 }}>
                Brand
              </th>
              <th className="th" style={{ width: 120 }}>
                Size
              </th>
              <th className="th" style={{ width: 150 }}>
                Status
              </th>
              <th className="th" style={{ width: 110 }}>
                Loc
              </th>
              <th className="th" style={{ width: 120 }}>
                Cost
              </th>
              <th className="th" style={{ width: 140 }}>
                Break-even
              </th>
              <th className="th" style={{ width: 170 }}>
                Recommended
              </th>
              <th className="th" style={{ width: 170 }}>
                Created
              </th>
              <th className="th" style={{ width: 160, textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => (
              <tr
                className="tr rowClick"
                key={it.sku}
                style={
                  it.pricingAlert ? { backgroundColor: "rgba(245, 158, 11, 0.1)" } : {}
                }
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
                  {it.purchasedFrom ? it.purchasedFrom : <span className="muted">—</span>}
                </td>
                <td className="td">
                  {it.purchaseRef ? it.purchaseRef : <span className="muted">—</span>}
                </td>
                <td className="td">
                  {it.brand ? it.brand : <span className="muted">—</span>}
                </td>
                <td className="td">
                  {it.size ? it.size : <span className="muted">—</span>}
                </td>

                <td className="td">
                  <span className={`badge ${it.status}`}>{formatStatus(it.status)}</span>
                  {it.pricingAlert && (
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                      Markdown due ({it.markdownPct}% suggested)
                    </div>
                  )}
                </td>

                <td className="td">
                  {it.location?.code ?? <span className="muted">—</span>}
                </td>
                <td className="td">{moneyGBP(it.purchaseCost)}</td>
                <td className="td">{moneyGBP(it.breakEvenPrice)}</td>
                <td className="td">
                  {moneyGBP(it.recommendedPrice)}
                  <div className="muted" style={{ fontSize: 12 }}>
                    Margin {it.targetMarginPct}%
                  </div>
                </td>
                <td className="td">{isoDateTime(it.createdAt)}</td>

                <td
                  className="td"
                  style={{ textAlign: "right" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="actions">
                    <button
                      className="iconBtn"
                      title="Edit"
                      type="button"
                      onClick={() =>
                        router.push(`/inventory/${encodeURIComponent(it.sku)}`)
                      }
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
                <td className="td muted" colSpan={14}>
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
