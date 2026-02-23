"use client";

import { useState } from "react";

type ReturnCase = {
  id: string;
  stockUnitId: string;
  reason: string;
  openedAt: string | Date;
  closedAt: string | Date | null;
  refundAmount: number | string | { toString(): string };
  returnShippingCost: number | string | { toString(): string };
  restockable: boolean;
};

type SaleLine = {
  stockUnit: { id: string; sku: string; titleOverride: string | null };
};

export default function ReturnManager({
  saleId,
  lines,
  existingCases,
}: {
  saleId: string;
  lines: SaleLine[];
  existingCases: ReturnCase[];
}) {
  const [stockUnitId, setStockUnitId] = useState(lines[0]?.stockUnit.id ?? "");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("0");
  const [returnShippingCost, setReturnShippingCost] = useState("0");
  const [restockable, setRestockable] = useState(true);
  const [closed, setClosed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveReturnCase() {
    setSaving(true);
    try {
      const res = await fetch("/api/returns/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          saleId,
          stockUnitId,
          reason,
          refundAmount: Number(refundAmount) || 0,
          returnShippingCost: Number(returnShippingCost) || 0,
          restockable,
          closed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save return");

      window.location.reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed to save return");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Returns</div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          alignItems: "end",
        }}
      >
        <div>
          <label className="muted">Item</label>
          <select value={stockUnitId} onChange={(e) => setStockUnitId(e.target.value)}>
            {lines.map((l) => (
              <option key={l.stockUnit.id} value={l.stockUnit.id}>
                {l.stockUnit.sku} — {l.stockUnit.titleOverride ?? "Untitled"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="muted">Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div>
          <label className="muted">Refund (£)</label>
          <input
            type="number"
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="muted">Return Shipping (£)</label>
          <input
            type="number"
            step="0.01"
            value={returnShippingCost}
            onChange={(e) => setReturnShippingCost(e.target.value)}
          />
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={restockable}
            onChange={(e) => setRestockable(e.target.checked)}
          />
          <span>Restockable</span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
          />
          <span>Close now</span>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={saveReturnCase}
          disabled={saving || !stockUnitId}
        >
          {saving ? "Saving..." : "Save return"}
        </button>
      </div>

      {existingCases.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Existing return cases
          </div>
          {existingCases.map((rc) => (
            <div key={rc.id} style={{ marginBottom: 6 }}>
              <span className="badge RETURNED" style={{ marginRight: 8 }}>
                {rc.closedAt ? "Closed" : "Open"}
              </span>
              {rc.reason} • Refund £{Number(rc.refundAmount).toFixed(2)} • Shipping £
              {Number(rc.returnShippingCost).toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
