"use client";

import { ui } from "@/lib/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Location = {
  id: string;
  code: string;
  type: string;
  notes: string;
  createdAt: string;
  inUse: number;
};

export default function MobileLocationsClient({ locations }: { locations: Location[] }) {
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
    } catch (error: any) {
      console.error("createLocation error", error);
      alert(error?.message || "Network error: failed to fetch");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(location: Location) {
    setEditId(location.id);
    setEditCode(location.code);
    setEditType(location.type || "Box");
    setEditNotes(location.notes || "");
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
    } catch (error: any) {
      console.error("saveEdit error", error);
      alert(error?.message || "Network error: failed to fetch");
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
    } catch (error: any) {
      console.error("deleteLocation error", error);
      alert(error?.message || "Network error: failed to fetch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={ui.mobilePage}>
      <div style={{ paddingTop: 10, paddingBottom: 14 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          Locations
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          {locations.length} location{locations.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Add Location Card */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          padding: 14,
          marginBottom: 14,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Add location</div>

        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              Code (Bay/Box)
            </span>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g. BOX-01"
              disabled={busy}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel-2)",
                color: "var(--text)",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Type</span>
            <input
              type="text"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Box / Bay / Shelf"
              disabled={busy}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel-2)",
                color: "var(--text)",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              Description
            </span>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Top rack, left side"
              disabled={busy}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel-2)",
                color: "var(--text)",
                fontSize: 14,
              }}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={createLocation}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "white",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Saving..." : "Add location"}
        </button>
      </div>

      {/* Locations List */}
      <div style={{ display: "grid", gap: 8, paddingBottom: 8 }}>
        {locations.map((location) => {
          const isEdit = editId === location.id;

          return (
            <div
              key={location.id}
              style={{
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--panel)",
                padding: 14,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {!isEdit ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{location.code}</div>
                      {location.type && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {location.type}
                        </div>
                      )}
                    </div>
                    {location.inUse > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "4px 8px",
                          background: "var(--panel-2)",
                          borderRadius: 6,
                          color: "var(--muted)",
                        }}
                      >
                        In use: {location.inUse}
                      </span>
                    )}
                  </div>

                  {location.notes && (
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                      {location.notes}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(location)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--accent)",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy || location.inUse > 0}
                      onClick={() =>
                        deleteLocation(location.id, location.code, location.inUse)
                      }
                      title={
                        location.inUse > 0
                          ? "In use - cannot delete"
                          : "Delete"
                      }
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${location.inUse > 0 ? "var(--border)" : "var(--danger)"}`,
                        background: location.inUse > 0 ? "var(--panel-2)" : "transparent",
                        color: location.inUse > 0 ? "var(--muted)" : "var(--danger)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: location.inUse > 0 ? "not-allowed" : "pointer",
                        opacity: location.inUse > 0 ? 0.5 : 1,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                        Code
                      </span>
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        disabled={busy}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--panel-2)",
                          color: "var(--text)",
                          fontSize: 14,
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                        Type
                      </span>
                      <input
                        type="text"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        disabled={busy}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--panel-2)",
                          color: "var(--text)",
                          fontSize: 14,
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                        Description
                      </span>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        disabled={busy}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--panel-2)",
                          color: "var(--text)",
                          fontSize: 14,
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={cancelEdit}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveEdit(location.id)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--accent)",
                        background: "var(--accent)",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {locations.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            No locations yet. Create one to get started.
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
        Tip: Locations are used in the "Bay/Box code" dropdown on new/edit item pages.
      </div>
    </div>
  );
}
