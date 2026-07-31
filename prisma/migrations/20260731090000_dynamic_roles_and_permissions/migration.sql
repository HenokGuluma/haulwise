-- Replaces the hardcoded Role enum with an admin-editable roles table.
-- Hand-written (not Prisma's auto-diff) to preserve existing users: backfills
-- roleId from the old enum column before dropping it.

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCustomerScoped" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- Seed the four default roles. Existing users' roleId (below) is backfilled
-- to point at these literal ids.
INSERT INTO "roles" ("id", "name", "isCustomerScoped", "permissions", "updatedAt") VALUES
    ('role_manager_seed', 'Manager', false, ARRAY[
        'loads:view','loads:create','loads:edit','loads:assign','loads:delete','loads:comment',
        'payments:view','payments:manage',
        'customers:view','customers:create','customers:edit','customers:delete',
        'documents:view','documents:upload','documents:delete',
        'roster:view','roster:manage','roster:delete',
        'equipment-types:manage',
        'dashboard:view','search:use',
        'users:view','users:manage','roles:manage'
    ]::TEXT[], CURRENT_TIMESTAMP),
    ('role_dispatcher_seed', 'Dispatcher', false, ARRAY[
        'loads:view','loads:create','loads:edit','loads:assign','loads:comment',
        'payments:view',
        'customers:view','customers:create','customers:edit',
        'documents:view','documents:upload',
        'roster:view','roster:manage',
        'dashboard:view','search:use'
    ]::TEXT[], CURRENT_TIMESTAMP),
    ('role_accountant_seed', 'Accountant', false, ARRAY[
        'loads:view','loads:comment',
        'payments:view','payments:manage',
        'customers:view',
        'documents:view',
        'dashboard:view','search:use'
    ]::TEXT[], CURRENT_TIMESTAMP),
    ('role_customer_seed', 'Customer', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP);

ALTER TABLE "users" ADD COLUMN "roleId" TEXT;

UPDATE "users" SET "roleId" = CASE "role"
    WHEN 'ADMIN' THEN 'role_manager_seed'
    WHEN 'DISPATCHER' THEN 'role_dispatcher_seed'
    WHEN 'CUSTOMER' THEN 'role_customer_seed'
END;

ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;
CREATE INDEX "users_roleId_idx" ON "users"("roleId");
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "Role";
