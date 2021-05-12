-- Equipment types become an admin-manageable table instead of a fixed enum.
-- Hand-written (not Prisma's auto-diff) to preserve existing data: casts the
-- enum columns to text in place rather than dropping and recreating them.

-- CreateTable
CREATE TABLE "equipment_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'box',
    "tone" TEXT NOT NULL DEFAULT 'van',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_types_code_key" ON "equipment_types"("code");

-- Seed the four types every existing "equipment"/"loads" row already
-- references (via the old EquipmentTypeCode enum), so the FK constraints
-- added below have something to point at before they're enforced.
INSERT INTO "equipment_types" ("id", "code", "label", "icon", "tone", "updatedAt") VALUES
    ('eqtype_van_seed', 'V', 'Dry Van', 'box', 'van', CURRENT_TIMESTAMP),
    ('eqtype_reefer_seed', 'R', 'Reefer', 'snowflake', 'reefer', CURRENT_TIMESTAMP),
    ('eqtype_flatbed_seed', 'F', 'Flatbed', 'layers', 'flatbed', CURRENT_TIMESTAMP),
    ('eqtype_power_seed', 'PO', 'Power Only', 'zap', 'power', CURRENT_TIMESTAMP);

-- AlterTable: cast the enum column to text in place (preserves data) instead
-- of Prisma's default drop-and-recreate, which would fail/erase data here.
ALTER TABLE "equipment" ALTER COLUMN "typeCode" TYPE TEXT USING "typeCode"::TEXT;
ALTER TABLE "loads" ALTER COLUMN "equipmentTypeCode" TYPE TEXT USING "equipmentTypeCode"::TEXT;

-- DropEnum
DROP TYPE "EquipmentTypeCode";

-- CreateIndex
CREATE INDEX "equipment_typeCode_idx" ON "equipment"("typeCode");

-- CreateIndex
CREATE INDEX "loads_equipmentTypeCode_idx" ON "loads"("equipmentTypeCode");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_typeCode_fkey" FOREIGN KEY ("typeCode") REFERENCES "equipment_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_equipmentTypeCode_fkey" FOREIGN KEY ("equipmentTypeCode") REFERENCES "equipment_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
