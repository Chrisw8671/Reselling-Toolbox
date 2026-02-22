"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatStatus } from "@/lib/status";

const CONDITIONS = [
  "NEW_WITH_TAGS",
  "NEW_WITHOUT_TAGS",
  "NEW_WITH_DEFECTS",
  "LIKE_NEW",
  "VERY_GOOD",
  "GOOD",
  "ACCEPTABLE",
  "FOR_PARTS_OR_NOT_WORKING",
];

function formatCondition(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

type LocationOption = { code: string; label: string };

type Item = {
  sku: string;
  titleOverride: string;
  status: string;
  condition: string;

  purchaseCost: number;
  extraCost: number;
  purchasedAt: string; // yyyy-mm-dd
  locationCode: string;
  notes: string;

  archived: boolean;
  createdAt: string; // display
};

export default function InventoryItemEditor({ item }: { item: Item }) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Editable fields supported by your existing /api/stock/update route
  const [titleOverride, setTitleOverride] = useState(item.titleOverride);
  const [condition, setCondition] = useState(item.condition);
  const [notes, setNotes] = useState(item.notes);
  const [purchaseCost, setPurchaseCost] = useState(String(item.purchaseCost ?? 0));
  const [extraCost, setExtraCost] = useState(String(item.extraCost ?? 0));
  const [purchasedAt, setPurchasedAt] = useState(item.purchasedAt);

  const [archived, setArchived] = useState(Boolean(item.archived));

  // ✅ Location now driven by dropdown + optional custom input
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationChoice, setLocationChoice] = useState<string>(""); // "" | "__custom__" | code
  const [locationCustom, setLocationCustom] = useState<string>("");
  const [locationCode, setLocationCode] = useState(item.locationCode);

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      const res = await fetch("/api/locations/list");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.locations)) {
        const opts = data.locations.map((l: any) => ({
          code: String(l.code),
          label: String(l.label ?? l.code),
        }));
        setLocations(opts);
      }
    }
    loadLocations();
  }, []);

  // Initialize dropdown choice when locations + item location are known
  useEffect(() => {
    const current = (locationCode ?? "").trim();
    if (!current) {
      setLocationChoice("");
      setLocationCustom("");
      return;
    }

    const match = locations.find((l) => l.code === current);
    if (match) {
      setLocationChoice(match.code);
      setLocationCustom("");
    } else {
      setLocationChoice("__custom__");
      setLocationCustom(current);
    }
  }, [locations, locationCode]);

  // Reset form when leaving edit mode or after refresh
  useEffect(() => {
    if (!isEditing) {
      setTitleOverride(item.titleOverride);
      setCondition(item.condition);
      setNotes(item.notes);
      setPurchaseCost(String(item.purchaseCost ?? 0));
      setExtraCost(String(item.extraCost ?? 0));
      setPurchasedAt(item.purchasedAt);
      setArchived(Boolean(item.archived));
      setLocationCode(item.locationCode);
      setMsg("");
    }
  }, [isEditing, item]);

  const hasChanges = useMemo(() => {
    return (
      titleOverride !== item.titleOverride ||
      condition !== item.condition ||
      notes !== item.notes ||
      purchaseCost !== String(item.purchaseCost ?? 0) ||
      extraCost !== String(item.extraCost ?? 0) ||
      purchasedAt !== item.purchasedAt ||
      (locationCode ?? "") !== (item.locationCode ?? "") ||
      archived !== Boolean(item.archived)
    );
  }, [
    titleOverride,
    condition,
    notes,
    purchaseCost,
    extraCost,
    purchasedAt,
    locationCode,
    archived,
    item,
  ]);

  function startEdit() {
    setIsEditing(true);
    setMsg("");
  }

  function discardChanges() {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    if (!confirm("Discard changes?")) return;
    setIsEditing(false); // triggers reset
  }

  async function saveChanges() {
    setMsg("");

    if (!confirm("Save changes?")) return;

    const missing: string[] = [];
    if (!titleOverride.trim()) missing.push("Title");
    if (!condition) missing.push("Condition");

    const costNum = Number(purchaseCost);
    if (!Number.isFinite(costNum) || costNum < 0) missing.push("Purchase cost");

    const extraNum = Number(extraCost);
    if (!Number.isFinite(extraNum) || extraNum < 0) missing.push("Extra cost");

    if (!purchasedAt) missing.push("Purchased date");

    if (missing.length) {
      alert("Please fix:\n\n• " + missing.join("\n• "));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/stock/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: item.sku,
          titleOverride: titleOverride.trim() || null,
          condition: condition || null,
          notes: notes.trim() || null,

          // status not editable here (but your API supports it if you want)
          // status: item.status,

          purchaseCost: costNum,
          extraCost: extraNum,
          purchasedAt, // YYYY-MM-DD
          locationCode: (locationCode ?? "").trim(), // "" clears location in your API

          archived,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Save failed");
        return;
      }

      setMsg("Saved ✓");
      setIsEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tableWrap" style={{ padding: 16 }}>
      {/* Top bar inside card */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div className="muted" style={{ fontSize: 13 }}>
          {item.archived ? "Archived item" : "Active item"} • Created: {item.createdAt}
          {isEditing && hasChanges ? " • Unsaved changes" : ""}
          {msg ? ` • ${msg}` : ""}
        </div>

        {!isEditing ? (
          <button className="btn" type="button" onClick={startEdit}>
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={discardChanges}
            >
              Discard changes
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={busy || !hasChanges}
              onClick={saveChanges}
              style={{ opacity: busy || !hasChanges ? 0.6 : 1 }}
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {/* Item details */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Item details</div>

        <div className="formGrid">
          <label>
            Title
            <input
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              disabled={!isEditing}
            />
          </label>

          <label>
            Status
            <input value={formatStatus(item.status)} disabled />
          </label>

          <label>
            Condition
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              disabled={!isEditing}
            >
              <option value="">Select condition...</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {formatCondition(c)}
                </option>
              ))}
            </select>
          </label>

          {/* ✅ Location dropdown */}
          <label>
            Location (Bay/Box code)
            <select
              value={locationChoice}
              onChange={(e) => {
                const v = e.target.value;
                setLocationChoice(v);

                if (v === "__custom__") {
                  setLocationCustom("");
                  setLocationCode("");
                } else if (v) {
                  setLocationCustom("");
                  setLocationCode(v);
                } else {
                  setLocationCustom("");
                  setLocationCode("");
                }
              }}
              disabled={!isEditing}
            >
              <option value="">Select location...</option>
              {locations.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
              <option value="__custom__">Other / type manually</option>
            </select>
          </label>

          {locationChoice === "__custom__" ? (
            <label>
              Location (custom)
              <input
                value={locationCustom}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocationCustom(v);
                  setLocationCode(v);
                }}
                placeholder="e.g. BOX-99"
                disabled={!isEditing}
              />
            </label>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Purchase details */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Purchase details</div>

        <div className="formGrid">
          <label>
            Purchased date
            <input
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              disabled={!isEditing}
            />
          </label>

          <label>
            Purchase cost
            <input
              type="number"
              step="0.01"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              disabled={!isEditing}
            />
          </label>

          <label>
            Extra cost
            <input
              type="number"
              step="0.01"
              value={extraCost}
              onChange={(e) => setExtraCost(e.target.value)}
              disabled={!isEditing}
            />
          </label>

          <label>
            Archived
            <select
              value={archived ? "1" : "0"}
              onChange={(e) => setArchived(e.target.value === "1")}
              disabled={!isEditing}
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
        </div>
      </div>

      {/* Notes */}
      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: "100%", minHeight: 110 }}
          disabled={!isEditing}
        />
      </label>
    </div>
  );
}
