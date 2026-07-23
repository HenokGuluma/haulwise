-- DropForeignKey
ALTER TABLE "loads" DROP CONSTRAINT "loads_customerId_fkey";

-- AlterTable
ALTER TABLE "loads" ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
