"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

const PURCHASED_FROM_OPTIONS = [
  "eBay",
  "Vinted",
  "Depop",
  "Facebook Marketplace",
  "Gumtree",
  "Amazon",
  "Etsy",
  "Shopify store",
  "TikTok Shop",
  "Instagram",
  "In person",
  "Car boot sale",
  "Charity shop",
  "Thrift shop",
  "Boot sale trader",
  "Supplier / wholesale",
  "Outlet / clearance",
  "Other",
] as const;

type MissingKey =
  | "title"
  | "condition"
  | "brand"
  | "purchaseCost"
  | "purchasedFrom";

const MISSING_LABEL: Record<MissingKey, string> = {
  title: "Title",
  condition: "Condition",
  brand: "Brand",
  purchaseCost: "Purchase cost",
  purchasedFrom: "Purchased from",
};

export default function NewInventoryPage() {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement | null>(null);

  const [sku, setSku] = useState("");
  const [titleOverride, setTitleOverride] = useState("");

  // ✅ Status fixed
  const status = "IN_STOCK";

  const [condition, setCondition] = useState("");

  const [purchaseCost, setPurchaseCost] = useState("0");
  const [extraCost, setExtraCost] = useState("0");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [locationCode, setLocationCode] = useState("");
  const [notes, setNotes] = useState("");

  const [purchasedFromChoice, setPurchasedFromChoice] =
    useState<(typeof PURCHASED_FROM_OPTIONS)[number] | "">("");
  const [purchasedFromOther, setPurchasedFromOther] = useState("");

  const [purchaseRef, setPurchaseRef] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");

  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");

  // ✅ validation / messaging
  const [missingFields, setMissingFields] = useState<MissingKey[]>([]);
  const [msg, setMsg] = useState("");

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

  function computeMissing(): MissingKey[] {
    const missing: MissingKey[] = [];

    if (!titleOverride.trim()) missing.push("title");
    if (!condition) missing.push("condition");
    if (!brand.trim()) missing.push("brand");

    const costNum = Number(purchaseCost);
    if (!Number.isFinite(costNum) || costNum <= 0) missing.push("purchaseCost");

    // purchasedFrom rules
    if (!purchasedFromChoice) {
      missing.push("purchasedFrom");
    } else if (purchasedFromChoice === "Other" && !purchasedFromOther.trim()) {
      missing.push("purchasedFrom");
    }

    return missing;
  }

  // ✅ Keep missingFields always in sync with inputs
  useEffect(() => {
    const m = computeMissing();
    setMissingFields(m);

    // Keep the text line in sync too (but don't overwrite Saved ✓)
    if (m.length > 0) {
      setMsg("Missing: " + m.map((k) => MISSING_LABEL[k]).join(", "));
    } else {
      // Only clear the missing message, don't remove "Saved ✓" etc.
      setMsg((prev) => (prev.startsWith("Missing:") ? "" : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleOverride, condition, brand, purchaseCost, purchasedFromChoice, purchasedFromOther]);

  function hasMissing(key: MissingKey) {
    return missingFields.includes(key);
  }

  const requiredStar = (key: MissingKey) =>
    hasMissing(key) ? (
      <span style={{ color: "red", marginLeft: 6 }}>*</span>
    ) : null;

  async function save() {
    // recompute right now for safety
    const missing = computeMissing();

    if (missing.length > 0) {
      setMissingFields(missing);

      alert(
        "Please fill in the following required field(s):\n\n" +
          missing.map((k) => `• ${MISSING_LABEL[k]}`).join("\n")
      );

      setMsg("Missing: " + missing.map((k) => MISSING_LABEL[k]).join(", "));
      return;
    }

    setMsg("");

    const purchasedFrom =
      purchasedFromChoice === "Other"
        ? purchasedFromOther.trim()
        : purchasedFromChoice;

    const costNum = Number(purchaseCost);

    const res = await fetch("/api/stock/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        titleOverride: titleOverride.trim() || null,
        condition,
        status,
        purchaseCost: costNum,
        extraCost: Number(extraCost),
        purchasedAt,
        locationCode: locationCode.trim() || "",
        notes: notes.trim() || null,

        purchasedFrom: purchasedFrom || null,
        purchaseRef: purchaseRef.trim() || null,
        purchaseUrl: purchaseUrl.trim() || null,
        brand: brand.trim() || null,
        size: size.trim() || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Failed to create item");
      setMsg(data.error ?? "Failed to create item");
      return;
    }

    // Reset form
    setTitleOverride("");
    setCondition("");
    setPurchaseCost("0");
    setExtraCost("0");
    setNotes("");

    setPurchasedFromChoice("");
    setPurchasedFromOther("");
    setPurchaseRef("");
    setPurchaseUrl("");
    setBrand("");
    setSize("");

    setMsg("Saved ✓");

    const res2 = await fetch("/api/stock/next-sku");
    const data2 = await res2.json().catch(() => ({}));
    if (res2.ok && data2?.sku) setSku(data2.sku);

    setTimeout(() => titleRef.current?.focus(), 0);
  }

  const showMissingLine = msg && (missingFields.length > 0 || msg === "Saved ✓" || !msg.startsWith("Missing:"));

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

          {/* ✅ message under SKU */}
          {msg && (
            <div className="muted" style={{ marginTop: 8 }}>
              {msg}
            </div>
          )}
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
        {/* Item details */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Item details</div>

          <div className="formGrid">
            <label>
              Title{requiredStar("title")}
              <input
                ref={titleRef}
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
              />
            </label>

            <label>
              Status
              <input value={formatStatus(status)} disabled />
            </label>

            <label>
              Condition{requiredStar("condition")}
              <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">Select condition...</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {formatCondition(c)}
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
              />
            </label>

            <label>
              Brand{requiredStar("brand")}
              <input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </label>

            <label>
              Size
              <input value={size} onChange={(e) => setSize(e.target.value)} />
            </label>
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
              />
            </label>

            <label>
              Purchase cost{requiredStar("purchaseCost")}
              <input
                type="number"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
              />
            </label>

            <label>
              Extra cost
              <input
                type="number"
                step="0.01"
                value={extraCost}
                onChange={(e) => setExtraCost(e.target.value)}
              />
            </label>

            <label>
              Purchased from{requiredStar("purchasedFrom")}
              <select
                value={purchasedFromChoice}
                onChange={(e) =>
                  setPurchasedFromChoice(
                    e.target.value as (typeof PURCHASED_FROM_OPTIONS)[number] | ""
                  )
                }
              >
                <option value="">Select source...</option>
                {PURCHASED_FROM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {purchasedFromChoice === "Other" ? (
              <label>
                Purchased from (other){requiredStar("purchasedFrom")}
                <input
                  value={purchasedFromOther}
                  onChange={(e) => setPurchasedFromOther(e.target.value)}
                  placeholder="Type source..."
                />
              </label>
            ) : (
              <div />
            )}

            <label>
              Purchase ref
              <input value={purchaseRef} onChange={(e) => setPurchaseRef(e.target.value)} />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Purchase URL
              <input
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
                placeholder="https://..."
              />
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
          />
        </label>
      </div>
    </div>
  );
}