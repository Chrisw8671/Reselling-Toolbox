export const FULFILLMENT_STATUSES = [
  "PENDING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "ISSUE",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  PENDING: "Pending",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  ISSUE: "Issue",
};

export const FULFILLMENT_COLORS: Record<FulfillmentStatus, string> = {
  PENDING: "#64748b",
  PACKED: "#0ea5e9",
  SHIPPED: "#6366f1",
  DELIVERED: "#16a34a",
  ISSUE: "#dc2626",
};

export const NEXT_STATUS_OPTIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ["PACKED", "SHIPPED", "ISSUE"],
  PACKED: ["SHIPPED", "ISSUE"],
  SHIPPED: ["DELIVERED", "ISSUE"],
  DELIVERED: [],
  ISSUE: ["PENDING", "PACKED", "SHIPPED", "DELIVERED"],
};

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return FULFILLMENT_STATUSES.includes(value as FulfillmentStatus);
}
