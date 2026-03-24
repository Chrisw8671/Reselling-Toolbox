// components/InventoryTable.tsx
"use client";

import { badgeClass, cx, ui } from "@/lib/ui";
import { useMemo, useState, useEffect } from "react";
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

  const [isMobile, setIsMobile] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [markdownPercent, setMarkdownPercent] = useState("15");
  const [locationCode, setLocationCode] = useState("");
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!copyToast) return;
    const t = window.setTimeout(() => setCopyToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [copyToast]);

  function skuHref(sku: string) {
    const encoded = encodeURIComponent(sku);
    return isMobile ? `/mobile/inventory/${encoded}` : `/inventory/${encoded}`;
  }

  async function copySkuToClipboard(sku: string) {
    try {
      await navigator.clipboard.writeText(sku);
      setCopyToast(`Copied ${sku}`);
    } catch {
      setCopyToast("Could not copy");
    }
  }

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

      alert(successMessage);
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

  function createSaleFromSelected() {
    if (selectedSkus.length === 0) return;
    const qs = new URLSearchParams({ skus: selectedSkus.join(",") }).toString();
    router.push(`/sales/new?${qs}`);
  }

  return (
    <div className={ui.tableWrap}>
      {copyToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          {copyToast}
        </div>
      )}

      {/* BULK BAR: wraps onto new lines on smaller screens (no clipping) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: 12,
          flexWrap: "wrap", // ✅ allow wrap
        }}
      >
        {/* Top-left text */}
        <div style={{ alignSelf: "flex-start", whiteSpace: "nowrap", minWidth: 160 }}>
          <div className={ui.muted} style={{ fontSize: 13 }}>
            {items.length} item(s) • Selected: {selectedSkus.length}
          </div>
        </div>

        {/* Controls: wrap + keep nice alignment */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap", // ✅ allow wrap
            justifyContent: "flex-end",
            flex: "1 1 520px",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", minWidth: 180 }}>
            Set status
            <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
              <option value="">Choose…</option>
              {STOCK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <button
            className={ui.button}
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

          <label style={{ display: "flex", flexDirection: "column", minWidth: 110 }}>
            Markdown %
            <input
              type="number"
              min={0}
              max={100}
              value={markdownPercent}
              onChange={(e) => setMarkdownPercent(e.target.value)}
            />
          </label>

          <button
            className={ui.button}
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

          <label style={{ display: "flex", flexDirection: "column", minWidth: 140 }}>
            Move location
            <input
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
            />
          </label>

          <button
            className={ui.button}
            type="button"
            disabled={busy || selectedSkus.length === 0 || !locationCode.trim()}
            onClick={() =>
              runBulkAction(
                { action: "move_location", locationCode },
                `Moved ${selectedSkus.length} item(s).`,
              )
            }
          >
            Move
          </button>

          <button
            className={ui.button}
            type="button"
            disabled={busy || selectedSkus.length === 0}
            onClick={createSaleFromSelected}
          >
            Create sale ({selectedSkus.length})
          </button>

          <button
            className={ui.button}
            type="button"
            disabled={busy || selectedSkus.length === 0}
            onClick={archiveSelected}
          >
            {busy ? "Working..." : `Archive selected (${selectedSkus.length})`}
          </button>

          {quickAction === "MARKDOWN_15" && (
            <button
              className={ui.button}
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

      <div className={ui.tableScroll}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              <th className={ui.th} style={{ width: 44 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className={ui.th} style={{ width: 170 }}>
                SKU
              </th>
              <th className={ui.th}>Title</th>
              <th className={ui.th} style={{ width: 150 }}>
                Status
              </th>
              <th className={ui.th} style={{ width: 110 }}>
                Loc
              </th>
              <th className={ui.th} style={{ width: 120 }}>
                Cost
              </th>
              <th className={ui.th} style={{ width: 160, textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => (
              <tr
                key={it.sku}
                className={cx(ui.tr, ui.rowClick)}
                style={
                  it.pricingAlert ? { backgroundColor: "rgba(245, 158, 11, 0.1)" } : {}
                }
                onClick={() => router.push(skuHref(it.sku))}
              >
                <td className={ui.td} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selected[it.sku]}
                    onChange={() => toggleOne(it.sku)}
                  />
                </td>

                <td className={ui.td}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copySkuToClipboard(it.sku);
                    }}
                    title="Click to copy SKU"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      font: "inherit",
                      color: "inherit",
                      cursor: "copy",
                      textAlign: "left",
                    }}
                  >
                    {it.sku}
                  </button>
                </td>

                <td className={cx(ui.td, ui.titleCell)}>{it.titleOverride ?? "—"}</td>

                <td className={ui.td}>
                  <span className={badgeClass(it.status)}>{formatStatus(it.status)}</span>
                </td>

                <td className={ui.td}>{it.location?.code ?? "—"}</td>
                <td className={ui.td}>{moneyGBP(it.purchaseCost)}</td>

                <td
                  className={ui.td}
                  style={{ textAlign: "right" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={ui.actions}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      justifyContent: "flex-end",
                      flexWrap: "nowrap",
                    }}
                  >
                    <button
                      className={ui.iconButton}
                      title="Edit"
                      type="button"
                      onClick={() => router.push(skuHref(it.sku))}
                    >
                      ✎
                    </button>

                    <button
                      className={ui.iconButton}
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
                        router.push(skuHref(data.sku));
                      }}
                    >
                      ⧉
                    </button>

                    <button
                      className={ui.iconButton}
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
              <tr className={ui.tr}>
                <td className={cx(ui.td, ui.muted)} colSpan={7}>
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
