-- Configurable rate basis for loads (Flat / Per Quintal / Per Kilometer /
-- Per Transit Hour) and the "loads:configure-rate" permission that gates
-- who can change it. Additive/dedup on Manager's permissions, not a blind
-- overwrite, in case that role has already been hand-edited via /roles.

CREATE TYPE "RateType" AS ENUM ('FLAT', 'PER_QUINTAL', 'PER_KM', 'PER_HOUR');

ALTER TABLE "loads" ADD COLUMN "rateType" "RateType" NOT NULL DEFAULT 'FLAT';
ALTER TABLE "loads" ADD COLUMN "rateBasisValue" INTEGER;
ALTER TABLE "loads" ADD COLUMN "distanceKm" INTEGER;

UPDATE "roles"
SET "permissions" = (SELECT ARRAY(SELECT DISTINCT unnest("permissions" || ARRAY['loads:configure-rate']::TEXT[])))
WHERE "name" = 'Manager';
