-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD', 'ENDED');

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "stockUnitId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT,
    "askPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_stockUnitId_idx" ON "Listing"("stockUnitId");

-- CreateIndex
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_platform_listingId_key" ON "Listing"("platform", "listingId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_stockUnitId_fkey" FOREIGN KEY ("stockUnitId") REFERENCES "StockUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
