"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FULFILLMENT_COLORS,
  FULFILLMENT_LABEL,
  FULFILLMENT_STATUSES,
  FulfillmentStatus,
} from "@/lib/fulfillment";

type Props = {
  saleId: string;
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber: string;
  carrier: string;
  shippedAt: string;
  deliveredAt: string;
};

export default function SaleFulfillmentEditor(props: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    fulfillmentStatus: props.fulfillmentStatus,
    trackingNumber: props.trackingNumber,
    carrier: props.carrier,
    shippedAt: props.shippedAt,
    deliveredAt: props.deliveredAt,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/sales/${encodeURIComponent(props.saleId)}/fulfillment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Unable to save fulfillment details");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Fulfillment</div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <label>
          Status
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={form.fulfillmentStatus}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  fulfillmentStatus: e.target.value as FulfillmentStatus,
                }))
              }
              style={{ width: "100%" }}
            >
              {FULFILLMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {FULFILLMENT_LABEL[status]}
                </option>
              ))}
            </select>
            <span
              className="badge"
              style={{
                backgroundColor: FULFILLMENT_COLORS[form.fulfillmentStatus],
                color: "white",
              }}
            >
              {FULFILLMENT_LABEL[form.fulfillmentStatus]}
            </span>
          </div>
        </label>

        <label>
          Tracking number
          <input
            value={form.trackingNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, trackingNumber: e.target.value }))
            }
            placeholder="e.g. AB123456789GB"
          />
        </label>

        <label>
          Carrier
          <input
            value={form.carrier}
            onChange={(e) => setForm((prev) => ({ ...prev, carrier: e.target.value }))}
            placeholder="e.g. Royal Mail"
          />
        </label>

        <label>
          Shipped at
          <input
            type="datetime-local"
            value={form.shippedAt}
            onChange={(e) => setForm((prev) => ({ ...prev, shippedAt: e.target.value }))}
          />
        </label>

        <label>
          Delivered at
          <input
            type="datetime-local"
            value={form.deliveredAt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, deliveredAt: e.target.value }))
            }
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn" type="button" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save fulfillment updates"}
        </button>
      </div>
    </div>
  );
}
