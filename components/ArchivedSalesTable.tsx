"use client";

import { badgeClass, cx, ui } from "@/lib/ui";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  platform: string;
  saleDate: string; // ISO
  archivedAt: string | null;
  orderRef: string;
  itemCount: number;
  revenue: number;
  costs: number;
  profit: number;
};

function formatDate(iso: string) {
  // deterministic (no hydration warning)
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

export default function ArchivedSalesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function permanentDelete(ids: string[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sales/permanent-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Delete failed");
        return;
      }

      setConfirmOpen(false);
      setSelected({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function restoreMany(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Restore ${ids.length} sale(s)?`)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/sales/restore-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Restore failed");
        return;
      }

      setSelected({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function restoreOne(id: string) {
    if (!confirm("Restore this sale?")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/sales/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Restore failed");
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={ui.tableWrap}>
      {/* Bulk actions row */}
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12 }}
      >
        <div className={ui.muted} style={{ fontSize: 13 }}>
          {rows.length} archived sale(s) • Selected: {selectedIds.length}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            className={ui.button}
            type="button"
            disabled={busy || selectedIds.length === 0}
            onClick={() => restoreMany(selectedIds)}
            style={{ opacity: busy || selectedIds.length === 0 ? 0.6 : 1 }}
          >
            {busy ? "Working..." : `Restore selected (${selectedIds.length})`}
          </button>

          <button
            className={ui.button}
            type="button"
            disabled={busy || selectedIds.length === 0}
            onClick={() => setConfirmOpen(true)}
            style={{ opacity: busy || selectedIds.length === 0 ? 0.6 : 1 }}
          >
            Permanently delete selected ({selectedIds.length})
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

              <th className={ui.th} style={{ width: 150 }}>
                Platform
              </th>
              <th className={ui.th} style={{ width: 180 }}>
                Sale date
              </th>
              <th className={ui.th} style={{ width: 220 }}>
                Order ref
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
              <th className={ui.th} style={{ width: 120 }}>
                Profit
              </th>
              <th className={ui.th} style={{ width: 180 }}>
                Archived
              </th>
              <th className={ui.th} style={{ width: 160, textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={cx(ui.tr, ui.rowClick)}
                onClick={() => router.push(`/sales/${r.id}`)}
              >
                <td className={ui.td} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>

                <td className={ui.td}>{r.platform}</td>
                <td className={ui.td}>{formatDate(r.saleDate)}</td>
                <td className={ui.td}>
                  {r.orderRef || <span className={ui.muted}>—</span>}
                </td>
                <td className={ui.td}>{r.itemCount}</td>
                <td className={ui.td}>£{r.revenue.toFixed(2)}</td>
                <td className={ui.td}>£{r.costs.toFixed(2)}</td>
                <td className={ui.td}>
                  <span className={badgeClass(r.profit >= 0 ? "profitPos" : "profitNeg")}>
                    £{r.profit.toFixed(2)}
                  </span>
                </td>

                <td className={ui.td}>{formatDate(r.archivedAt ?? r.saleDate)}</td>

                <td
                  className={ui.td}
                  style={{ textAlign: "right" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={ui.actions}>
                    <button
                      className={ui.iconButton}
                      type="button"
                      title="Restore"
                      disabled={busy}
                      onClick={() => restoreOne(r.id)}
                      style={{ opacity: busy ? 0.6 : 1 }}
                    >
                      ↩
                    </button>

                    <button
                      className={ui.iconButton}
                      type="button"
                      title="Permanently delete"
                      disabled={busy}
                      onClick={() => {
                        setSelected({ [r.id]: true });
                        setConfirmOpen(true);
                      }}
                      style={{ opacity: busy ? 0.6 : 1 }}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr className={ui.tr}>
                <td className={cx(ui.td, ui.muted)} colSpan={10}>
                  No archived sales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm delete modal */}
      {confirmOpen && (
        <div className={ui.modalOverlay}>
          <div className={ui.modalCard}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Permanently delete?
            </h2>
            <p className={ui.muted} style={{ marginTop: 8 }}>
              You are about to permanently delete <b>{selectedIds.length}</b> sale(s).
              This cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                className={ui.button}
                type="button"
                disabled={busy}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className={ui.button}
                type="button"
                disabled={busy || selectedIds.length === 0}
                onClick={() => permanentDelete(selectedIds)}
              >
                {busy ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
