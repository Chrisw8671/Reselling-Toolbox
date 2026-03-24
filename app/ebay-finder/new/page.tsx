"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EBAY_CONDITIONS = [
  { value: "", label: "Any condition" },
  { value: "NEW", label: "New" },
  { value: "USED_EXCELLENT", label: "Used – Excellent" },
  { value: "USED_VERY_GOOD", label: "Used – Very Good" },
  { value: "USED_GOOD", label: "Used – Good" },
  { value: "USED_ACCEPTABLE", label: "Used – Acceptable" },
];

// Common eBay category IDs (GB)
const EBAY_CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "11450", label: "Clothing, Shoes & Accessories" },
  { value: "15032", label: "Men's Clothing" },
  { value: "15724", label: "Women's Clothing" },
  { value: "58058", label: "Trainers / Sneakers" },
  { value: "293", label: "Consumer Electronics" },
  { value: "9355", label: "Mobile Phones & Accessories" },
  { value: "267", label: "Books, Comics & Magazines" },
  { value: "1249", label: "Video Games & Consoles" },
  { value: "2984", label: "Toys & Games" },
  { value: "550", label: "Art & Antiques" },
  { value: "11116", label: "Jewellery & Watches" },
  { value: "625", label: "Musical Instruments" },
  { value: "11700", label: "Home, Furniture & DIY" },
  { value: "26395", label: "Sporting Goods" },
];

export default function NewEbaySearchPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [maxBuyPrice, setMaxBuyPrice] = useState("");
  const [minProfitMargin, setMinProfitMargin] = useState("20");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !keywords.trim()) {
      setError("Search name and keywords are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/ebay-finder/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          keywords: keywords.trim(),
          category: category || null,
          condition: condition || null,
          maxBuyPrice: maxBuyPrice ? parseFloat(maxBuyPrice) : null,
          minProfitMargin: parseFloat(minProfitMargin) || 20,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save search.");
        setSaving(false);
        return;
      }

      router.push(`/ebay-finder?searchId=${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
      <a href="/ebay-finder" style={{ color: "inherit", fontSize: 14 }}>
        ← Back to eBay Finder
      </a>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "16px 0 4px" }}>New Search</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Set your search criteria. Click <strong>Run Search</strong> on the results page to start scanning.
      </p>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="tableWrap" style={{ padding: 20 }}>
        <div className="formGrid">
          {/* Search name */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Search Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vintage Levi Jeans"
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Keywords */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Keywords *
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. vintage levi 501 jeans"
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Use specific terms to get more accurate sold price comparisons.
            </p>
          </div>

          {/* Category */}
          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              {EBAY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              {EBAY_CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max buy price */}
          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Max Buy Price (£)
            </label>
            <input
              type="number"
              value={maxBuyPrice}
              onChange={(e) => setMaxBuyPrice(e.target.value)}
              placeholder="e.g. 30"
              min="0"
              step="0.01"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Leave blank for no price limit.
            </p>
          </div>

          {/* Min profit margin */}
          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Min Profit Margin (%)
            </label>
            <input
              type="number"
              value={minProfitMargin}
              onChange={(e) => setMinProfitMargin(e.target.value)}
              placeholder="20"
              min="1"
              max="500"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Only items above this margin are AI-analysed.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} className="btn">
            {saving ? "Saving…" : "Save Search"}
          </button>
          <a href="/ebay-finder" style={{ padding: "8px 16px", fontSize: 14, color: "inherit" }}>
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
