/*
  Warnings:

  - Added the required column `fileSizeBytes` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "documents_loadId_type_key";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "fileSizeBytes" INTEGER NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "uploadedById" TEXT;

-- CreateIndex
CREATE INDEX "documents_loadId_type_idx" ON "documents"("loadId", "type");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
