-- AlterTable
ALTER TABLE "StockUnit"
ADD COLUMN     "targetMarginPct" DECIMAL,
ADD COLUMN     "recommendedPrice" DECIMAL,
ADD COLUMN     "lastPricingEvalAt" TIMESTAMP(3);
