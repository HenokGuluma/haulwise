-- Default driver pay percentage changes from 68 to 70. Only affects the
-- column default for future rows written without an explicit value —
-- existing rows keep whatever they already have.

ALTER TABLE "loads" ALTER COLUMN "driverPayValue" SET DEFAULT 70;
