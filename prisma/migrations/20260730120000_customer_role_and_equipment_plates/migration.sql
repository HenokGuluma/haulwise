-- Adds the CUSTOMER role, links a User to a Customer for portal logins, and
-- adds license plate / registration fields to Equipment. All additive and
-- nullable — no existing rows have or need this data.

ALTER TYPE "Role" ADD VALUE 'CUSTOMER';

ALTER TABLE "users" ADD COLUMN "customerId" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_customerId_idx" ON "users"("customerId");

ALTER TABLE "equipment" ADD COLUMN "licensePlate" TEXT;
ALTER TABLE "equipment" ADD COLUMN "registrationExpiration" TIMESTAMP(3);
