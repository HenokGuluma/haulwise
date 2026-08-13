-- Give the Dispatcher role the ability to log driver payments (previously
-- Manager/Accountant only). Additive + de-duplicated so a hand-edited role
-- keeps whatever else it already has.
UPDATE "roles"
SET "permissions" = (
  SELECT ARRAY(SELECT DISTINCT unnest("permissions" || ARRAY['payments:manage']::TEXT[]))
)
WHERE "name" = 'Dispatcher';
