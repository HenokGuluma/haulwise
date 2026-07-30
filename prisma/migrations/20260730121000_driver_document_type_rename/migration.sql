-- Terminology change only ("CDL" is a US-specific term) — existing
-- driver_documents rows referencing CDL automatically point to the renamed
-- value, no backfill needed.
ALTER TYPE "DriverDocumentType" RENAME VALUE 'CDL' TO 'DRIVERS_LICENSE';
