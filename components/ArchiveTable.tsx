"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  sku: string;
  titleOverride: string | null;
  createdAt: string; // ISO
  archivedAt: string | null; // ISO
  location: { code: string } | null;
};

export default function ArchiveTable({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // ✅ NEW: the ids we will delete when the modal confirms
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );

  const allChecked = items.length > 0 && selectedIds.length === items.length;

  function toggleAll() {
    if (allChecked) return setSelected({});
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.id] = true;
    setSelected(next);
  }

  function toggleOne(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ✅ NEW: open modal with specific ids, independent of selectedIds timing
  function openConfirm(ids: string[]) {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
    setConfirmOpen(true);
  }

  async function permanentDelete(ids: string[]) {
    alert("permanentDelete called with: " + ids.length); // ✅ debug proof
    setBusy(true);

    try {
      const res = await fetch("/api/inventory/permanent-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json().catch(() => ({}));
      alert(JSON.stringify({ status: res.status, data }, null, 2)); // ✅ debug response

      if (!res.ok) throw new Error(data?.error ?? "Delete failed");

      setConfirmOpen(false);
      setPendingDeleteIds([]);

      // If you deleted selected items, also clear selection
      setSelected((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });

      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tableWrap">
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12 }}
      >
        <div className="muted" style={{ fontSize: 13 }}>
          {items.length} archived item(s)
        </div>

        <button
          className="btn"
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => openConfirm(selectedIds)}
          style={{ opacity: selectedIds.length === 0 ? 0.6 : 1 }}
        >
          Permanently delete selected ({selectedIds.length})
        </button>
      </div>

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
            <th className="th" style={{ width: 120 }}>
              Loc
            </th>
            <th className="th" style={{ width: 190 }}>
              Archived
            </th>
            <th className="th" style={{ width: 120, textAlign: "right" }}>
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((it) => (
            <tr className="tr" key={it.id}>
              <td className="td">
                <input
                  type="checkbox"
                  checked={!!selected[it.id]}
                  onChange={() => toggleOne(it.id)}
                />
              </td>

              <td
                className="td"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                {it.sku}
              </td>

              <td className="td titleCell">
                {it.titleOverride ?? <span className="muted">—</span>}
              </td>

              <td className="td">
                {it.location?.code ?? <span className="muted">—</span>}
              </td>

              <td className="td">{formatDate(it.archivedAt ?? it.createdAt)}</td>

              <td className="td" style={{ textAlign: "right" }}>
                <button
                  className="iconBtn"
                  type="button"
                  title="Permanently delete"
                  onClick={() => openConfirm([it.id])} // ✅ direct
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr className="tr">
              <td className="td muted" colSpan={6}>
                No archived items.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {confirmOpen && (
        <ConfirmModal
          count={pendingDeleteIds.length}
          busy={busy}
          onCancel={() => !busy && setConfirmOpen(false)}
          onConfirm={() => permanentDelete(pendingDeleteIds)}
        />
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

function ConfirmModal({
  count,
  busy,
  onCancel,
  onConfirm,
}: {
  count: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Permanently delete?</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          You are about to permanently delete <b>{count}</b> item{count === 1 ? "" : "s"}.
          This cannot be undone.
        </p>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}
        >
          <button className="btn" type="button" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn"
            type="button"
            disabled={busy || count === 0}
            onClick={onConfirm}
          >
            {busy ? "Deleting..." : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
