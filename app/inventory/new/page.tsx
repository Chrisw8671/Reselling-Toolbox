"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

type MissingKey = "title" | "condition" | "brand" | "purchaseCost" | "purchasedFrom";

const MISSING_LABEL: Record<MissingKey, string> = {
  title: "Title",
  condition: "Condition",
  brand: "Brand",
  purchaseCost: "Purchase cost",
  purchasedFrom: "Purchased from",
};

type LocationOption = { code: string; label: string };

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
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10));

  // ✅ Location now driven by dropdown + optional custom input
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationChoice, setLocationChoice] = useState<string>(""); // "" | "__custom__" | code
  const [locationCustom, setLocationCustom] = useState<string>("");
  const [locationCode, setLocationCode] = useState("");

  const [notes, setNotes] = useState("");

  const [purchasedFromChoice, setPurchasedFromChoice] = useState<
    (typeof PURCHASED_FROM_OPTIONS)[number] | ""
  >("");
  const [purchasedFromOther, setPurchasedFromOther] = useState("");

  const [purchaseRef, setPurchaseRef] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");

  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");

  const [missingFields, setMissingFields] = useState<MissingKey[]>([]);
  const [msg, setMsg] = useState("");
  const [importingFromUrl, setImportingFromUrl] = useState(false);

  // Fetch SKU on load
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = (params.get("title") ?? "").trim();
    const brandFromQuery = (params.get("brand") ?? "").trim();
    const targetBuy = (params.get("targetBuy") ?? "").trim();

    if (title && !titleOverride) setTitleOverride(title);
    if (brandFromQuery && !brand) setBrand(brandFromQuery);
    if (targetBuy && Number.isFinite(Number(targetBuy)) && Number(targetBuy) > 0) {
      setPurchaseCost(Number(targetBuy).toFixed(2));
    }
  }, [titleOverride, brand]);

  // Load locations for dropdown
  useEffect(() => {
    async function loadLocations() {
      const res = await fetch("/api/locations/list");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.locations)) {
        setLocations(
          data.locations.map((l: any) => ({
            code: String(l.code),
            label: String(l.label ?? l.code),
          })),
        );
      }
    }
    loadLocations();
  }, []);

  function computeMissing(): MissingKey[] {
    const missing: MissingKey[] = [];

    if (!titleOverride.trim()) missing.push("title");
    if (!condition) missing.push("condition");
    if (!brand.trim()) missing.push("brand");

    const costNum = Number(purchaseCost);
    if (!Number.isFinite(costNum) || costNum <= 0) missing.push("purchaseCost");

    if (!purchasedFromChoice) {
      missing.push("purchasedFrom");
    } else if (purchasedFromChoice === "Other" && !purchasedFromOther.trim()) {
      missing.push("purchasedFrom");
    }

    return missing;
  }

  // Keep missingFields + message synced
  useEffect(() => {
    const m = computeMissing();
    setMissingFields(m);

    if (m.length > 0) {
      setMsg("Missing: " + m.map((k) => MISSING_LABEL[k]).join(", "));
    } else {
      setMsg((prev) => (prev.startsWith("Missing:") ? "" : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    titleOverride,
    condition,
    brand,
    purchaseCost,
    purchasedFromChoice,
    purchasedFromOther,
  ]);

  function hasMissing(key: MissingKey) {
    return missingFields.includes(key);
  }

  const requiredStar = (key: MissingKey) =>
    hasMissing(key) ? <span style={{ color: "red", marginLeft: 6 }}>*</span> : null;

  async function save() {
    const missing = computeMissing();

    if (missing.length > 0) {
      setMissingFields(missing);
      alert(
        "Please fill in the following required field(s):\n\n" +
          missing.map((k) => `• ${MISSING_LABEL[k]}`).join("\n"),
      );
      setMsg("Missing: " + missing.map((k) => MISSING_LABEL[k]).join(", "));
      return;
    }

    setMsg("");

    const purchasedFrom =
      purchasedFromChoice === "Other" ? purchasedFromOther.trim() : purchasedFromChoice;

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

    // reset location selection
    setLocationChoice("");
    setLocationCustom("");
    setLocationCode("");

    setMissingFields([]);
    setMsg("Saved ✓");

    const res2 = await fetch("/api/stock/next-sku");
    const data2 = await res2.json().catch(() => ({}));
    if (res2.ok && data2?.sku) setSku(data2.sku);

    setTimeout(() => titleRef.current?.focus(), 0);
  }

  async function importFromPurchaseUrl() {
    const url = purchaseUrl.trim();
    if (!url) {
      setMsg("Add a purchase URL first.");
      return;
    }

    setImportingFromUrl(true);
    setMsg("Importing listing data...");

    const res = await fetch("/api/stock/import-from-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);

    if (!res) {
      setMsg("Could not import data from listing URL.");
      setImportingFromUrl(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Could not import data from listing URL.");
      setImportingFromUrl(false);
      return;
    }

    const imported = data?.imported ?? {};

    if (!titleOverride.trim() && imported.titleOverride) {
      setTitleOverride(String(imported.titleOverride));
    }

    if (!brand.trim() && imported.brand) {
      setBrand(String(imported.brand));
    }

    if ((!condition || condition === "") && imported.condition) {
      setCondition(String(imported.condition));
    }

    if ((!size || size === "") && imported.size) {
      setSize(String(imported.size));
    }

    if ((purchaseCost === "0" || !purchaseCost.trim()) && imported.purchaseCost) {
      const raw = String(imported.purchaseCost).replace(/[^0-9.]/g, "");
      if (raw) setPurchaseCost(raw);
    }

    if (!purchasedFromChoice && imported.purchasedFrom) {
      const source = String(imported.purchasedFrom);
      if (PURCHASED_FROM_OPTIONS.includes(source as (typeof PURCHASED_FROM_OPTIONS)[number])) {
        setPurchasedFromChoice(source as (typeof PURCHASED_FROM_OPTIONS)[number]);
      }
    }

    if (!notes.trim() && imported.notesSnippet) {
      setNotes(String(imported.notesSnippet));
    }

    setMsg("Imported listing data ✓");
    setImportingFromUrl(false);
  }

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>New Inventory Item</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            SKU: {sku || "Generating..."}
          </div>

          {msg && (
            <div className="muted" style={{ marginTop: 8 }}>
              {msg}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" type="button" onClick={() => router.push("/inventory")}>
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
                />
              </label>
            ) : (
              <div />
            )}

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
                    e.target.value as (typeof PURCHASED_FROM_OPTIONS)[number] | "",
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
              <input
                value={purchaseRef}
                onChange={(e) => setPurchaseRef(e.target.value)}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Purchase URL
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  value={purchaseUrl}
                  onChange={(e) => setPurchaseUrl(e.target.value)}
                  placeholder="https://..."
                />
                <button
                  className="btn"
                  type="button"
                  onClick={importFromPurchaseUrl}
                  disabled={importingFromUrl}
                >
                  {importingFromUrl ? "Importing..." : "Import data"}
                </button>
              </div>
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
