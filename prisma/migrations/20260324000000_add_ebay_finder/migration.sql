-- CreateTable
CREATE TABLE "EbaySearch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "category" TEXT,
    "condition" TEXT,
    "maxBuyPrice" DECIMAL(65,30),
    "minProfitMargin" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "EbaySearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbaySearchResult" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "ebayItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currentPrice" DECIMAL(65,30) NOT NULL,
    "imageUrl" TEXT,
    "itemUrl" TEXT NOT NULL,
    "condition" TEXT,
    "avgSoldPrice" DECIMAL(65,30),
    "soldSampleSize" INTEGER,
    "estimatedMargin" DECIMAL(65,30),
    "aiAnalysis" TEXT,
    "aiConfidence" INTEGER,
    "aiRecommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbaySearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EbaySearchResult_searchId_idx" ON "EbaySearchResult"("searchId");

-- CreateIndex
CREATE INDEX "EbaySearchResult_status_idx" ON "EbaySearchResult"("status");

-- AddForeignKey
ALTER TABLE "EbaySearchResult" ADD CONSTRAINT "EbaySearchResult_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "EbaySearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
