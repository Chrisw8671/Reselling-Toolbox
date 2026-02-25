/*
  Warnings:

  - You are about to alter the column `targetMarginPct` on the `StockUnit` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `recommendedPrice` on the `StockUnit` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PACKED', 'SHIPPED', 'DELIVERED', 'ISSUE');

-- AlterTable
ALTER TABLE "InventoryActionLog" ADD COLUMN     "lastPricingEvalAt" TIMESTAMP(3),
ADD COLUMN     "recommendedPrice" DECIMAL(65,30),
ADD COLUMN     "targetMarginPct" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "StockUnit" ALTER COLUMN "targetMarginPct" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "recommendedPrice" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ProductWatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "targetBuyPrice" DECIMAL(65,30),
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductWatch_productId_key" ON "ProductWatch"("productId");

-- AddForeignKey
ALTER TABLE "ProductWatch" ADD CONSTRAINT "ProductWatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
