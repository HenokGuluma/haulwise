-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "equipment" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "showMockData" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "customers_isDemo_idx" ON "customers"("isDemo");

-- CreateIndex
CREATE INDEX "drivers_isDemo_idx" ON "drivers"("isDemo");

-- CreateIndex
CREATE INDEX "equipment_isDemo_idx" ON "equipment"("isDemo");

-- CreateIndex
CREATE INDEX "loads_isDemo_idx" ON "loads"("isDemo");
