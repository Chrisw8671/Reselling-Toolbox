-- CreateTable
CREATE TABLE "ReturnCase" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "stockUnitId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "returnShippingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "restockable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnCase_saleId_idx" ON "ReturnCase"("saleId");

-- CreateIndex
CREATE INDEX "ReturnCase_stockUnitId_idx" ON "ReturnCase"("stockUnitId");

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_stockUnitId_fkey" FOREIGN KEY ("stockUnitId") REFERENCES "StockUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
