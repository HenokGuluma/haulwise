-- Grants the Customer role read access to the new customer-scoped Dashboard
-- (dashboard:view) and minimal read-only Dispatch Board (loads:view).
-- Additive/dedup rather than a blind overwrite, in case the Customer role
-- has already been hand-edited via the Roles screen since it shipped.
UPDATE "roles"
SET "permissions" = (SELECT ARRAY(SELECT DISTINCT unnest("permissions" || ARRAY['dashboard:view','loads:view']::TEXT[])))
WHERE "name" = 'Customer';
