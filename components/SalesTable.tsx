"use client";

import { badgeClass, cx, ui } from "@/lib/ui";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isoDate, moneyGBP } from "@/lib/format";
import {
  FULFILLMENT_COLORS,
  FULFILLMENT_LABEL,
  FulfillmentStatus,
  NEXT_STATUS_OPTIONS,
} from "@/lib/fulfillment";

type SaleRow = {
  id: string;
  saleDate: string;
  platform: string;
  itemCount: number;
  revenue: number;
  costs: number;
  profit: number;
  orderRef: string;
  fulfillmentStatus: FulfillmentStatus;
};

function OpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 5h5v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14 19 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6 7h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 4h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SalesTable({ rows }: { rows: SaleRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
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

  async function moveStatus(id: string, status: FulfillmentStatus) {
    setUpdatingStatus((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(id)}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Status update failed");
        return;
      }
      router.refresh();
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [id]: false }));
    }
  }

  function statusTone(status: FulfillmentStatus) {
    return {
      backgroundColor: `color-mix(in srgb, ${FULFILLMENT_COLORS[status]} 18%, var(--panel-2))`,
      borderColor: `color-mix(in srgb, ${FULFILLMENT_COLORS[status]} 55%, var(--border))`,
      color: FULFILLMENT_COLORS[status],
    };
  }

  return (
    <div className={ui.tableWrap}>
      <div className="border-app-border/70 flex flex-wrap items-center justify-between gap-3 border-b bg-[linear-gradient(180deg,color-mix(in_srgb,var(--panel-2)_92%,transparent)_0%,transparent_100%)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="border-app-border bg-app-panel-3 text-app-muted rounded-full border px-2.5 py-1 text-[12px] font-bold">
            {rows.length} sale(s)
          </div>
          <div className="text-app-muted text-[13px]">Selected: {selectedIds.length}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={ui.buttonCompact}
            type="button"
            disabled={busy || selectedIds.length === 0}
            onClick={archiveSelected}
          >
            {busy ? "Archiving..." : `Archive selected (${selectedIds.length})`}
          </button>
        </div>
      </div>

      <div className={ui.tableScroll}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>
              <th className={ui.th} style={{ width: 44 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>

              <th className={ui.th} style={{ width: 130 }}>
                Date
              </th>
              <th className={ui.th} style={{ width: 160 }}>
                Platform
              </th>
              <th className={ui.th} style={{ width: 100 }}>
                Status
              </th>
              <th className={ui.th} style={{ width: 290 }}>
                Quick move
              </th>
              <th className={ui.th} style={{ width: 90 }}>
                Items
              </th>
              <th className={ui.th} style={{ width: 120 }}>
                Revenue
              </th>
              <th className={ui.th} style={{ width: 120 }}>
                Costs
              </th>
              <th className={ui.th} style={{ width: 130 }}>
                Profit
              </th>
              <th className={ui.th}>Order Ref</th>
              <th className={ui.th} style={{ width: 120, textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={cx(ui.tr, ui.rowClick)}
                onClick={() => router.push(`/sales/${encodeURIComponent(r.id)}`)}
              >
                <td className={ui.td} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>

                <td className={ui.td}>{isoDate(r.saleDate)}</td>
                <td className={ui.td}>{r.platform}</td>
                <td className={ui.td}>
                  <span
                    className={cx(ui.badge, "font-bold shadow-sm")}
                    style={statusTone(r.fulfillmentStatus)}
                  >
                    {FULFILLMENT_LABEL[r.fulfillmentStatus]}
                  </span>
                </td>
                <td className={ui.td} onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_STATUS_OPTIONS[r.fulfillmentStatus].length === 0 ? (
                      <span className={ui.muted}>-</span>
                    ) : (
                      NEXT_STATUS_OPTIONS[r.fulfillmentStatus].map((next) => (
                        <button
                          key={next}
                          className="inline-flex min-w-[88px] items-center justify-center rounded-xl border px-3 py-2 text-[12px] font-bold tracking-[0.1px] shadow-sm transition-[transform,filter,opacity] duration-150 hover:-translate-y-px hover:brightness-105 disabled:pointer-events-none disabled:opacity-60"
                          type="button"
                          title={`Set to ${FULFILLMENT_LABEL[next]}`}
                          disabled={!!updatingStatus[r.id]}
                          onClick={() => moveStatus(r.id, next)}
                          style={statusTone(next)}
                        >
                          {FULFILLMENT_LABEL[next]}
                        </button>
                      ))
                    )}
                  </div>
                </td>
                <td className={ui.td}>{r.itemCount}</td>
                <td className={ui.td}>{moneyGBP(r.revenue)}</td>
                <td className={ui.td}>{moneyGBP(r.costs)}</td>

                <td className={ui.td}>
                  <span className={badgeClass(r.profit >= 0 ? "profitPos" : "profitNeg")}>
                    {moneyGBP(r.profit)}
                  </span>
                </td>

                <td className={ui.td}>
                  {r.orderRef || <span className={ui.muted}>-</span>}
                </td>

                <td
                  className={ui.td}
                  style={{ textAlign: "right" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={ui.actions}>
                    <button
                      className={ui.iconButton}
                      title="Open"
                      type="button"
                      onClick={() => router.push(`/sales/${encodeURIComponent(r.id)}`)}
                    >
                      <OpenIcon />
                    </button>

                    <button
                      className={ui.iconButton}
                      title="Archive"
                      type="button"
                      disabled={busy}
                      onClick={() => archiveOne(r.id)}
                    >
                      <ArchiveIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr className={ui.tr}>
                <td className={cx(ui.td, ui.muted)} colSpan={11}>
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
