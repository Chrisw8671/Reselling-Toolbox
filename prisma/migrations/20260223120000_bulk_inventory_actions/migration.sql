-- Add optimistic concurrency timestamp
ALTER TABLE "StockUnit"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Bulk inventory operation audit log
CREATE TABLE "InventoryActionLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "skuCount" INTEGER NOT NULL,
    "skus" TEXT[],
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conflictSkus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stockUnitId" TEXT,

    CONSTRAINT "InventoryActionLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryActionLog"
ADD CONSTRAINT "InventoryActionLog_stockUnitId_fkey"
FOREIGN KEY ("stockUnitId") REFERENCES "StockUnit"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
