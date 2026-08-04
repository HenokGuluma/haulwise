-- Configurable driver-pay basis (percentage of rate, or a flat ETB
-- amount) instead of the hardcoded 68%. Defaults match that exact prior
-- behavior so every existing row's historical driverPay stays accurate
-- under its new "68% of rate" label with zero data change needed.

CREATE TYPE "DriverPayType" AS ENUM ('PERCENTAGE', 'FLAT');

ALTER TABLE "loads" ADD COLUMN "driverPayType" "DriverPayType" NOT NULL DEFAULT 'PERCENTAGE';
ALTER TABLE "loads" ADD COLUMN "driverPayValue" INTEGER NOT NULL DEFAULT 68;
