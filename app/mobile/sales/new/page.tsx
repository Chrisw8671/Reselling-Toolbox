"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SaleItem = {
  stockUnitId: string;
  sku: string;
  title: string;
  loc?: string;
  purchaseCost: number;
  salePrice: string;
};

const PLATFORMS = ["Vinted", "eBay", "Depop", "Facebook Marketplace", "In Person", "Other"];

export default function MobileCreateSalePage() {
  const router = useRouter();

  const [platform, setPlatform] = useState("Vinted");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orderRef, setOrderRef] = useState("");
  const [shippingCharged, setShippingCharged] = useState("0");
  const [platformFees, setPlatformFees] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [otherCosts, setOtherCosts] = useState("0");

  const [skuInput, setSkuInput] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function addSku() {
    setMsg("");
    const sku = skuInput.trim();
    if (!sku) return;

    if (items.some((x) => x.sku.toUpperCase() === sku.toUpperCase())) {
      setMsg("That item is already added.");
      return;
    }

    const res = await fetch(`/api/stock/by-sku?sku=${encodeURIComponent(sku)}`);
    const data = await res.json();

    if (!res.ok) {
      setMsg(data.error ?? "Item not found");
      return;
    }

    const it = data.item as {
      id: string;
      sku: string;
      titleOverride: string | null;
      purchaseCost: number;
      location: { code: string } | null;
    };

    setItems((prev) => [
      ...prev,
      {
        stockUnitId: it.id,
        sku: it.sku,
        title: it.titleOverride ?? "—",
        loc: it.location?.code,
        purchaseCost: Number(it.purchaseCost),
        salePrice: "",
      },
    ]);
    setSkuInput("");
  }

  async function saveSale() {
    setMsg("");
    if (items.length === 0) {
      setMsg("Add at least one item.");
      return;
    }
    for (const it of items) {
      const p = Number(it.salePrice);
      if (!Number.isFinite(p) || p < 0) {
        setMsg(`Enter a valid sale price for ${it.sku}`);
        return;
      }
    }

    setSaving(true);
    const res = await fetch("/api/sales/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        saleDate,
        orderRef,
        shippingCharged: Number(shippingCharged),
        platformFees: Number(platformFees),
        shippingCost: Number(shippingCost),
        otherCosts: Number(otherCosts),
        lines: items.map((it) => ({
          stockUnitId: it.stockUnitId,
          salePrice: Number(it.salePrice),
        })),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMsg(data.error ?? "Failed to save sale");
      return;
    }

    router.push(`/mobile/sales/${data.saleId}`);
  }

  const totalSale = items.reduce((s, it) => s + (Number(it.salePrice) || 0), 0);

  return (
    <div className="mobilePg">
      {/* Header */}
      <div style={{ paddingTop: 10, paddingBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/mobile/sales"
          style={{ fontSize: 26, textDecoration: "none", color: "var(--text)", lineHeight: 1, flexShrink: 0 }}
        >
          ‹
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          New Sale
        </h1>
      </div>

      {/* Sale details */}
      <div className="mobileCard">
        <div className="mobileCardTitle">Sale details</div>
        <div className="mGrid1">
          <label>
            Platform
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Sale date
            <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </label>
          <label>
            Order reference <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            <input
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. ORD-12345"
            />
          </label>
        </div>
      </div>

      {/* Costs & fees */}
      <div className="mobileCard">
        <div className="mobileCardTitle">Costs & fees</div>
        <div className="mGrid2">
          <label>
            Shipping charged
            <input
              type="number"
              step="0.01"
              value={shippingCharged}
              onChange={(e) => setShippingCharged(e.target.value)}
            />
          </label>
          <label>
            Platform fees
            <input
              type="number"
              step="0.01"
              value={platformFees}
              onChange={(e) => setPlatformFees(e.target.value)}
            />
          </label>
          <label>
            Shipping cost
            <input
              type="number"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </label>
          <label>
            Other costs
            <input
              type="number"
              step="0.01"
              value={otherCosts}
              onChange={(e) => setOtherCosts(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Items */}
      <div className="mobileCard">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div className="mobileCardTitle" style={{ margin: 0 }}>
            Items
          </div>
          {items.length > 0 && (
            <div style={{ fontSize: 15, fontWeight: 800 }}>£{totalSale.toFixed(2)}</div>
          )}
        </div>

        {/* SKU input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSku();
              }
            }}
            placeholder="Scan or type item SKU"
            style={{ flex: 1, marginTop: 0 }}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button
            className="btn"
            type="button"
            onClick={addSku}
            style={{ flexShrink: 0, height: 40, padding: "0 16px", width: "auto", minHeight: 0 }}
          >
            Add
          </button>
        </div>

        {/* Item cards */}
        <div style={{ display: "grid", gap: 10 }}>
          {items.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                color: "var(--muted)",
                fontSize: 13,
                border: "1px dashed var(--border)",
                borderRadius: 10,
              }}
            >
              No items added yet
            </div>
          )}
          {items.map((it) => (
            <div key={it.stockUnitId} className="saleItemCard">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {it.sku}
                    {it.loc ? ` · ${it.loc}` : ""} · Cost £{it.purchaseCost.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((x) => x.stockUnitId !== it.stockUnitId))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--danger)",
                    fontSize: 20,
                    padding: "0 0 0 4px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>
              <label style={{ marginTop: 8, marginBottom: 0 }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  Sale price (£)
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={it.salePrice}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((prev) =>
                      prev.map((x) =>
                        x.stockUnitId === it.stockUnitId ? { ...x, salePrice: v } : x,
                      ),
                    );
                  }}
                  placeholder="0.00"
                  style={{ marginTop: 4 }}
                />
              </label>
            </div>
          ))}
        </div>

        {msg && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--danger) 10%, var(--panel))",
              color: "var(--danger)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {msg}
          </div>
        )}

        <button
          className="btn primary"
          type="button"
          onClick={saveSale}
          disabled={saving}
          style={{ width: "100%", marginTop: 16, minHeight: 50, fontSize: 15, fontWeight: 800 }}
        >
          {saving ? "Saving…" : `Save Sale${items.length > 0 ? ` · £${totalSale.toFixed(2)}` : ""}`}
        </button>
      </div>
    </div>
  );
}
