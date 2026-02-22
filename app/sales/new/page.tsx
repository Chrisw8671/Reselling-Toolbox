"use client";

import Link from "next/link";
import { useState } from "react";

type SaleItem = {
  stockUnitId: string;
  sku: string;
  title: string;
  status: string;
  loc?: string;
  purchaseCost: number;
  salePrice: string; // keep as string for input
};

export default function CreateSalePage() {
  const [platform, setPlatform] = useState("Vinted");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orderRef, setOrderRef] = useState("");

  const [shippingCharged, setShippingCharged] = useState("0");
  const [platformFees, setPlatformFees] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [otherCosts, setOtherCosts] = useState("0");

  const [skuInput, setSkuInput] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [msg, setMsg] = useState<string>("");

  async function addSku() {
    setMsg("");
    const sku = skuInput.trim();
    if (!sku) return;

    // prevent duplicates
    if (items.some((x) => x.sku.toUpperCase() === sku.toUpperCase())) {
      setMsg("That Item is already added.");
      return;
    }

    const res = await fetch(`/api/stock/by-sku?sku=${encodeURIComponent(sku)}`);
    const data = await res.json();

    if (!res.ok) {
      setMsg(data.error ?? "Could not add Item");
      return;
    }

    const it = data.item as {
      id: string;
      sku: string;
      titleOverride: string | null;
      status: string;
      purchaseCost: number;
      location: { code: string } | null;
    };

    setItems((prev) => [
      ...prev,
      {
        stockUnitId: it.id,
        sku: it.sku,
        title: it.titleOverride ?? "—",
        status: it.status,
        loc: it.location?.code,
        purchaseCost: Number(it.purchaseCost),
        salePrice: "",
      },
    ]);

    setSkuInput("");
  }

  function removeItem(stockUnitId: string) {
    setItems((prev) => prev.filter((x) => x.stockUnitId !== stockUnitId));
  }

  async function saveSale() {
    setMsg("");

    if (items.length === 0) {
      setMsg("Add at least one Item.");
      return;
    }

    // validate prices
    for (const it of items) {
      const p = Number(it.salePrice);
      if (!Number.isFinite(p) || p < 0) {
        setMsg(`Enter a valid sale price for ${it.sku}`);
        return;
      }
    }

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
    if (!res.ok) {
      setMsg(data.error ?? "Failed to save sale");
      return;
    }

    setMsg(`Saved sale! (id: ${data.saleId})`);

    // reset for next sale
    setItems([]);
    setOrderRef("");
    setShippingCharged("0");
    setPlatformFees("0");
    setShippingCost("0");
    setOtherCosts("0");
  }

  const totalSale = items.reduce((s, it) => s + (Number(it.salePrice) || 0), 0);

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Create Sale</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            Add items, enter prices, then save.
          </div>
        </div>

        <Link className="btn" href="/sales">
          ← Sales List
        </Link>
      </div>

      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <label>
            Platform
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="Vinted">Vinted</option>
              <option value="eBay">eBay</option>
              <option value="Depop">Depop</option>
              <option value="Facebook Marketplace">Facebook Marketplace</option>
              <option value="In Person">In Person</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Sale date
            <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Order ref (optional)
            <input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} style={{ width: "100%" }} />
          </label>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 12 }}>
          <label>
            Shipping charged
            <input type="number" step="0.01" value={shippingCharged} onChange={(e) => setShippingCharged(e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Platform fees
            <input type="number" step="0.01" value={platformFees} onChange={(e) => setPlatformFees(e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Shipping cost (you paid)
            <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Other costs
            <input type="number" step="0.01" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} style={{ width: "100%" }} />
          </label>
        </div>
      </div>

      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 280px" }}>
            Add Item
            <input
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSku();
                }
              }}
              placeholder="Type/scan item SKU and press Enter"
              style={{ width: "100%" }}
            />
          </label>

          <button className="btn" type="button" onClick={addSku}>
            + Add Item
          </button>

          <div className="muted" style={{ marginLeft: "auto" }}>
            Items: {items.length} • Total sale: £{totalSale.toFixed(2)}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <table className="table">
            <thead className="thead">
              <tr>
                <th className="th" style={{ width: 160 }}>Item SKU</th>
                <th className="th">Title</th>
                <th className="th" style={{ width: 90 }}>Loc</th>
                <th className="th" style={{ width: 130 }}>Buy cost</th>
                <th className="th" style={{ width: 150 }}>Sale price</th>
                <th className="th" style={{ width: 90, textAlign: "right" }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr className="tr" key={it.stockUnitId}>
                  <td className="td">{it.sku}</td>
                  <td className="td titleCell">{it.title}</td>
                  <td className="td">{it.loc ?? <span className="muted">—</span>}</td>
                  <td className="td">£{it.purchaseCost.toFixed(2)}</td>
                  <td className="td">
                    <input
                      type="number"
                      step="0.01"
                      value={it.salePrice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((prev) =>
                          prev.map((x) => (x.stockUnitId === it.stockUnitId ? { ...x, salePrice: v } : x))
                        );
                      }}
                      style={{ width: "100%" }}
                    />
                  </td>
                  <td className="td" style={{ textAlign: "right" }}>
                    <button className="iconBtn" type="button" onClick={() => removeItem(it.stockUnitId)} title="Remove">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr className="tr">
                  <td className="td muted" colSpan={6}>
                    No items added yet. Type a item SKU above and press Enter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn" type="button" onClick={saveSale}>
            Save Sale
          </button>
        </div>

        {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </div>
  );
}
