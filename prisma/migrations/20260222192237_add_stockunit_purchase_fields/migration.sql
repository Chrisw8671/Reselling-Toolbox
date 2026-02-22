/*
  Warnings:

  - The values [LISTED] on the enum `StockStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockStatus_new" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'WRITTEN_OFF');
ALTER TABLE "public"."StockUnit" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "StockUnit" ALTER COLUMN "status" TYPE "StockStatus_new" USING ("status"::text::"StockStatus_new");
ALTER TYPE "StockStatus" RENAME TO "StockStatus_old";
ALTER TYPE "StockStatus_new" RENAME TO "StockStatus";
DROP TYPE "public"."StockStatus_old";
ALTER TABLE "StockUnit" ALTER COLUMN "status" SET DEFAULT 'IN_STOCK';
COMMIT;

-- AlterTable
ALTER TABLE "StockUnit" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "purchaseRef" TEXT,
ADD COLUMN     "purchaseUrl" TEXT,
ADD COLUMN     "purchasedFrom" TEXT,
ADD COLUMN     "size" TEXT;
