"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatStatus } from "@/lib/status";

type Item = {
  sku: string;
  titleOverride: string | null;
  condition: string | null;
  status: string;
  purchaseCost: number;
  extraCost: number;
  purchasedAt: string; // YYYY-MM-DD
  notes: string | null;
  locationCode: string | null;
  archived: boolean;
};

const STATUSES = ["IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

export default function StockUnitEditor({ item }: { item: Item }) {
  const router = useRouter();

  const [titleOverride, setTitleOverride] = useState(item.titleOverride ?? "");
  const [condition, setCondition] = useState(item.condition ?? "");
  const [status, setStatus] = useState(item.status);
  const [purchaseCost, setPurchaseCost] = useState(String(item.purchaseCost ?? 0));
  const [extraCost, setExtraCost] = useState(String(item.extraCost ?? 0));
  const [purchasedAt, setPurchasedAt] = useState(item.purchasedAt);
  const [locationCode, setLocationCode] = useState(item.locationCode ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [archived, setArchived] = useState(!!item.archived);

  const [msg, setMsg] = useState<string>("");

  async function save() {
    setMsg("");

    const res = await fetch("/api/stock/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: item.sku,
        titleOverride: titleOverride.trim() ? titleOverride.trim() : null,
        condition: condition.trim() ? condition.trim() : null,
        status,
        purchaseCost: Number(purchaseCost),
        extraCost: Number(extraCost),
        purchasedAt,
        locationCode: locationCode.trim() ? locationCode.trim() : "", // empty clears
        notes: notes.trim() ? notes.trim() : null,
        archived,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Failed to save");
      return;
    }

    setMsg("Saved!");
    router.refresh();
  }

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{item.sku}</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            <span className={`badge ${status}`}>{formatStatus(status)}</span>
            {archived && <span className="muted"> • Archived</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" type="button" onClick={() => router.push("/inventory")}>
            ← Inventory
          </button>
          <button className="btn" type="button" onClick={save}>
            Save
          </button>
        </div>
      </div>

      <div className="tableWrap" style={{ padding: 16 }}>
        <div className="formGrid">
          <label>
            Title
            <input
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%" }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Location (Bay/Box code)
            <input
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              placeholder="e.g. BOX-01"
              style={{ width: "100%" }}
            />
          </label>

          <label>
            Purchased date
            <input
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label>
            Purchase cost
            <input
              type="number"
              step="0.01"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label>
            Extra cost
            <input
              type="number"
              step="0.01"
              value={extraCost}
              onChange={(e) => setExtraCost(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label>
            Condition
            <input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label
            style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 26 }}
          >
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Archived (hide from inventory)
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", minHeight: 110 }}
            />
          </label>
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}
        >
          <button className="btn" type="button" onClick={save}>
            Save
          </button>
        </div>

        {msg && <div style={{ marginTop: 10 }}>{msg}</div>}
      </div>
    </div>
  );
}
