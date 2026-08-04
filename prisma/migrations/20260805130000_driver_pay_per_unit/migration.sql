-- Driver pay gets a third basis: PER_UNIT (the driver's own per-unit
-- rate on the same quantity the load's rate basis uses). Renames the
-- existing FLAT value to FIXED for clarity — safe now since this whole
-- feature only just shipped and no production load actually uses it yet.

ALTER TYPE "DriverPayType" RENAME VALUE 'FLAT' TO 'FIXED';
ALTER TYPE "DriverPayType" ADD VALUE 'PER_UNIT' AFTER 'PERCENTAGE';
