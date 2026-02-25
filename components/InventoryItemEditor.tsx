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

type ListingRow = {
  id: string;
  platform: string;
  listingId: string;
  url: string;
  askPrice: number;
  status: string;
  listedAt: string;
  endedAt: string;
};

type Item = {
  sku: string;
  stockUnitId: string;
  titleOverride: string;
  status: string;
  condition: string;

  // ✅ metadata
  brand: string;
  size: string;
  purchasedFrom: string;
  purchaseRef: string;
  purchaseUrl: string;

  // ✅ pricing
  targetMarginPct: string | number; // we store/edit as string below
  recommendedPrice: string | number;
  lastPricingEvalAt: string; // yyyy-mm-dd or ""

  purchaseCost: number;
  extraCost: number;
  purchasedAt: string; // yyyy-mm-dd
  locationCode: string;
  notes: string;

  archived: boolean;
  createdAt: string; // display
  listings: ListingRow[];
};

const LISTING_STATUSES = ["ACTIVE", "PAUSED", "SOLD", "ENDED"];

function badgeColor(platform: string) {
  const normalized = platform.trim().toLowerCase();
  if (normalized === "ebay") return "#facc15";
  if (normalized === "vinted") return "#5eead4";
  if (normalized === "depop") return "#f9a8d4";
  if (normalized === "etsy") return "#fdba74";
  if (normalized === "facebook") return "#93c5fd";
  return "#c4b5fd";
}

export default function InventoryItemEditor({ item }: { item: Item }) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Existing editable fields
  const [titleOverride, setTitleOverride] = useState(item.titleOverride);
  const [condition, setCondition] = useState(item.condition);
  const [notes, setNotes] = useState(item.notes);
  const [purchaseCost, setPurchaseCost] = useState(String(item.purchaseCost ?? 0));
  const [extraCost, setExtraCost] = useState(String(item.extraCost ?? 0));
  const [purchasedAt, setPurchasedAt] = useState(item.purchasedAt);
  const [archived, setArchived] = useState(Boolean(item.archived));

  // ✅ New metadata fields
  const [brand, setBrand] = useState(item.brand ?? "");
  const [size, setSize] = useState(item.size ?? "");
  const [purchasedFrom, setPurchasedFrom] = useState(item.purchasedFrom ?? "");
  const [purchaseRef, setPurchaseRef] = useState(item.purchaseRef ?? "");
  const [purchaseUrl, setPurchaseUrl] = useState(item.purchaseUrl ?? "");

  // ✅ Pricing fields (strings in inputs)
  const [targetMarginPct, setTargetMarginPct] = useState(
    item.targetMarginPct === "" || item.targetMarginPct === undefined
      ? ""
      : String(item.targetMarginPct),
  );
  const [recommendedPrice, setRecommendedPrice] = useState(
    item.recommendedPrice === "" || item.recommendedPrice === undefined
      ? ""
      : String(item.recommendedPrice),
  );
  const [lastPricingEvalAt, setLastPricingEvalAt] = useState(item.lastPricingEvalAt ?? "");

  // Location dropdown + custom input
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationChoice, setLocationChoice] = useState<string>("");
  const [locationCustom, setLocationCustom] = useState<string>("");
  const [locationCode, setLocationCode] = useState(item.locationCode);

  // Listings
  const [listings, setListings] = useState<ListingRow[]>(item.listings);
  const [listingBusyId, setListingBusyId] = useState<string>("");

  const [newPlatform, setNewPlatform] = useState("");
  const [newListingId, setNewListingId] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newAskPrice, setNewAskPrice] = useState("0");
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [newListedAt, setNewListedAt] = useState(new Date().toISOString().slice(0, 10));
  const [newEndedAt, setNewEndedAt] = useState("");

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      const res = await fetch("/api/locations/list");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.locations)) {
        const opts = data.locations.map((l: { code: string; label?: string }) => ({
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

      setBrand(item.brand ?? "");
      setSize(item.size ?? "");
      setPurchasedFrom(item.purchasedFrom ?? "");
      setPurchaseRef(item.purchaseRef ?? "");
      setPurchaseUrl(item.purchaseUrl ?? "");

      setTargetMarginPct(
        item.targetMarginPct === "" || item.targetMarginPct === undefined
          ? ""
          : String(item.targetMarginPct),
      );
      setRecommendedPrice(
        item.recommendedPrice === "" || item.recommendedPrice === undefined
          ? ""
          : String(item.recommendedPrice),
      );
      setLastPricingEvalAt(item.lastPricingEvalAt ?? "");

      setLocationCode(item.locationCode);
      setListings(item.listings);
      setMsg("");
    }
  }, [isEditing, item]);

  async function createListing() {
    if (!newPlatform.trim() || !newListingId.trim()) {
      alert("Platform and Listing ID are required.");
      return;
    }

    const askPriceNumber = Number(newAskPrice);
    if (!Number.isFinite(askPriceNumber) || askPriceNumber < 0) {
      alert("Ask price must be a number >= 0.");
      return;
    }

    setListingBusyId("new");
    try {
      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockUnitId: item.stockUnitId,
          platform: newPlatform,
          listingId: newListingId,
          url: newUrl,
          askPrice: askPriceNumber,
          status: newStatus,
          listedAt: newListedAt,
          endedAt: newEndedAt || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to create listing");
        return;
      }

      router.refresh();
      setNewPlatform("");
      setNewListingId("");
      setNewUrl("");
      setNewAskPrice("0");
      setNewStatus("ACTIVE");
      setNewEndedAt("");
    } finally {
      setListingBusyId("");
    }
  }

  async function updateListing(listing: ListingRow) {
    setListingBusyId(listing.id);
    try {
      const res = await fetch("/api/listings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...listing,
          askPrice: Number(listing.askPrice),
          endedAt: listing.endedAt || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to update listing");
        return;
      }

      router.refresh();
    } finally {
      setListingBusyId("");
    }
  }

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing?")) return;

    setListingBusyId(id);
    try {
      const res = await fetch("/api/listings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to delete listing");
        return;
      }

      router.refresh();
    } finally {
      setListingBusyId("");
    }
  }

  const hasChanges = useMemo(() => {
    return (
      titleOverride !== item.titleOverride ||
      condition !== item.condition ||
      notes !== item.notes ||
      purchaseCost !== String(item.purchaseCost ?? 0) ||
      extraCost !== String(item.extraCost ?? 0) ||
      purchasedAt !== item.purchasedAt ||
      (locationCode ?? "") !== (item.locationCode ?? "") ||
      archived !== Boolean(item.archived) ||
      brand !== (item.brand ?? "") ||
      size !== (item.size ?? "") ||
      purchasedFrom !== (item.purchasedFrom ?? "") ||
      purchaseRef !== (item.purchaseRef ?? "") ||
      purchaseUrl !== (item.purchaseUrl ?? "") ||
      targetMarginPct !==
        (item.targetMarginPct === "" || item.targetMarginPct === undefined
          ? ""
          : String(item.targetMarginPct)) ||
      recommendedPrice !==
        (item.recommendedPrice === "" || item.recommendedPrice === undefined
          ? ""
          : String(item.recommendedPrice)) ||
      lastPricingEvalAt !== (item.lastPricingEvalAt ?? "")
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
    brand,
    size,
    purchasedFrom,
    purchaseRef,
    purchaseUrl,
    targetMarginPct,
    recommendedPrice,
    lastPricingEvalAt,
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
    setIsEditing(false);
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

    // Optional pricing numeric validation (only if provided)
    const targetMarginNum =
      targetMarginPct.trim() === "" ? null : Number(targetMarginPct);
    if (targetMarginNum !== null && (!Number.isFinite(targetMarginNum) || targetMarginNum < 0)) {
      missing.push("Target margin %");
    }

    const recommendedNum =
      recommendedPrice.trim() === "" ? null : Number(recommendedPrice);
    if (recommendedNum !== null && (!Number.isFinite(recommendedNum) || recommendedNum < 0)) {
      missing.push("Recommended price");
    }

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
          titleOverride: titleOverride.trim() || "",
          condition: condition || "",
          notes: notes.trim() || "",

          purchaseCost: costNum,
          extraCost: extraNum,
          purchasedAt,
          locationCode: (locationCode ?? "").trim(),

          archived,

          // ✅ metadata
          brand: brand.trim(),
          size: size.trim(),
          purchasedFrom: purchasedFrom.trim(),
          purchaseRef: purchaseRef.trim(),
          purchaseUrl: purchaseUrl.trim(),

          // ✅ pricing
          targetMarginPct: targetMarginPct.trim() === "" ? "" : Number(targetMarginPct),
          recommendedPrice: recommendedPrice.trim() === "" ? "" : Number(recommendedPrice),
          lastPricingEvalAt: lastPricingEvalAt.trim(), // "" clears if API supports it
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
            <button className="btn" type="button" disabled={busy} onClick={discardChanges}>
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

          <label>
            Brand
            <input value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!isEditing} />
          </label>

          <label>
            Size
            <input value={size} onChange={(e) => setSize(e.target.value)} disabled={!isEditing} />
          </label>

          {/* Location dropdown */}
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

      {/* Purchase metadata */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Purchase metadata</div>

        <div className="formGrid">
          <label>
            Purchased from
            <input
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
              disabled={!isEditing}
              placeholder="e.g. Vinted, eBay, Store"
            />
          </label>

          <label>
            Purchase ref
            <input
              value={purchaseRef}
              onChange={(e) => setPurchaseRef(e.target.value)}
              disabled={!isEditing}
              placeholder="Order / receipt ref"
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Purchase URL
            <input
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              disabled={!isEditing}
              placeholder="https://..."
            />
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

      {/* Pricing */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Pricing</div>

        <div className="formGrid">
          <label>
            Target margin %
            <input
              type="number"
              step="0.01"
              min={0}
              value={targetMarginPct}
              onChange={(e) => setTargetMarginPct(e.target.value)}
              disabled={!isEditing}
              placeholder="e.g. 25"
            />
          </label>

          <label>
            Recommended price
            <input
              type="number"
              step="0.01"
              min={0}
              value={recommendedPrice}
              onChange={(e) => setRecommendedPrice(e.target.value)}
              disabled={!isEditing}
              placeholder="e.g. 39.99"
            />
          </label>

          <label>
            Pricing last evaluated
            <input
              type="date"
              value={lastPricingEvalAt}
              onChange={(e) => setLastPricingEvalAt(e.target.value)}
              disabled={!isEditing}
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
          disabled={!isEditing}
        />
      </label>

      {/* Listings */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Listings</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.4fr 2fr 1fr 1.2fr 1.2fr 1.2fr auto",
            gap: 8,
            alignItems: "end",
            marginBottom: 12,
          }}
        >
          <label>
            Platform
            <input value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} />
          </label>
          <label>
            Listing ID
            <input value={newListingId} onChange={(e) => setNewListingId(e.target.value)} />
          </label>
          <label>
            URL
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          </label>
          <label>
            Ask £
            <input
              type="number"
              step="0.01"
              value={newAskPrice}
              onChange={(e) => setNewAskPrice(e.target.value)}
            />
          </label>
          <label>
            Status
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {LISTING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Listed at
            <input type="date" value={newListedAt} onChange={(e) => setNewListedAt(e.target.value)} />
          </label>
          <label>
            Ended at
            <input type="date" value={newEndedAt} onChange={(e) => setNewEndedAt(e.target.value)} />
          </label>

          <button className="btn" type="button" onClick={createListing}>
            {listingBusyId === "new" ? "Adding..." : "Add"}
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {listings.length === 0 && <div className="muted">No listings yet.</div>}

          {listings.map((listing) => (
            <div
              key={listing.id}
              className="tableWrap"
              style={{ padding: 10, display: "grid", gap: 8 }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    background: badgeColor(listing.platform),
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {listing.platform || "Platform"}
                </span>
                <span className="muted">#{listing.listingId}</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.4fr 2fr 1fr 1.2fr 1.2fr 1.2fr auto",
                  gap: 8,
                  alignItems: "end",
                }}
              >
                <label>
                  Platform
                  <input
                    value={listing.platform}
                    onChange={(e) => {
                      const next = e.target.value;
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, platform: next } : x)),
                      );
                    }}
                  />
                </label>
                <label>
                  Listing ID
                  <input
                    value={listing.listingId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, listingId: next } : x)),
                      );
                    }}
                  />
                </label>
                <label>
                  URL
                  <input
                    value={listing.url}
                    onChange={(e) => {
                      const next = e.target.value;
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, url: next } : x)),
                      );
                    }}
                  />
                </label>
                <label>
                  Ask £
                  <input
                    type="number"
                    step="0.01"
                    value={listing.askPrice}
                    onChange={(e) => {
                      const next = Number(e.target.value || 0);
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, askPrice: next } : x)),
                      );
                    }}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={listing.status}
                    onChange={(e) => {
                      const next = e.target.value;
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, status: next } : x)),
                      );
                    }}
                  >
                    {LISTING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Listed at
                  <input
                    type="date"
                    value={listing.listedAt}
                    onChange={(e) => {
                      const next = e.target.value;
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, listedAt: next } : x)),
                      );
                    }}
                  />
                </label>
                <label>
                  Ended at
                  <input
                    type="date"
                    value={listing.endedAt}
                    onChange={(e) => {
                      const next = e.target.value;
                      setListings((prev) =>
                        prev.map((x) => (x.id === listing.id ? { ...x, endedAt: next } : x)),
                      );
                    }}
                  />
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => updateListing(listing)}
                    disabled={listingBusyId === listing.id}
                  >
                    Save
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => deleteListing(listing.id)}
                    disabled={listingBusyId === listing.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}