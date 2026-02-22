"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  code: string;
  type: string;
  notes: string;
  createdAt: string; // ISO
  inUse: number;
};

function fmt(iso: string) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

export default function LocationsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);

  // New location form
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("Box");
  const [newNotes, setNewNotes] = useState("");

  // Edit row
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editType, setEditType] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const sorted = useMemo(() => rows, [rows]);

  async function createLocation() {
    const code = newCode.trim().toUpperCase();
    if (!code) return alert("Enter a location code (e.g. BOX-01)");

    setBusy(true);
    try {
      const res = await fetch("/api/locations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type: newType.trim() || "Box",
          notes: newNotes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to create location");
        return;
      }

      setNewCode("");
      setNewNotes("");
      setNewType("Box");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(r: Row) {
    setEditId(r.id);
    setEditCode(r.code);
    setEditType(r.type || "Box");
    setEditNotes(r.notes || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditCode("");
    setEditType("");
    setEditNotes("");
  }

  async function saveEdit(id: string) {
    const code = editCode.trim().toUpperCase();
    if (!code) return alert("Location code cannot be blank");

    setBusy(true);
    try {
      const res = await fetch("/api/locations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          code,
          type: editType.trim() || "Box",
          notes: editNotes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to update location");
        return;
      }

      cancelEdit();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteLocation(id: string, code: string, inUse: number) {
    if (inUse > 0) {
      alert(`Cannot delete ${code} because it is used by ${inUse} item(s).`);
      return;
    }
    if (!confirm(`Delete location ${code}?`)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/locations/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to delete location");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tableWrap">
      {/* Create row */}
      <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Add location</div>

        <div className="formGrid">
          <label>
            Code (Bay/Box)
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g. BOX-01"
              disabled={busy}
            />
          </label>

          <label>
            Type
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Box / Bay / Shelf"
              disabled={busy}
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Description / notes
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Top rack, left side"
              disabled={busy}
            />
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <button className="btn" type="button" disabled={busy} onClick={createLocation}>
            {busy ? "Saving..." : "Add location"}
          </button>
        </div>
      </div>

      <div className="tableScroll">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th" style={{ width: 170 }}>
                Code
              </th>
              <th className="th" style={{ width: 140 }}>
                Type
              </th>
              <th className="th">Description</th>
              <th className="th" style={{ width: 90 }}>
                In use
              </th>
              <th className="th" style={{ width: 170 }}>
                Created
              </th>
              <th className="th" style={{ width: 170, textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r) => {
              const isEdit = editId === r.id;

              return (
                <tr key={r.id} className="tr">
                  <td className="td">
                    {isEdit ? (
                      <input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        disabled={busy}
                      />
                    ) : (
                      r.code
                    )}
                  </td>

                  <td className="td">
                    {isEdit ? (
                      <input
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        disabled={busy}
                      />
                    ) : (
                      r.type
                    )}
                  </td>

                  <td className="td">
                    {isEdit ? (
                      <input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        disabled={busy}
                      />
                    ) : (
                      r.notes || <span className="muted">—</span>
                    )}
                  </td>

                  <td className="td">{r.inUse}</td>
                  <td className="td">{fmt(r.createdAt)}</td>

                  <td className="td" style={{ textAlign: "right" }}>
                    {!isEdit ? (
                      <div className="actions">
                        <button
                          className="iconBtn"
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(r)}
                        >
                          ✎
                        </button>
                        <button
                          className="iconBtn"
                          type="button"
                          disabled={busy}
                          onClick={() => deleteLocation(r.id, r.code, r.inUse)}
                          title={r.inUse > 0 ? "In use" : "Delete"}
                        >
                          🗑
                        </button>
                      </div>
                    ) : (
                      <div className="actions">
                        <button
                          className="btn"
                          type="button"
                          disabled={busy}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn primary"
                          type="button"
                          disabled={busy}
                          onClick={() => saveEdit(r.id)}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr className="tr">
                <td className="td muted" colSpan={6}>
                  No locations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
