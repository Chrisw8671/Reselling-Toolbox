"use client";

import { ui } from "@/lib/ui";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatStatus } from "@/lib/status";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LISTED: "#2563eb",
  SOLD: "#9333ea",
  RETURNED: "#f59e0b",
  WRITTEN_OFF: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock",
  LISTED: "Listed",
  SOLD: "Sold",
  RETURNED: "Returned",
  WRITTEN_OFF: "Written Off",
};

const MAIN_STAGES = ["INVENTORY", "LISTED", "SOLD", "SHIPPED", "COMPLETED"] as const;
type MainStage = (typeof MAIN_STAGES)[number];

const STAGE_LABEL: Record<MainStage, string> = {
  INVENTORY: "Inventory",
  LISTED: "Listed",
  SOLD: "Sold",
  SHIPPED: "Shipped",
  COMPLETED: "Delivered",
};

const PREP_TASKS = [
  "Tested",
  "Cleaned",
  "Photos taken",
  "Description written",
  "Ready to list",
] as const;

const LISTING_STATUSES = ["ACTIVE", "PAUSED", "SOLD", "ENDED"];

function badgeColor(platform: string) {
  const n = platform.trim().toLowerCase();
  if (n === "ebay") return "#facc15";
  if (n === "vinted") return "#5eead4";
  if (n === "depop") return "#f9a8d4";
  if (n === "etsy") return "#fdba74";
  if (n === "facebook") return "#93c5fd";
  return "#c4b5fd";
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  brand: string;
  size: string;
  purchasedFrom: string;
  purchaseRef: string;
  purchaseUrl: string;
  targetMarginPct: string | number;
  recommendedPrice: string | number;
  lastPricingEvalAt: string;
  purchaseCost: number;
  extraCost: number;
  purchasedAt: string;
  locationCode: string;
  notes: string;
  archived: boolean;
  createdAt: string;
  saleId: string;
  saleDate: string;
  fulfillmentStatus: string;
  shippedAt: string;
  deliveredAt: string;
  listings: ListingRow[];
};

// ─── Stage helpers ────────────────────────────────────────────────────────────

function computeMainStage(item: Item): MainStage {
  if (item.fulfillmentStatus === "DELIVERED") return "COMPLETED";
  if (item.fulfillmentStatus === "SHIPPED") return "SHIPPED";
  if (item.status === "SOLD") return "SOLD";
  if (item.status === "LISTED") return "LISTED";
  return "INVENTORY";
}

function getStageDate(item: Item, stage: MainStage) {
  if (stage === "INVENTORY") return item.purchasedAt;
  if (stage === "SOLD") return item.saleDate;
  if (stage === "SHIPPED") return item.shippedAt;
  if (stage === "COMPLETED") return item.deliveredAt;
  return "";
}

function getDaysInStage(isoDate: string) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        background: "var(--panel)",
        marginBottom: 10,
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text)",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>{icon}</span>
          {title}
          {badge !== undefined && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                borderRadius: 999,
                padding: "1px 7px",
              }}
            >
              {badge}
            </span>
          )}
        </span>
        <span
          style={{
            color: "var(--muted)",
            fontSize: 18,
            fontWeight: 300,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
            lineHeight: 1,
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MobileInventoryItemEditor({ item }: { item: Item }) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Editable fields
  const [titleOverride, setTitleOverride] = useState(item.titleOverride);
  const [condition, setCondition] = useState(item.condition);
  const [notes, setNotes] = useState(item.notes);
  const [purchaseCost, setPurchaseCost] = useState(String(item.purchaseCost ?? 0));
  const [extraCost, setExtraCost] = useState(String(item.extraCost ?? 0));
  const [purchasedAt, setPurchasedAt] = useState(item.purchasedAt);
  const [archived, setArchived] = useState(Boolean(item.archived));
  const [brand, setBrand] = useState(item.brand ?? "");
  const [size, setSize] = useState(item.size ?? "");
  const [purchasedFrom, setPurchasedFrom] = useState(item.purchasedFrom ?? "");
  const [purchaseRef, setPurchaseRef] = useState(item.purchaseRef ?? "");
  const [purchaseUrl, setPurchaseUrl] = useState(item.purchaseUrl ?? "");
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
  const [lastPricingEvalAt, setLastPricingEvalAt] = useState(
    item.lastPricingEvalAt ?? "",
  );

  // Location
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationChoice, setLocationChoice] = useState<string>("");
  const [locationCustom, setLocationCustom] = useState<string>("");
  const [locationCode, setLocationCode] = useState(item.locationCode);

  // Listings
  const [listings, setListings] = useState<ListingRow[]>(item.listings);
  const [listingBusyId, setListingBusyId] = useState("");
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [stageBusy, setStageBusy] = useState(false);

  // New listing form
  const [newPlatform, setNewPlatform] = useState("");
  const [newListingId, setNewListingId] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newAskPrice, setNewAskPrice] = useState("0");
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [newListedAt, setNewListedAt] = useState(new Date().toISOString().slice(0, 10));
  const [newEndedAt, setNewEndedAt] = useState("");
  const [showNewListingForm, setShowNewListingForm] = useState(false);

  // Stage
  const currentStage = computeMainStage(item);
  const currentStageIndex = MAIN_STAGES.indexOf(currentStage);
  const currentStageDate = getStageDate(item, currentStage);
  const daysInCurrentStage = getDaysInStage(currentStageDate);
  const isStale = typeof daysInCurrentStage === "number" && daysInCurrentStage >= 30;

  // Prep checklist
  const prepState = useMemo(() => {
    const text = `${titleOverride}\n${notes}`.toLowerCase();
    return {
      Tested: /\btested\b/.test(text),
      Cleaned: /\bclean(ed|ing)?\b/.test(text),
      "Photos taken": item.listings.length > 0 || /\bphoto(s|graphed)?\b/.test(text),
      "Description written": titleOverride.trim().length >= 12,
      "Ready to list":
        Boolean(condition) &&
        titleOverride.trim().length >= 12 &&
        /\btested\b/.test(text) &&
        /\bclean(ed|ing)?\b/.test(text),
    } as Record<(typeof PREP_TASKS)[number], boolean>;
  }, [condition, item.listings.length, notes, titleOverride]);

  const prepDoneCount = PREP_TASKS.filter((t) => prepState[t]).length;

  // Load locations
  useEffect(() => {
    fetch("/api/locations/list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.locations)) {
          setLocations(
            data.locations.map((l: { code: string; label?: string }) => ({
              code: String(l.code),
              label: String(l.label ?? l.code),
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Sync location dropdown when locations load
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

  // Reset on exit edit
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function moveToStage(stage: MainStage) {
    if (stageBusy || isEditing) return;
    if (stage === currentStage) return;
    const targetIndex = MAIN_STAGES.indexOf(stage);
    if (targetIndex > currentStageIndex + 1) {
      alert("Move through stages one step at a time.");
      return;
    }
    setStageBusy(true);
    try {
      let res: Response;
      if (stage === "LISTED") {
        res = await fetch("/api/stock/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku: item.sku, status: "LISTED" }),
        });
      } else if (stage === "SOLD") {
        res = await fetch("/api/stock/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku: item.sku, status: "SOLD" }),
        });
      } else if (stage === "SHIPPED") {
        if (!item.saleId) throw new Error("Link a sale before shipping.");
        res = await fetch(`/api/sales/${item.saleId}/fulfillment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fulfillmentStatus: "SHIPPED" }),
        });
      } else if (stage === "COMPLETED") {
        if (!item.saleId) throw new Error("Link a sale before completing.");
        res = await fetch(`/api/sales/${item.saleId}/fulfillment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fulfillmentStatus: "DELIVERED" }),
        });
      } else {
        res = await fetch("/api/stock/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku: item.sku, status: "IN_STOCK" }),
        });
      }
      if (!res.ok) throw new Error("Failed to update stage");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update stage");
    } finally {
      setStageBusy(false);
    }
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

    const targetNum = targetMarginPct.trim() === "" ? null : Number(targetMarginPct);
    if (targetNum !== null && (!Number.isFinite(targetNum) || targetNum < 0))
      missing.push("Target margin %");
    const recNum = recommendedPrice.trim() === "" ? null : Number(recommendedPrice);
    if (recNum !== null && (!Number.isFinite(recNum) || recNum < 0))
      missing.push("Recommended price");

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
          titleOverride: titleOverride.trim(),
          condition,
          notes: notes.trim(),
          purchaseCost: costNum,
          extraCost: extraNum,
          purchasedAt,
          locationCode: (locationCode ?? "").trim(),
          archived,
          brand: brand.trim(),
          size: size.trim(),
          purchasedFrom: purchasedFrom.trim(),
          purchaseRef: purchaseRef.trim(),
          purchaseUrl: purchaseUrl.trim(),
          targetMarginPct: targetMarginPct.trim() === "" ? "" : Number(targetMarginPct),
          recommendedPrice:
            recommendedPrice.trim() === "" ? "" : Number(recommendedPrice),
          lastPricingEvalAt: lastPricingEvalAt.trim(),
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

  async function createListing() {
    if (!newPlatform.trim() || !newListingId.trim()) {
      alert("Platform and Listing ID are required.");
      return;
    }
    const askNum = Number(newAskPrice);
    if (!Number.isFinite(askNum) || askNum < 0) {
      alert("Ask price must be a number ≥ 0.");
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
          askPrice: askNum,
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
      setShowNewListingForm(false);
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
      setExpandedListingId(null);
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

  // ─── Derived display values ──────────────────────────────────────────────────

  const statusColor = STATUS_COLORS[item.status] ?? "var(--muted)";
  const statusLabel = STATUS_LABELS[item.status] ?? formatStatus(item.status);
  const listPrice = item.recommendedPrice ? Number(item.recommendedPrice) : null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Top summary card ── */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 16,
          background: "var(--panel)",
          marginBottom: 10,
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Colored accent strip */}
        <div style={{ height: 4, background: statusColor }} />
        <div style={{ padding: "14px 16px" }}>
          {/* Title row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                lineHeight: 1.3,
                flex: 1,
                letterSpacing: "-0.2px",
              }}
            >
              {item.titleOverride || item.sku}
            </div>
            <span
              className={ui.statusPill}
              style={{
                background: `color-mix(in srgb, ${statusColor} 14%, var(--panel-2))`,
                color: statusColor,
                border: `1px solid color-mix(in srgb, ${statusColor} 28%, var(--border))`,
                flexShrink: 0,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* SKU · location · brand */}
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--muted)",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span>{item.sku}</span>
            {item.locationCode && <span>· {item.locationCode}</span>}
            {item.brand && <span>· {item.brand}</span>}
            {item.condition && <span>· {formatCondition(item.condition)}</span>}
          </div>

          {/* Prices row */}
          <div style={{ marginTop: 8, display: "flex", gap: 16, alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                Cost{" "}
              </span>
              <span style={{ fontSize: 16, fontWeight: 900 }}>
                £{Number(item.purchaseCost).toFixed(2)}
              </span>
            </div>
            {listPrice !== null && (
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                  List{" "}
                </span>
                <span style={{ fontSize: 16, fontWeight: 900 }}>
                  £{listPrice.toFixed(2)}
                </span>
              </div>
            )}
            {listPrice !== null && Number(item.purchaseCost) > 0 && (
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                  Margin{" "}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                  £{(listPrice - Number(item.purchaseCost)).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Edit controls */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {!isEditing ? (
              <button
                className={ui.button}
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setMsg("");
                }}
                style={{
                  height: 38,
                  fontSize: 13,
                  padding: "0 16px",
                  width: "auto",
                  minHeight: 0,
                }}
              >
                ✎ Edit item
              </button>
            ) : (
              <>
                <button
                  className={ui.buttonPrimary}
                  type="button"
                  onClick={saveChanges}
                  disabled={busy || !hasChanges}
                  style={{
                    height: 38,
                    fontSize: 13,
                    padding: "0 16px",
                    width: "auto",
                    minHeight: 0,
                    opacity: busy || !hasChanges ? 0.6 : 1,
                  }}
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
                <button
                  className={ui.button}
                  type="button"
                  onClick={() => {
                    if (!hasChanges || confirm("Discard changes?")) setIsEditing(false);
                  }}
                  style={{
                    height: 38,
                    fontSize: 13,
                    padding: "0 16px",
                    width: "auto",
                    minHeight: 0,
                  }}
                >
                  Discard
                </button>
              </>
            )}
            {msg && (
              <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
                {msg}
              </span>
            )}
            {isEditing && hasChanges && !msg && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Workflow stage strip ── */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 16,
          background: "var(--panel)",
          padding: "14px 16px",
          marginBottom: 10,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--muted)",
            marginBottom: 10,
          }}
        >
          Workflow stage
        </div>

        {/* Horizontal scrollable stage buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {MAIN_STAGES.map((stage, index) => {
            const isDone = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isFuture = index > currentStageIndex;
            const canClick = !stageBusy && !isEditing && index <= currentStageIndex + 1;
            const date = getStageDate(item, stage);

            return (
              <button
                key={stage}
                type="button"
                onClick={() => moveToStage(stage)}
                disabled={!canClick}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: isCurrent
                    ? "2px solid var(--accent)"
                    : isDone
                      ? "1px solid color-mix(in srgb, var(--success) 40%, var(--border))"
                      : "1px solid var(--border)",
                  background: isCurrent
                    ? "var(--accent-soft)"
                    : isDone
                      ? "color-mix(in srgb, var(--success) 8%, var(--panel))"
                      : "var(--panel-2)",
                  cursor: canClick ? "pointer" : "default",
                  opacity: isFuture && index > currentStageIndex + 1 ? 0.5 : 1,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ fontSize: 14 }}>
                  {isDone ? "✓" : isCurrent ? "●" : "○"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isCurrent
                      ? "var(--accent)"
                      : isDone
                        ? "var(--success)"
                        : "var(--muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {STAGE_LABEL[stage]}
                </span>
                {date && (
                  <span
                    style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}
                  >
                    {date}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: isStale ? "#f59e0b" : "var(--muted)",
            fontWeight: isStale ? 700 : 400,
          }}
        >
          {daysInCurrentStage !== null ? (
            <>
              Days in {STAGE_LABEL[currentStage].toLowerCase()}:{" "}
              <strong>{daysInCurrentStage}</strong>
              {isStale ? " · Stale (30+ days)" : ""}
            </>
          ) : (
            "Stage date unavailable"
          )}
        </div>

        {/* Status badges for returned/written-off/archived */}
        {(item.status === "RETURNED" ||
          item.status === "WRITTEN_OFF" ||
          item.archived) && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.status === "RETURNED" && (
              <span
                className={ui.badge}
                style={{ background: "#f59e0b", color: "#111827" }}
              >
                Returned
              </span>
            )}
            {item.status === "WRITTEN_OFF" && (
              <span className={ui.badge} style={{ background: "#ef4444", color: "#fff" }}>
                Written off
              </span>
            )}
            {item.archived && (
              <span className={ui.badge} style={{ background: "#6b7280", color: "#fff" }}>
                Archived
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Preparation checklist ── */}
      <Section
        title="Prep checklist"
        icon="✅"
        badge={`${prepDoneCount}/${PREP_TASKS.length}`}
        defaultOpen={prepDoneCount < PREP_TASKS.length}
      >
        <div style={{ display: "grid", gap: 8, paddingTop: 12 }}>
          {PREP_TASKS.map((task) => (
            <div
              key={task}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: prepState[task] ? "var(--text)" : "var(--muted)",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>
                {prepState[task] ? "✅" : "⬜"}
              </span>
              {task}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Item details ── */}
      <Section title="Item details" icon="📋" defaultOpen>
        <div className={ui.mGrid1} style={{ paddingTop: 12 }}>
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
              <option value="">Select condition…</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {formatCondition(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label>
            Size
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label>
            Location
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
              <option value="">Select location…</option>
              {locations.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
              <option value="__custom__">Other / type manually</option>
            </select>
          </label>
          {locationChoice === "__custom__" && (
            <label>
              Location (custom)
              <input
                value={locationCustom}
                onChange={(e) => {
                  setLocationCustom(e.target.value);
                  setLocationCode(e.target.value);
                }}
                placeholder="e.g. BOX-99"
                disabled={!isEditing}
              />
            </label>
          )}
          <label>
            Archive status
            <select
              value={archived ? "1" : "0"}
              onChange={(e) => setArchived(e.target.value === "1")}
              disabled={!isEditing}
            >
              <option value="0">Active</option>
              <option value="1">Archived</option>
            </select>
          </label>
        </div>
      </Section>

      {/* ── Purchase info ── */}
      <Section title="Purchase" icon="🛒" defaultOpen={false}>
        <div className={ui.mGrid1} style={{ paddingTop: 12 }}>
          <label>
            Purchased from
            <input
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
              disabled={!isEditing}
              placeholder="e.g. Vinted, eBay"
            />
          </label>
          <label>
            Purchase date
            <input
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              disabled={!isEditing}
            />
          </label>
          <div className={ui.mGrid2}>
            <label>
              Cost (£)
              <input
                type="number"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                disabled={!isEditing}
              />
            </label>
            <label>
              Extra cost (£)
              <input
                type="number"
                step="0.01"
                value={extraCost}
                onChange={(e) => setExtraCost(e.target.value)}
                disabled={!isEditing}
              />
            </label>
          </div>
          <label>
            Purchase reference
            <input
              value={purchaseRef}
              onChange={(e) => setPurchaseRef(e.target.value)}
              disabled={!isEditing}
              placeholder="Order / receipt ref"
            />
          </label>
          <label>
            Purchase URL
            <input
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              disabled={!isEditing}
              placeholder="https://…"
            />
          </label>
        </div>
      </Section>

      {/* ── Pricing ── */}
      <Section title="Pricing" icon="💰" defaultOpen={!!item.recommendedPrice}>
        <div className={ui.mGrid1} style={{ paddingTop: 12 }}>
          <div className={ui.mGrid2}>
            <label>
              Target margin (%)
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
              Recommended price (£)
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
          </div>
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
      </Section>

      {/* ── Notes ── */}
      <Section title="Notes" icon="📝" defaultOpen={!!item.notes}>
        <div style={{ paddingTop: 12 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isEditing}
            style={{ width: "100%", minHeight: 100, marginTop: 0 }}
            placeholder="Add any notes about this item…"
          />
        </div>
      </Section>

      {/* ── Listings ── */}
      <Section
        title="Listings"
        icon="🏷️"
        badge={listings.length || undefined}
        defaultOpen={listings.length > 0}
      >
        <div style={{ paddingTop: 12, display: "grid", gap: 10 }}>
          {listings.length === 0 && (
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              No listings yet
            </div>
          )}

          {listings.map((listing) => {
            const isExpanded = expandedListingId === listing.id;
            const isBusy = listingBusyId === listing.id;
            return (
              <div
                key={listing.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--panel-2)",
                  overflow: "hidden",
                }}
              >
                {/* Listing summary row */}
                <button
                  type="button"
                  onClick={() => setExpandedListingId(isExpanded ? null : listing.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 13px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      background: badgeColor(listing.platform),
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#111827",
                      flexShrink: 0,
                    }}
                  >
                    {listing.platform || "?"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      £{Number(listing.askPrice).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      #{listing.listingId} · {listing.status} · {listing.listedAt}
                    </div>
                  </div>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 16,
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  >
                    ›
                  </span>
                </button>

                {/* Expanded edit form */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 13px 13px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div className={ui.mGrid1} style={{ paddingTop: 12 }}>
                      <div className={ui.mGrid2}>
                        <label>
                          Platform
                          <input
                            value={listing.platform}
                            onChange={(e) => {
                              const v = e.target.value;
                              setListings((p) =>
                                p.map((x) =>
                                  x.id === listing.id ? { ...x, platform: v } : x,
                                ),
                              );
                            }}
                          />
                        </label>
                        <label>
                          Listing ID
                          <input
                            value={listing.listingId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setListings((p) =>
                                p.map((x) =>
                                  x.id === listing.id ? { ...x, listingId: v } : x,
                                ),
                              );
                            }}
                          />
                        </label>
                      </div>
                      <label>
                        URL
                        <input
                          value={listing.url}
                          onChange={(e) => {
                            const v = e.target.value;
                            setListings((p) =>
                              p.map((x) => (x.id === listing.id ? { ...x, url: v } : x)),
                            );
                          }}
                        />
                      </label>
                      <div className={ui.mGrid2}>
                        <label>
                          Ask price (£)
                          <input
                            type="number"
                            step="0.01"
                            value={listing.askPrice}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setListings((p) =>
                                p.map((x) =>
                                  x.id === listing.id ? { ...x, askPrice: v } : x,
                                ),
                              );
                            }}
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={listing.status}
                            onChange={(e) => {
                              const v = e.target.value;
                              setListings((p) =>
                                p.map((x) =>
                                  x.id === listing.id ? { ...x, status: v } : x,
                                ),
                              );
                            }}
                          >
                            {LISTING_STATUSES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className={ui.mGrid2}>
                        <label>
                          Listed at
                          <input
                            type="date"
                            value={listing.listedAt}
                            onChange={(e) => {
                              const v = e.target.value;
                              setListings((p) =>
                                p.map((x) =>
                                  x.id === listing.id ? { ...x, listedAt: v } : x,
                                ),
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
                              const v = e.target.value;
                              setListings((p) =>
                                p.map((x) =>
                                  x.id === listing.id ? { ...x, endedAt: v } : x,
                                ),
                              );
                            }}
                          />
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className={ui.buttonPrimary}
                          type="button"
                          onClick={() => updateListing(listing)}
                          disabled={isBusy}
                          style={{ flex: 1, height: 40, fontSize: 13, minHeight: 0 }}
                        >
                          {isBusy ? "Saving…" : "Save listing"}
                        </button>
                        <button
                          className={ui.button}
                          type="button"
                          onClick={() => deleteListing(listing.id)}
                          disabled={isBusy}
                          style={{
                            height: 40,
                            padding: "0 14px",
                            fontSize: 13,
                            width: "auto",
                            minHeight: 0,
                            color: "var(--danger)",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new listing */}
          {!showNewListingForm ? (
            <button
              type="button"
              onClick={() => setShowNewListingForm(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px",
                border: "1px dashed var(--border)",
                borderRadius: 12,
                background: "none",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              + Add listing
            </button>
          ) : (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--panel-2)",
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 12,
                }}
              >
                New listing
              </div>
              <div className={ui.mGrid1}>
                <div className={ui.mGrid2}>
                  <label>
                    Platform
                    <input
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      placeholder="e.g. Vinted"
                    />
                  </label>
                  <label>
                    Listing ID
                    <input
                      value={newListingId}
                      onChange={(e) => setNewListingId(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  URL
                  <input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
                <div className={ui.mGrid2}>
                  <label>
                    Ask price (£)
                    <input
                      type="number"
                      step="0.01"
                      value={newAskPrice}
                      onChange={(e) => setNewAskPrice(e.target.value)}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      {LISTING_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={ui.mGrid2}>
                  <label>
                    Listed at
                    <input
                      type="date"
                      value={newListedAt}
                      onChange={(e) => setNewListedAt(e.target.value)}
                    />
                  </label>
                  <label>
                    Ended at
                    <input
                      type="date"
                      value={newEndedAt}
                      onChange={(e) => setNewEndedAt(e.target.value)}
                    />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={ui.buttonPrimary}
                    type="button"
                    onClick={createListing}
                    disabled={listingBusyId === "new"}
                    style={{ flex: 1, height: 40, fontSize: 13, minHeight: 0 }}
                  >
                    {listingBusyId === "new" ? "Adding…" : "Add listing"}
                  </button>
                  <button
                    className={ui.button}
                    type="button"
                    onClick={() => setShowNewListingForm(false)}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      fontSize: 13,
                      width: "auto",
                      minHeight: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Sale info (if sold) ── */}
      {item.saleId && (
        <Section title="Sale info" icon="🧾" defaultOpen>
          <div style={{ paddingTop: 12, display: "grid", gap: 8 }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}
            >
              {[
                ["Sale date", item.saleDate || "—"],
                [
                  "Fulfillment",
                  item.fulfillmentStatus
                    ? item.fulfillmentStatus.replace(/_/g, " ")
                    : "—",
                ],
                ["Shipped", item.shippedAt || "—"],
                ["Delivered", item.deliveredAt || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                    {label}
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 1, fontSize: 14 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <a
              href={`/mobile/sales/${item.saleId}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--panel-2)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              View sale details
              <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
            </a>
          </div>
        </Section>
      )}

      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          textAlign: "center",
          paddingBottom: 4,
        }}
      >
        Created {item.createdAt}
      </div>
    </div>
  );
}
