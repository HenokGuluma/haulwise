-- Customer email is now optional.
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;

-- Equipment "next maintenance due" is now optional.
ALTER TABLE "equipment" ALTER COLUMN "nextMaintenance" DROP NOT NULL;

-- Drivers can be linked to a default equipment unit. Assigning the driver to
-- a load pulls this equipment onto the load automatically.
ALTER TABLE "drivers" ADD COLUMN "equipmentId" TEXT;
ALTER TABLE "drivers"
  ADD CONSTRAINT "drivers_equipmentId_fkey"
  FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "drivers_equipmentId_idx" ON "drivers"("equipmentId");
