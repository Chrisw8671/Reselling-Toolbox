"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatStatus } from "@/lib/status";

const STATUSES = ["IN_STOCK", "LISTED", "SOLD", "RETURNED", "WRITTEN_OFF"];

export default function NewInventoryPage() {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement | null>(null);

  const [sku, setSku] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("IN_STOCK");
  const [purchaseCost, setPurchaseCost] = useState("0");
  const [extraCost, setExtraCost] = useState("0");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [locationCode, setLocationCode] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  // Fetch first SKU on load
  useEffect(() => {
    async function fetchSku() {
      const res = await fetch("/api/stock/next-sku");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.sku) {
        setSku(data.sku);
        setTimeout(() => titleRef.current?.focus(), 0);
      }
    }
    fetchSku();
  }, []);

  async function save() {
    setMsg("");

    const res = await fetch("/api/stock/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        titleOverride: titleOverride.trim() || null,
        condition: condition.trim() || null,
        status,
        purchaseCost: Number(purchaseCost),
        extraCost: Number(extraCost),
        purchasedAt,
        locationCode: locationCode.trim() || "",
        notes: notes.trim() || null,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data.error ?? "Failed to create item");
      return;
    }

    // Clear form fields for rapid entry
    setTitleOverride("");
    setCondition("");
    setPurchaseCost("0");
    setExtraCost("0");
    setNotes("");

    // Fetch next SKU
    const res2 = await fetch("/api/stock/next-sku");
    const data2 = await res2.json().catch(() => ({}));
    if (res2.ok && data2?.sku) {
      setSku(data2.sku);
    }

    setTimeout(() => titleRef.current?.focus(), 0);

    setMsg("Saved ✓");
  }

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            New Inventory Item
          </h1>
          <div className="muted" style={{ marginTop: 6 }}>
            SKU: {sku || "Generating..."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn"
            type="button"
            onClick={() => router.push("/inventory")}
          >
            ← Inventory
          </button>
          <button className="btn primary" type="button" onClick={save}>
            Create
          </button>
        </div>
      </div>

      <div className="tableWrap" style={{ padding: 16 }}>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <label>
            Title
            <input
              ref={titleRef}
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

          <label style={{ gridColumn: "1 / -1" }}>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", minHeight: 110 }}
            />
          </label>
        </div>

        {msg && (
          <div style={{ marginTop: 12 }} className="muted">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}